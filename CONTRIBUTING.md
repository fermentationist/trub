
# Contributing Guide

Thank you for contributing to this project. This document defines the **standards, expectations, and development philosophy** that all contributors are expected to follow.

The goal of this codebase is **clarity, correctness, maintainability, and long-term viability**. We value explicitness over cleverness, composability over duplication, and honesty over abstraction theater.

Please read this carefully before contributing.

---

## Core Principles

All contributions should align with the following principles:

- **Explicit > implicit**
- **Declarative > imperative**
- **Functional patterns > OOP**, though classes are acceptable where they clearly improve clarity
- **Minimal and functional > decorative or complex**
- **Transparency and frankness > marketing language or unnecessary abstraction**
- **Local-first by default**, aligned with the principles described here:  
  https://www.inkandswitch.com/essay/local-first/#seven-ideals-for-local-first-software

When in doubt, optimize for *long‑term readability and maintainability*.

---

## Language & Tooling

- **TypeScript is required** for all application code
- Always default to the **latest stable versions** of tools and libraries
- Prefer **open standards** when available
- Minimize dependencies; do not introduce libraries without a clear, documented need
- Shared client functionality should be implemented via **reusable hooks**

---

## Formatting & Linting

This project enforces formatting and linting via **Prettier** and **ESLint**.

### Prettier Defaults

- 2-space indentation
- Semicolons required
- Double quotes for strings
- Trailing commas where valid in ES5
- Line endings handled automatically

### ESLint Expectations (Highlights)

- **`var` is forbidden** — no exceptions
- Use `const` by default; `let` only when reassignment is required
- **No loose equality (`==`)** — always use `===`
- Conditionals **must always use blocks** (`{}`)
- Prefer immutability and `prefer-const`
- Avoid unused variables; intentionally unused values must be prefixed with `_`
- `any` should be avoided and will trigger warnings
- Avoid unnecessary boolean casts, unsafe patterns, and escape sequences

If a lint rule conflicts with personal preference, **the rule wins**.

---

## Naming & Project Structure

- **kebab-case is forbidden** unless there is a compelling technical reason
- Use `snake_case` for file names
- Use `SCREAMING_SNAKE_CASE` for constants
- Avoid repeated “magic numbers” and strings  
  - Extract them into named constants under `lib/constants/`
  - Organize constants by domain, API, or functional category

---

## Code Quality Guidelines

- Keep code **DRY, modular, and composable**
- Prefer **parameterized, configurable utilities** over many near-duplicate functions
- Reusable utilities and components are strongly preferred
- Avoid components exceeding **~800 lines** whenever reasonably possible
- Prefer array methods and functional constructs over `for` loops
- Use **long, descriptive variable and function names**  
  (There are no awards for brevity)

---

## Testing Requirements

Testing is non-negotiable.

- **Every feature must include tests**
  - Unit and/or end-to-end tests are required
  - Playwright is the default for E2E unless a better alternative is proposed
- Run relevant tests for affected parts of the repository **before committing**
- Any regression fix **must include a regression test** that proves both the bug and the fix

A change without tests is considered incomplete.

---

## Documentation & Comments

- Keep repository documentation **accurate and current**
- Update documentation whenever changes require it
- Add **concise, high-value comments**:
  - Explain architecture, intent, and non-obvious decisions
  - Do *not* comment obvious code or every variable

Comments should **reduce cognitive load**, not add noise.

---

## Component & UI Philosophy

- Prefer **reusable, configurable components** over multiple bespoke ones
- Favor minimal, functional designs over decorative or over-engineered solutions
- Avoid skeuomorphism, even if it becomes fashionable again

---

## Before You Submit

Before opening a PR, ask yourself:

> “Does this make the codebase easier to understand, test, and evolve six months from now?”

If the answer is unclear or negative, reconsider the approach.

---

## Final Notes

Consistency matters more than personal preference. When contributing code, aim to **leave the codebase better than you found it**, both technically and conceptually.

If something feels ambiguous or underspecified, raise it early and discuss it openly.