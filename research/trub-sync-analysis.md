# Trub — Local-First Sync Engine Analysis

*April 2026 — Informing storage + sync architecture decisions*

---

## Context

Trub is a PWA (Svelte + TypeScript) that stores all data locally by default. Cloud sync is optional, user-initiated, and should never be required. The sync feature exists so a user can access their recipes across devices — not for collaboration or multi-user editing. This is a single-writer, multi-device sync problem, which is substantially simpler than real-time collaboration.

---

## Candidates Evaluated

| Engine | Category | Storage Layer | License |
|---|---|---|---|
| **Dexie.js + Dexie Cloud** | IndexedDB wrapper + managed sync | IndexedDB | Apache 2.0 (client) / commercial (cloud) |
| **SQLite WASM + sqlite-sync** | SQLite extension + CRDT sync | SQLite via OPFS/IndexedDB | Elastic License 2.0 (sqlite-sync) |
| **vlcn.io cr-sqlite** | SQLite CRDT extension | SQLite via OPFS | MIT |
| **PowerSync** | Backend DB → SQLite sync layer | SQLite (client), Postgres/Mongo/MySQL (server) | Apache 2.0 (client) / commercial (service) |
| **ElectricSQL + TanStack DB** | Postgres sync → client reactive store | TanStack DB (in-memory + SQLite persistence) | Apache 2.0 |
| **Loro** | CRDT library (document-oriented) | Custom binary format, stored as bytes | MIT |
| **Jazz (CoJSON)** | Full-stack local-first framework | CoJSON (custom CRDT format) | MIT |

---

## Detailed Assessments

### 1. Dexie.js + Dexie Cloud

**What it is:** Dexie.js is the most mature IndexedDB wrapper (29kb gzipped). Dexie Cloud adds sync, auth, and access control on top.

**How sync works:** Dexie Cloud uses server-side conflict resolution with a managed backend (Node.js + PostgreSQL). The client writes to IndexedDB normally; the addon handles background sync, including Service Worker-based background sync (data syncs even after the app is closed). Data is private by default; sharing uses a "realms" model with roles and members. Native Yjs integration available for collaborative editing scenarios.

**Fit for Trub:**
- ✅ Best-in-class DX for IndexedDB — `liveQuery()` works beautifully with Svelte's reactivity model
- ✅ Zero WASM payload — IndexedDB is native
- ✅ Framework-agnostic — works with Svelte, React, Vue, Angular
- ✅ Self-hostable (Node.js + PostgreSQL) or SaaS
- ✅ Background sync via Service Worker — recipes sync even when app is closed
- ✅ Mature, battle-tested, actively maintained
- ⚠️ Not SQL — complex cross-recipe queries need careful index design
- ⚠️ Schema migrations are manual (Dexie helps with versioning, but it's not ALTER TABLE)
- ⚠️ Document-oriented — relational data (recipe → ingredient definitions → equipment profiles) requires denormalization or manual joins
- ❌ Dexie Cloud is commercial (free tier: 3 users, 100MB; production from €0.12/user/month; self-host license is a one-time purchase)

**Pricing:** Free tier (3 users, 100MB). Production SaaS from €0.12/user/month. On-premises one-time license available.

**Verdict:** The safest, most pragmatic choice. The lack of SQL is a real constraint for Trub's relational data model, but manageable if the schema is designed carefully. The sync story is the most complete out of the box.

---

### 2. SQLite WASM + sqlite-sync (SQLite Cloud / SQLite AI)

**What it is:** A CRDT-based SQLite extension from SQLite Cloud (the company, not the SQLite project itself). Turns any SQLite table into a conflict-free replica that syncs with SQLite Cloud nodes, PostgreSQL, or Supabase.

**How sync works:** You load the extension, call `cloudsync_init('table_name')` on each table, and call `cloudsync_network_sync()` to push/pull changes. Uses LWW (Last Writer Wins) at the cell level. Also offers "Block-Level LWW" for merging text fields line-by-line (designed for markdown). The server side runs on SQLite Cloud's managed infrastructure.

**Fit for Trub:**
- ✅ Full SQL — relational queries, joins, aggregations are natural
- ✅ Very simple API — 3 SQL calls to enable sync on a table
- ✅ Syncs to PostgreSQL and Supabase, not just proprietary cloud
- ✅ Active development (commits from April 2026)
- ✅ WASM build available (`sqlite-wasm` package with sync pre-loaded)
- ⚠️ Licensed under Elastic License 2.0 — free for non-production / non-managed-service use; production use requires commercial license from SQLite Cloud
- ⚠️ Relatively new — less battle-tested than Dexie or PowerSync
- ⚠️ Tied to SQLite Cloud's sync infrastructure (or self-host Postgres/Supabase, but the sync routing still goes through their service)
- ⚠️ OPFS browser support needed for persistent SQLite (solid in Chrome/Firefox/Edge; Safari has improved but has quirks)
- ❌ 1–2MB WASM payload on first load
- ❌ Not fully open source for production use

**Pricing:** SQLite Cloud pricing applies for managed sync; self-host requires commercial license for production.

**Verdict:** The most elegant technical fit — full SQL, CRDT sync baked into SQLite. But the Elastic License and dependence on SQLite Cloud's infrastructure create a vendor coupling that sits uncomfortably with Trub's open-source, user-owns-their-data ethos.

---

### 3. vlcn.io cr-sqlite

**What it is:** The original CRDT-for-SQLite project by Matt Wonlaw. A loadable SQLite extension that adds CRDT support to existing tables via a `crsql_changes` virtual table.

**How sync works:** You mark tables as CRRs (Conflict-free Replicated Relations) with `SELECT crsql_as_crr('table')`. The extension tracks changes in a metadata table. Sync is done by querying `crsql_changes` for new operations and inserting them on the remote side. You bring your own networking layer.

**Fit for Trub:**
- ✅ MIT licensed — fully open source
- ✅ Full SQL with CRDT semantics
- ✅ BYO networking — total control over sync transport
- ✅ Conceptually elegant — just SQL + an extension
- ⚠️ **Maintenance concern:** Matt Wonlaw joined Rocicorp to work on Zero (their commercial sync engine). cr-sqlite's last release was v0.15.1 and development appears to have slowed significantly. The project never left "WIP" status on its own README.
- ⚠️ BYO networking also means BYO server, auth, conflict handling at the network level
- ⚠️ WASM browser support exists but is poorly documented
- ❌ No managed sync service — you build the entire server-side yourself
- ❌ Risk of being effectively abandoned as maintainer's attention shifted to Rocicorp

**Pricing:** Free (MIT).

**Verdict:** Was the most promising option 18 months ago. Now a significant maintenance risk. The concept is sound and influenced sqlite-sync, but relying on it for production feels risky without a clear maintainer commitment.

---

### 4. PowerSync

**What it is:** A sync layer that keeps a backend database (Postgres, MongoDB, MySQL, SQL Server) in sync with on-device SQLite databases. Mature product from JourneyApps (10+ years in production with their enterprise platform).

**How sync works:** PowerSync runs as a service that reads your backend DB's change stream (logical replication for Postgres, CDC for others). It streams changes to client SDKs that maintain local SQLite. Writes go to a local upload queue and are pushed to your backend API — you control write-path logic. Declarative "Sync Rules" control which data syncs to which users.

**Fit for Trub:**
- ✅ Local SQLite with full SQL — great for Trub's relational model
- ✅ Most battle-tested of the SQLite sync options (enterprise production for years)
- ✅ Client SDKs for web (JS), React Native, Flutter, Swift, Kotlin
- ✅ Self-hostable (Enterprise edition)
- ✅ You own the write path — full control over how writes hit your backend
- ✅ Open source client SDKs (Apache 2.0)
- ⚠️ **Server-authoritative architecture** — requires a backend database (Postgres etc.) as the source of truth. This inverts Trub's local-first model. The client SQLite is a read-replica, not the primary.
- ⚠️ Requires running a PowerSync service instance between client and backend
- ❌ Not truly local-first — it's "offline-capable with server sync," which is subtly different. Data originates from and is authoritative on the server.
- ❌ Pricing can scale: Pro plan from ~$51/month for 5K DAUs to $399/month for 100K DAUs

**Pricing:** Free tier available. Pro from $49/month. Enterprise self-host with custom pricing.

**Verdict:** PowerSync is excellent for apps that have a backend database and want to sync a subset to clients. But Trub's architecture is the inverse — the client IS the source of truth, and the server (if any) is the backup. PowerSync's model doesn't align well.

---

### 5. ElectricSQL + TanStack DB

**What it is:** Electric syncs data from Postgres to clients using incremental replication. TanStack DB (v0.6, March 2026) is a reactive client-side store with SQLite-backed persistence, optimistic updates, and live queries.

**How sync works:** Electric runs as a service in front of Postgres, syncing "shapes" of data to client collections in TanStack DB. TanStack DB handles local query execution, persistence to SQLite, and reactive UI updates. Writes go through your existing backend API with optimistic local application.

**Fit for Trub:**
- ✅ TanStack DB 0.6 added persistence and offline support — now viable for local-first
- ✅ Extremely fast reactive queries (differential dataflow engine)
- ✅ TypeScript-native, type-safe
- ✅ Incrementally adoptable — can start without sync and add it later
- ⚠️ **Postgres-first architecture** — like PowerSync, assumes a Postgres backend as source of truth
- ⚠️ TanStack DB 0.6 is very new (March 2026) — persistence just shipped
- ⚠️ TanStack is React-focused — Svelte bindings exist but are less mature
- ❌ Same architectural mismatch as PowerSync — server is authoritative, client is a sync'd cache
- ❌ Electric requires Postgres with logical replication enabled

**Pricing:** Electric is open source (Apache 2.0). Postgres hosting costs apply.

**Verdict:** Exciting technology but architecturally misaligned. Electric/TanStack DB assumes "server has the data, client gets a synced view." Trub needs "client has the data, server optionally backs it up." Wrong direction.

---

### 6. Loro

**What it is:** A high-performance CRDT library written in Rust, available via WASM for JS and native for Swift. Supports Map, List, MovableList, MovableTree, and rich Text types. Hit 1.0 with a stable data format.

**How sync works:** You model your app state as a `LoroDoc` with CRDT containers. To sync, you export the doc's changes as bytes (`doc.export({ mode: "update" })`), transmit them by any method, and import on the other side. Loro handles merge automatically. You bring your own transport and server storage.

**Fit for Trub:**
- ✅ MIT licensed, fully open source
- ✅ 1.0 stable — data format is committed
- ✅ Excellent performance (Rust + WASM)
- ✅ Git-like version history built in — natural fit for recipe versioning
- ✅ BYO transport — total flexibility for sync architecture
- ✅ Map and List types map well to recipe data structures
- ⚠️ **Document-oriented, not relational** — no SQL. Recipe data would be modeled as nested CRDT documents, not tables with joins. Cross-recipe queries ("all recipes using Citra hops") require building your own index layer.
- ⚠️ BYO server and transport — you build the sync server
- ⚠️ ~500KB–1MB WASM payload
- ⚠️ Less mature ecosystem than Dexie or SQLite for general app data storage
- ❌ Optimized for collaborative editing scenarios (text, whiteboards) — somewhat over-engineered for single-writer multi-device recipe sync

**Pricing:** Free (MIT).

**Verdict:** Technically impressive and philosophically aligned (local-first, open, BYO transport). But it's solving a harder problem (real-time multi-user collaboration) than Trub needs (single-writer device sync). The lack of SQL means building a custom query layer for what is fundamentally relational data. Overkill.

---

### 7. Jazz (CoJSON)

**What it is:** A batteries-included local-first framework built on CoJSON (Collaborative JSON). Provides data model, sync, auth, permissions, blob storage, and E2EE in one package.

**How sync works:** You define your data model as CoValues (CoMaps, CoLists, CoStreams). Jazz handles sync automatically through "Jazz Global Mesh" (a free managed relay service) or self-hosted mesh nodes. Data is granularly loaded and cached. Built-in auth with passkeys, OAuth, or custom providers.

**Fit for Trub:**
- ✅ MIT licensed
- ✅ Most "batteries included" — auth, permissions, sync, storage all handled
- ✅ Granular loading — only syncs data that's needed
- ✅ E2EE support (optional)
- ✅ Free managed sync via Jazz Global Mesh
- ⚠️ **React-focused** — Svelte bindings are secondary/community-maintained
- ⚠️ Very opinionated — CoJSON data model replaces your database entirely. No SQL, no IndexedDB, no SQLite.
- ⚠️ Young project — less production track record
- ⚠️ Vendor coupling to Jazz Global Mesh (or self-host, but less documented)
- ❌ All-or-nothing architecture — you can't use Jazz for just sync; it wants to own your entire data layer
- ❌ CoJSON standard is "soon-to-be open" but not yet finalized

**Pricing:** Free (Jazz Global Mesh free tier). Self-host available.

**Verdict:** Too opinionated for Trub. Jazz wants to own the entire stack. Trub needs sync as an opt-in layer on top of its own storage, not a framework that dictates the data model.

---

## Comparison Summary

| Criterion | Dexie Cloud | sqlite-sync | cr-sqlite | PowerSync | Electric+TanStack | Loro | Jazz |
|---|---|---|---|---|---|---|---|
| **Client is source of truth** | ✅ | ✅ | ✅ | ❌ Server | ❌ Server | ✅ | ✅ |
| **SQL support** | ❌ IndexedDB | ✅ Full SQL | ✅ Full SQL | ✅ Full SQL | Partial | ❌ | ❌ |
| **Svelte compatibility** | ✅ Native | ✅ (generic JS) | ✅ (generic JS) | ✅ (JS SDK) | ⚠️ React-first | ✅ (generic JS) | ⚠️ React-first |
| **Self-hostable sync** | ✅ Node+PG | ⚠️ Elastic License | ✅ BYO | ✅ Enterprise | ✅ | ✅ BYO | ✅ |
| **Maintenance health** | ✅ Active | ✅ Active | ⚠️ Stalled | ✅ Active | ✅ Active | ✅ Active | ✅ Active |
| **License** | Apache/commercial | Elastic 2.0 | MIT | Apache/commercial | Apache 2.0 | MIT | MIT |
| **WASM payload** | 0 (native) | ~1–2MB | ~1–2MB | ~1MB | Varies | ~500KB–1MB | 0 |
| **Complexity to integrate** | Low | Low | Medium | High | High | Medium | High |
| **Production maturity** | High | Low-Medium | Low | High | Medium | Medium | Low |
| **Sync without internet** | ✅ Queues | ✅ Queues | ✅ Local | ✅ Queues | ✅ Queues | ✅ Local | ✅ Local |

---

## Recommendation

For Trub's specific requirements — local-first PWA, single-writer multi-device sync, relational recipe data, Svelte, open source values — the field narrows to two realistic options:

### Option A: Dexie.js + Dexie Cloud (Recommended)

**Storage:** IndexedDB via Dexie.js
**Sync:** Dexie Cloud (SaaS or self-hosted)
**Why:** Most mature, lowest integration complexity, best PWA story (Service Worker background sync, zero WASM overhead, universal browser support). Dexie's `liveQuery()` is a natural fit for Svelte stores. Self-hostable. The trade-off is no SQL — but Trub's query patterns are predictable (load recipe by ID, list recipes with filters, look up ingredients by name/type), and these map well to IndexedDB indexes.

**The data model question:** Recipe data is relational in theory, but in practice, a recipe is usually loaded and saved as a unit. A hybrid approach works: store recipes as denormalized documents (recipe + embedded ingredients), store shared reference data (ingredient database, equipment profiles, water profiles, style guidelines) as separate indexed tables. Cross-recipe queries use Dexie's compound indexes and `where()` chains.

### Option B: SQLite WASM + build-your-own sync

**Storage:** SQLite via wa-sqlite + OPFS
**Sync:** Custom sync protocol using change-tracking triggers (inspired by cr-sqlite's approach) with a simple server (Node.js or Cloudflare Worker + Postgres/Turso)
**Why:** Full SQL for a genuinely relational data model. Total control over sync protocol. No vendor dependencies. The trade-off is more engineering effort — you're building a sync layer instead of buying one. But for Trub's simple sync case (single writer, multi-device, infrequent conflicts), the sync protocol is straightforward: track row versions, push/pull deltas, LWW for conflicts.

**Risk mitigation:** Don't use cr-sqlite (maintenance risk) or sqlite-sync (Elastic License). Instead, implement a simple version-vector + row-level change tracking in application code. This is ~200-300 lines of SQL triggers + a small sync endpoint. For Trub's scale and write patterns, this is far simpler than a full CRDT engine.

### Option A vs B Decision Framework

Choose **Dexie (A)** if: you want to ship sync faster, you're okay with document-oriented storage, and you value production maturity over query flexibility.

Choose **SQLite (B)** if: the relational data model matters enough to justify the extra engineering, you want zero vendor dependencies for sync, and you're comfortable building a sync layer (even a simple one).

My lean is **Option A (Dexie)** for v1, with the option to migrate to SQLite later if IndexedDB becomes a real constraint. The recipes-as-documents model is natural, the sync story is complete out of the box, and you can ship faster. Water chemistry data (mineral profiles, salt additions) is tabular but small — it fits fine in indexed Dexie tables.

---

*Decision should be made alongside tech stack finalization and v1 feature spec.*

---

## Decision (April 2026)

**Chosen: Dexie.js (client) + DIY sync server (future).**

Dexie Cloud was initially considered but its self-hosted pricing (€3,495+ one-time) is incompatible with Trub's open-source, zero-cost philosophy. The SaaS tier (€0.12/user/month) creates an ongoing cost that Trub would need to absorb or pass on. Neither option fits.

**Instead:**
- **v1:** Dexie.js client only. No sync. All data local. Ship fast.
- **v1.2:** Add a lightweight, self-hostable DIY sync server. The protocol is simple for Trub's single-writer, multi-device use case:
  - Add `updatedAt` and `syncVersion` fields to each Dexie table
  - Small API server (Node.js + SQLite or Postgres, or a Cloudflare Worker + D1)
  - Push: send records changed since last sync timestamp
  - Pull: fetch records changed since last sync timestamp
  - Conflict resolution: Last-Writer-Wins by `updatedAt` (sufficient for single-writer)
  - Auth: simple token-based (user generates a sync token in the app, uses it on other devices)
  - ~300–500 lines of code per side (client sync module + server)
- **MCP:** The MCP server connects to the same sync backend API. Sync must be enabled for MCP to work — acceptable constraint.

The repository pattern in `@trub/core` isolates the sync concern. Svelte components never know about sync. The sync module is a separate layer that reads from and writes to the same Dexie tables, pushing/pulling deltas in the background. This is the same architectural pattern Dexie Cloud uses — we're just building the server piece ourselves.

**FOSS alternatives considered and rejected:**
- **CouchDB/PouchDB:** Would require swapping Dexie for PouchDB. Different API, less ergonomic queries, slower development pace. Sync is great but not worth the DX trade-off.
- **Supabase free tier + custom sync:** Viable but couples to Supabase's infrastructure. Prefer a self-hostable solution with no vendor dependency.
- **Dexie Cloud SaaS free tier (3 users):** Too limited — any real usage exceeds 3 production users immediately.
