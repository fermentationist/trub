# Trub v1 — Competitive Feature Analysis & UI Pattern Notes

*April 2026 — Planning document for feature scoping*

---

## 1. Competitive Landscape Summary

The homebrewing software market splits into four camps: cloud-first subscription apps (Brewfather, Brewer's Friend, Grainfather), a desktop veteran with hybrid cloud (BeerSmith), open-source local tools (Brewtarget, Brewken), and dead/abandoned projects (ProMash, BeerTools Pro, Brewtoad, iBrewMaster, QBrew). Brewfather dominates the modern web space; BeerSmith dominates the desktop/legacy space.

**Trub's positioning wedge — local-first + transparent/editable formulas — has no direct competitor.**

---

## 2. Competitor Profiles

### Brewfather
- **Platform:** PWA (web + iOS + Android), cloud-first with offline support
- **Pricing:** Free (10 recipes/batches), Premium ~$30/yr (unlimited), Premium Plus (AI assistant, file attachments)
- **Strengths:** Best-in-class modern UI, real-time calculation updates, excellent mobile experience, large device integration ecosystem (Tilt, iSpindel, RAPT, Brewtools, Plaato, etc.), community recipe library, dark mode, recipe versioning, folder organization, AI brewing assistant
- **Weaknesses:** Cloud-required (account mandatory), recipe cap on free tier, formulas are a black box, no formula transparency/customization, vendor lock-in risk

### BeerSmith 4 (released March 2026)
- **Platform:** Desktop (Mac/Win/Linux) + web companion
- **Pricing:** Basic $44.95 one-time (no web), Gold/Platinum/Pro subscriptions from $19.95/yr
- **Strengths:** Most feature-complete overall, 1.8M+ community recipes, deep equipment profiles (1 gal to 30+ bbl), supports beer/mead/wine/cider/seltzer, new SQL backend, local-mode toggle (new in v4), advanced water chemistry & mash pH, yeast starter calculator rewritten to modern standards, "Run Checks" recipe validation, recipe session management, custom fields/columns
- **Weaknesses:** Dated UI despite v4 refresh, steep learning curve, desktop-first (web is secondary), Qt-era visual language, complex pricing tiers, large installed base creates inertia rather than satisfaction

### Brewer's Friend
- **Platform:** Web-based + iOS/Android apps
- **Pricing:** Free trial (5 recipes), Premium ~$25/yr
- **Strengths:** Extensive standalone calculator suite (20+ calculators), advanced water chemistry calculator (Kaiser's mash pH engine), good brew day sheets (printable), active community forum, brew session logging with efficiency tracking, groups/collaboration features
- **Weaknesses:** UI feels dated compared to Brewfather, cloud-only, no offline support, calculator suite is fragmented (separate pages rather than integrated), no local storage option, limited device integrations

### Grainfather Community
- **Platform:** iOS + Android app, cloud-based
- **Pricing:** Free (designed to sell Grainfather hardware)
- **Strengths:** Best brew-day guided experience (step-by-step notifications), tight integration with Grainfather G Series hardware, fermentation device integrations (Tilt, Brewbrain, iSpindel, PLAATO), personalized brewing experience by skill level, mIBU calculation method (Paul-John Hosom's modified Tinseth)
- **Weaknesses:** Heavily tied to Grainfather ecosystem, cloud-only, buggy (App Store reviews cite frequent crashes/reinstalls), not designed for power users, limited export options

### Brewtarget (Open Source)
- **Platform:** Desktop (Linux/Mac/Win), Qt/C++
- **Pricing:** Free (open source, GPL)
- **Strengths:** Fully local, no account needed, accurate calculations (validated close to BeerSmith), BeerXML import/export, supports both Tinseth and Rager IBU models, drag-and-drop ingredient entry, multi-language, large ingredient database
- **Weaknesses:** Severely dated UI (Qt widgets), no mobile story at all, no batch tracking, no inventory management (frequently requested), no water chemistry, no cloud sync, development pace has slowed significantly, no community/sharing features

---

## 3. Feature Comparison Matrix

### 3.1 Recipe Design

| Feature | Brewfather | BeerSmith 4 | Brewer's Friend | Grainfather | Brewtarget |
|---|---|---|---|---|---|
| Recipe types (AG/PM/Extract) | ✅ | ✅ + BIAB, Seltzer | ✅ | ✅ | ✅ |
| Real-time stat updates (OG/FG/IBU/SRM/ABV) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Style guideline overlay/ranges | ✅ (slider shading) | ✅ | ✅ | ✅ | ✅ |
| Recipe scaling | ✅ | ✅ | ✅ (by efficiency + batch size) | ✅ | ✅ |
| Recipe versioning/snapshots | ✅ (Premium) | ✅ (sessions) | ✅ | ❌ | ❌ |
| Beer/mead/wine/cider support | Beer only | ✅ All four + seltzer | Beer + limited mead/cider | Beer only | Beer (cider buggy) |
| Color preview (visual) | ✅ (beer icon + color adjuster) | ✅ | ✅ | ✅ | ❌ |
| Nutritional info (cal/carbs) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Recipe folders/tags | ✅ Both | ❌ / ✅ | ✅ Folders | ❌ | ❌ |
| Recipe validation/checks | ❌ | ✅ ("Run Checks") | ❌ | ❌ | ❌ |

### 3.2 Calculations & Formulas

| Feature | Brewfather | BeerSmith 4 | Brewer's Friend | Grainfather | Brewtarget |
|---|---|---|---|---|---|
| IBU formula choice | Tinseth (default) | Tinseth/Rager/Garetz | Tinseth/Rager | Tinseth/Rager/Garetz/Mosher/Noonan/Daniels + **mIBU** | Tinseth/Rager |
| Hop-stand/whirlpool IBU | ✅ | ✅ | ❌ | ✅ (via mIBU) | ❌ |
| **Formula transparency** | **❌ Black box** | **❌ Black box** | **❌ Black box** | **Partial (help docs)** | **Partial (open source)** |
| **Formula editing/customization** | **❌** | **❌** | **❌** | **❌** | **❌ (requires code changes)** |
| Water chemistry / mineral adjustments | ✅ | ✅ (rewritten in v4) | ✅ (Kaiser's engine) | ✅ | ❌ |
| Mash pH prediction | ✅ | ✅ (v4 improved) | ✅ | ✅ | ❌ |
| Yeast starter calculator | ✅ | ✅ (rewritten in v4) | ✅ | ✅ | ❌ |
| Priming/carbonation calculator | ✅ | ✅ | ✅ | ✅ | ✅ |
| Refractometer correction | ✅ | ✅ | ✅ | ✅ | ❌ |
| ABV calculation | ✅ | ✅ | ✅ | ✅ | ✅ |
| Mash infusion calculator | ✅ | ✅ | ✅ | ✅ | ✅ |
| Dilution/boil-off calculator | ✅ | ✅ | ✅ | ✅ | ❌ |
| Efficiency calculator | ✅ | ✅ | ✅ | ✅ | ✅ |

### 3.3 Brew Day & Batch Tracking

| Feature | Brewfather | BeerSmith 4 | Brewer's Friend | Grainfather | Brewtarget |
|---|---|---|---|---|---|
| Batch tracking/logging | ✅ | ✅ | ✅ (brew sessions) | ✅ | ❌ |
| Brew timer with alarms | ✅ | ✅ | ❌ | ✅ (step-by-step) | ❌ |
| Fermentation chart | ✅ | ✅ | ✅ | ✅ | ❌ |
| Gravity readings log | ✅ | ✅ | ✅ | ✅ | ❌ |
| Tasting notes/ratings | ✅ | ✅ | ✅ | ❌ | ❌ |
| Printable brew day sheet | ✅ (PDF export) | ✅ | ✅ | ❌ | ❌ |
| Guided brew-day mode | ❌ | ❌ | ✅ ("Brew Helper") | ✅ (best-in-class) | ❌ |

### 3.4 Inventory & Shopping

| Feature | Brewfather | BeerSmith 4 | Brewer's Friend | Grainfather | Brewtarget |
|---|---|---|---|---|---|
| Ingredient inventory | ✅ | ✅ (rewritten in v4) | ✅ | ❌ | ❌ |
| Auto-deduct from inventory on brew | ✅ | ✅ | ✅ | ❌ | ❌ |
| Shopping list generation | ✅ | ✅ | ✅ | ❌ | ❌ |
| Cost tracking per recipe | ✅ (Premium) | ✅ | ✅ | ❌ | ❌ |

### 3.5 Data & Interoperability

| Feature | Brewfather | BeerSmith 4 | Brewer's Friend | Grainfather | Brewtarget |
|---|---|---|---|---|---|
| BeerXML import/export | ✅ (Premium) | ✅ | ✅ | ✅ | ✅ |
| JSON import/export | ✅ (own format) | ❌ | ❌ | ❌ | ❌ |
| PDF export | ✅ | ✅ | ✅ | ❌ | ❌ |
| API access | ✅ (v2) | ❌ | ✅ | ❌ | ❌ |
| Device integrations (IoT) | ✅ (10+ devices) | Limited | Limited | ✅ (Grainfather + 4 others) | ❌ |
| Community recipe library | ✅ | ✅ (1.8M recipes) | ✅ | ✅ | ❌ |

### 3.6 Platform & Storage

| Feature | Brewfather | BeerSmith 4 | Brewer's Friend | Grainfather | Brewtarget |
|---|---|---|---|---|---|
| Web app | ✅ (PWA) | ✅ (companion) | ✅ | ❌ | ❌ |
| iOS / Android | ✅ / ✅ | ❌ / ❌ (web only) | ✅ / ✅ | ✅ / ✅ | ❌ / ❌ |
| Desktop native | ❌ | ✅ | ❌ | ❌ | ✅ |
| **Local-first storage** | **❌** | **✅ (new in v4)** | **❌** | **❌** | **✅** |
| Offline support | ✅ (PWA cache) | ✅ | ❌ | Partial | ✅ (fully local) |
| Cloud sync | ✅ | ✅ | ✅ | ✅ | ❌ |
| Dark mode | ✅ | ✅ | ❌ | ✅ | ❌ |

---

## 4. Common UI Patterns Across Competitors

### 4.1 Recipe Designer Layout

Every competitor follows the same basic top-to-bottom flow:

1. **Header bar:** Recipe name, author, brew type selector (All Grain / BIAB / Partial Mash / Extract)
2. **Style selector:** Dropdown or search for BJCP/other style guidelines
3. **Equipment profile:** Dropdown to select or configure brewing system
4. **Stats dashboard:** A horizontal bar or sidebar showing live-updating OG, FG, IBU, SRM, ABV — usually as colored sliders or gauges with the style guideline range shaded behind them
5. **Ingredient sections** (stacked vertically):
   - Fermentables (table: name, amount, %, color contribution)
   - Hops (table: name, amount, alpha acid %, time, use/stage)
   - Yeast (name, attenuation, temperature range)
   - Other/Misc (spices, finings, acids, salts)
6. **Profiles section:** Mash schedule, fermentation schedule, water profile
7. **Notes/description** area

**Key pattern:** The "+" button per section to add ingredients, with a search/autocomplete dropdown that pulls from the ingredient database. Ingredients appear as table rows that can be reordered, edited inline, or deleted.

**Brewfather's innovation:** Style guideline ranges shown as shaded regions on horizontal sliders — you can see at a glance whether your OG/IBU/SRM/ABV falls within the target style. This is the most-copied pattern in the space.

### 4.2 Stats Display

Two dominant patterns:

- **Horizontal slider bars** (Brewfather, Grainfather): Each stat (OG, FG, IBU, SRM, ABV) gets a horizontal bar with the current value as a marker and the style range as a shaded region. Visually dense but very informative.
- **Summary cards/boxes** (BeerSmith, Brewer's Friend): Stats displayed as labeled numbers in a grid or sidebar. Less visual but more compact.

### 4.3 Ingredient Entry

- **Autocomplete search** is universal — you type a few characters and get suggestions from the database
- **Inline editing** — clicking a cell in the ingredient table lets you edit the value directly
- **Drag-and-drop reordering** — Brewfather and Brewtarget support this; others use up/down arrows
- **Percentage display** — most apps show each fermentable's percentage of the total grain bill alongside the weight
- **Color preview** — Brewfather shows a small colored circle/icon next to each fermentable representing its Lovibond contribution

### 4.4 Batch Tracking / Brew Session

The standard flow:

1. "Start Batch" or "Brew This" button on a recipe
2. Pre-brew checklist or overview (Grainfather does this best with step-by-step guided mode)
3. Log gravity readings at various stages (OG, during fermentation, FG)
4. Timer/alarm system for mash steps and boil additions
5. Fermentation chart — typically a line graph of gravity over time, often with temperature overlay
6. Notes per stage
7. Final tasting notes and rating

### 4.5 Water Chemistry

- **Source/target water profile** pattern is universal: you set your local water mineral profile, pick a target style profile, and the calculator tells you what salts to add
- **Mineral display:** Always shows Ca, Mg, Na, SO₄, Cl, HCO₃ as a table or set of input fields
- **Mash pH prediction** is increasingly expected (Brewer's Friend has the most respected engine, based on Kaiser's work)
- **Sulfate-to-chloride ratio** is commonly highlighted as a quick-read indicator

### 4.6 Navigation & Information Architecture

- **Brewfather:** Sidebar navigation (Recipes, Batches, Inventory, Profiles, Settings). Recipe list → click to open designer. Clean, app-like feel.
- **BeerSmith:** Traditional desktop app — menu bar + toolbar + tabbed views. Recipe list as a table with customizable columns. Power-user oriented.
- **Brewer's Friend:** Web dashboard with top nav. Separate pages for each calculator. Recipe builder is its own page. Feels more like a website than an app.
- **Grainfather:** Mobile-first bottom tab bar (Home, Recipes, Brew, Community, More). Card-based layouts.

### 4.7 Color Representation

All apps visualize beer color, but approaches vary:

- **Glass/icon preview** that fills with the estimated SRM color (Brewfather — most polished)
- **Color swatch** next to the SRM number (BeerSmith, Brewer's Friend)
- **No preview** (Brewtarget — just the number)

---

## 5. Calculation Formulas — What Trub Needs

These are the core calculations every competitor implements. Trub's differentiator is making these visible and editable.

### 5.1 Must-Have Formulas for v1

- **OG (Original Gravity):** Points per pound per gallon (PPG) × weight / volume, adjusted for efficiency
- **FG (Final Gravity):** OG adjusted by yeast attenuation percentage
- **ABV:** Multiple methods — simple `(OG - FG) × 131.25`, or the more accurate alternate formula
- **IBU:** Tinseth (default), Rager, and ideally mIBU (Hosom's modification for post-boil contributions). Expose the utilization curve.
- **SRM/EBC Color:** MCU (Malt Color Units) method with Morey's equation for SRM: `SRM = 1.4922 × MCU^0.6859`
- **Mash water volume:** Strike water temp and volume based on grain weight, grain temp, target mash temp, and tun thermal mass
- **Boil-off and pre-boil gravity:** Volume adjustments for evaporation rate
- **Priming sugar:** CO₂ volumes target, temperature, and sugar type
- **Yeast pitch rate:** Cells needed based on OG, volume, and style (ale vs. lager rates)
- **Efficiency:** Brewhouse efficiency from actual vs. theoretical extract

### 5.2 Should-Have for v1 (Water Chemistry)

- **Water mineral adjustments:** Salt additions (gypsum, calcium chloride, Epsom salt, etc.) and their effect on mineral concentrations
- **Mash pH prediction:** Based on grain bill, water profile, and acid/salt additions
- **Sulfate-to-chloride ratio** display

### 5.3 Nice-to-Have for v1

- **Refractometer correction** (Brix to SG with alcohol correction)
- **Hydrometer temperature correction**
- **Dilution calculator**
- **Force carbonation PSI** (for kegging)

---

## 6. Recommended v1 Feature Set for Trub

Based on the competitive analysis, here's a proposed feature set organized by priority.

### 6.1 Core (Must Ship)

- **Recipe designer** with the standard vertical flow (header → style → equipment → ingredients → profiles)
- **Real-time stat calculation** for OG, FG, IBU, SRM, ABV with style guideline ranges
- **Ingredient database** — curated set of fermentables, hops, yeast, and misc ingredients with specs
- **Multiple IBU formulas** — Tinseth, Rager, and mIBU at minimum, with selector
- **🔑 Formula choice & control** — a dedicated Calculations section in settings where users can see which formula is used for each calculation type (IBU, ABV, color, etc.), switch between alternatives (e.g., Tinseth vs. Rager vs. mIBU), and adjust parameters (e.g., hop utilization correction factors, custom attenuation overrides). The math is documented and accessible, but not surfaced in the main recipe UI. The daily-use value is *choice*; the trust signal is *nothing is hidden*.
- **🔑 Open calculation engine** — all formulas are documented in-app and in source. Users who want to understand or verify the math can do so. This is a philosophical commitment, not a UI gimmick.
- **Equipment profiles** — batch size, boil volume, efficiency, losses, mash tun thermal mass
- **Mash schedule builder** — single infusion and multi-step mash support
- **Fermentation schedule** — temperature steps with duration
- **BeerXML import/export** — essential for migration from competitors
- **Recipe scaling** — by batch size, by efficiency, or proportional
- **Local-first storage** — all data on-device, no account required
- **Offline-capable** — works entirely without internet
- **Dark mode** — expected by this audience
- **Responsive design** — usable on desktop and mobile

### 6.2 Important (Ship If Possible)

- **Batch tracking** — start a brew session from a recipe, log OG/FG readings, notes per stage
- **Fermentation chart** — gravity over time visualization
- **Water chemistry calculator** — source/target profiles, salt additions, mash pH prediction
- **Inventory management** — track what you have on hand, auto-deduct on brew
- **Shopping list** — generated from recipe minus inventory
- **Cost tracking** — per-ingredient costs, total recipe cost
- **Brew timer** — countdown timers for mash steps and hop additions with notifications
- **Recipe tagging and search**
- **Printable/PDF brew day sheet**

### 6.3 Deferred (v1.x or v2)

- **Community recipe library** (requires server infrastructure — conflicts with local-first)
- **Device integrations** (Tilt, iSpindel, etc.)
- **AI brewing assistant**
- **Recipe versioning/snapshots**
- **Wine/mead/cider/seltzer support**
- **Cloud sync** (optional, user-controlled — could use something like CRDTs or a self-hosted sync target)
- **Plugin/extension system** for custom formulas
- **Commercial brewing features** (scaling to bbl, multi-batch, TTB reporting)

---

## 7. Trub's Unique Value Propositions to Emphasize in v1

1. **"You're in control of the math, and nothing is hidden."** Every calculation Trub performs is documented and the formula choice is user-configurable in settings. This isn't a flashy UI feature — it's a trust signal and a values statement. The daily-use expression is formula *choice* (switch IBU methods and instantly see the number change). The deeper expression is that all math is open and documented, available when you want to look. Most users never will, but they'll know they *can*.

2. **Formula comparison:** Instead of a single global IBU method, let users switch between formulas per recipe and immediately see the stat change. This is the practical, useful face of transparency — not "here's the polynomial," but "try Rager instead of Tinseth and watch your IBU shift by 8 points."

3. **Local-first with zero friction:** No signup, no account, no cloud. Open the app, start designing. Data lives on your device. Export whenever you want.

4. **Modern UI on local data:** The visual polish of Brewfather with the data ownership of Brewtarget. This gap is real and nobody fills it.

---

## 8. UI Pattern Recommendations for Trub

Based on what works (and what doesn't) across competitors:

- **Adopt Brewfather's slider-with-style-range pattern** for the stats dashboard — it's the most informative at a glance and has become the expected standard.
- **Adopt inline table editing** for ingredients — search/autocomplete to add, click-to-edit cells, drag to reorder.
- **Avoid BeerSmith's toolbar-heavy desktop paradigm** — it creates a steep learning curve and feels dated.
- **Avoid Brewer's Friend's fragmented calculator pages** — integrate calculations directly into the recipe designer flow.
- **Learn from Grainfather's guided brew-day** — step-by-step with notifications is the most loved brew-day experience. Consider this for batch tracking.
- **Keep formula controls in settings, not in the recipe designer.** A "Calculations" page in settings where users can see/change formula choices and read documentation. In the recipe designer itself, formula transparency is expressed subtly — e.g., a small label under the IBU value saying "Tinseth" that links to the settings page. No inline expansions, no per-value popups.
- **Color preview:** Show a filled glass/vessel icon that updates with estimated SRM color. It's expected.
- **Navigation:** Sidebar on desktop (Recipes / Brew Sessions / Inventory / Settings), bottom tabs on mobile. Keep it flat — avoid deep nesting.

---

## 9. Competitor UI Reference Notes (Screenshot Observations)

Screenshots were reviewed in April 2026. Key visual observations by competitor:

### Brewfather (Best-in-Class Reference)
- **Recipe Designer:** Dark background, vertical single-column flow. Recipe name/author/type header at top. Style selector with BJCP search. Equipment profile dropdown. Stats dashboard as horizontal slider bars — each stat (OG, FG, IBU, SRM, ABV) displayed as a colored bar with the style guideline range shown as a lighter shaded region behind the current value marker. Ingredient sections (Fermentables, Hops, Yeast, Other) as collapsible cards with "+" button. Each fermentable row shows: name, amount, %, Lovibond color dot. Hops show: name, amount, AA%, time, use. Bottom shows mash/fermentation/water profiles.
- **Batch View:** Card-based list with beer-colored left border matching estimated SRM. Each card shows recipe name, style, date, status badge. Batch detail has a fermentation chart (line graph, gravity + temperature over time), gravity readings as a timeline, and notes per stage.
- **Water Calculator:** Two-column layout — source profile (left) and target profile (right). Mineral values (Ca, Mg, Na, SO₄, Cl, HCO₃) as editable number fields. Salt additions (gypsum, calcium chloride, Epsom salt, etc.) with amount inputs. Mash pH prediction displayed prominently at top. Sulfate/chloride ratio shown as a labeled ratio.
- **Mobile:** Identical layout adapted for narrow viewports. Bottom tab navigation. Stats sliders stack vertically. Ingredient tables become swipeable cards.
- **Design Signature:** Consistent dark theme, muted grays with a blue-green accent. Rounded cards. Minimal borders. Sans-serif typography throughout.

### BeerSmith 4
- **Recipe Designer:** Traditional desktop application. Menu bar + icon toolbar at top. Tabbed content area (Design, Mash, Water, Brew, Carbonation, etc.). Ingredient lists as spreadsheet-style tables with customizable columns (right-click to add/remove). Stats shown as labeled numbers in a sidebar grid — no visual sliders. Color shown as a small swatch next to the SRM number.
- **Key Differentiator:** "Run Checks" button opens a validation panel with three severity levels (Critical, Warning, Info). Lists issues like "mash tun too small for grain bill" or "brew date missing."
- **Navigation:** Left sidebar tree (Cloud Recipes, Local Recipes, My Equipment, etc.) + toolbar + tabs. Deep hierarchy.
- **Design Signature:** Gray/white chrome, system widgets, dense information layout. Functional but dated. Looks like an engineering tool, not a consumer app.

### Brewer's Friend
- **Recipe Designer:** White background, single-column web form. Ingredient entry via type-ahead search fields. Stats displayed as a horizontal summary bar with numbers (no sliders). Style guidelines shown as min/max ranges in parentheses next to current values. Separate tabs/pages for water chemistry, cost tracking, versions.
- **Calculators:** Each calculator (ABV, IBU, mash infusion, water chemistry, etc.) lives on its own page with its own URL. Standalone tools, not integrated into the recipe flow. The advanced water calculator (Kaiser's engine) is the most detailed in the space — shows predicted mash pH with a visual gauge.
- **Brew Day Sheet:** Printable one-page summary with all recipe details, mash schedule, and checklist. Clean layout.
- **Design Signature:** Light theme, utilitarian web aesthetic. Blue header/accent. Feels like a web 2.0 tool — functional but not inspiring.

### Grainfather Community
- **Recipe Creator:** Mobile-first card-based interface. Large touch targets. Ingredient entry via full-screen search modals. Simplified stats display with large numbers and colored indicators (green = in range, yellow = near edge, red = out of range).
- **Guided Brew Day:** Step-by-step mode with one instruction per screen, countdown timers, and push notifications. "Next Step" button at bottom. The strongest brew-day UX in the space.
- **Navigation:** Bottom tab bar (Home, Recipes, Brew, Community, More). Home screen shows personalized dashboard with recent brews and suggested recipes based on skill level.
- **Design Signature:** White/light gray with Grainfather brand orange as accent. Friendly, approachable, consumer-app feel. Optimized for mobile — desktop web version is an afterthought.

### Brewtarget (Open Source)
- **Recipe Designer:** Qt desktop application with native OS widgets. Dual-panel layout: ingredient tree on the left, recipe detail on the right. Drag-and-drop from ingredient list to recipe. Stats shown as labeled numbers in a header area. No visual color preview — just a number.
- **Navigation:** Tab bar across the top (Recipes, Equipment, Hops, Fermentables, Yeast, etc.). Each tab opens a list/detail view.
- **Design Signature:** Native OS look and feel (differs per platform). No custom styling. Gray system chrome. Looks like a mid-2000s desktop utility. The functional opposite of Brewfather's polish.

### Key Visual Patterns to Adopt for Trub

1. **Stats as visual sliders with style ranges** (Brewfather) — this is now the expected standard
2. **Dark mode as default** (Brewfather) — matches the "developer tool that doesn't look like one" aesthetic from notapipe's design language
3. **Card-based ingredient sections** with inline editing (Brewfather, Grainfather)
4. **Beer color preview** as a filled glass/vessel icon (Brewfather)
5. **Water chemistry as source/target two-column layout** (Brewfather)
6. **Sidebar nav on desktop, bottom tabs on mobile** (Brewfather/Grainfather hybrid)

### Visual Anti-Patterns to Avoid

1. ❌ Toolbar-heavy desktop chrome (BeerSmith)
2. ❌ Fragmented calculator pages (Brewer's Friend)
3. ❌ System-native widgets with no custom styling (Brewtarget)
4. ❌ Spreadsheet-style ingredient tables (BeerSmith)
5. ❌ Light/white default theme (Brewer's Friend, Grainfather) — for Trub's audience and identity, dark is correct

---

*This document is a living reference for Trub v1 planning. Update as feature decisions are finalized.*
