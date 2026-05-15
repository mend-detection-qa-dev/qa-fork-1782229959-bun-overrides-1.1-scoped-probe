# bun-overrides-1.1-scoped-probe

Mend SCA detection probe — Pair V2, Probe B.
Pattern: `version-pm-overrides-pre-vs-post-1.1`
Coverage plan entry: #12 (Tier 3, §11.3)

---

## Pair

**Pair ID:** V2
**Pattern:** `version-pm-overrides-pre-vs-post-1.1`
**Purpose:** Verify that Mend's lockfile parser correctly preserves the scoped
override selector form (`"hono > zod"`) introduced/honored in Bun 1.1+, and
does NOT flatten it to a bare package name (`"zod"`) as Bun 1.0.x would.

Both probes in this pair share an identical `package.json`. The only difference
is the Bun version under test and the resulting override scope semantics.

---

## This probe (B)

- **Bun version:** `1.1.30` (exact pin)
- **Lockfile format:** Text JSONC `bun.lock` (Bun 1.1+ text format)
- **Override form:** Scoped — `"hono > zod": "3.22.0"` is honored literally
- **Override applies to:** ONLY the `hono → zod` dependency edge
- **Observable effect on tree:** None — `hono@4.12.18` has zero runtime
  dependencies, so there is no `hono → zod` edge. The override is declared
  but dormant in this dep graph.
- **What Mend must do:**
  1. Parse the `bun.lock` text JSONC file (with inline comments + trailing commas).
  2. Record `"hono > zod": "3.22.0"` verbatim in `project_metadata.overrides`
     with the composite key intact.
  3. NOT fabricate a `zod` entry in the dep tree just because an override
     references it.
  4. Report `hono@4.12.18` as the sole direct dependency with zero transitives.

---

## Sibling probe (A)

- **Probe name:** `bun-overrides-1.0-flat-probe` (entry #11)
- **Bun version:** `1.0.36`
- **Lockfile format:** Binary `bun.lockb` (Bun 1.0 binary format)
- **Override form:** Flat fallback — Bun 1.0.x degrades `"hono > zod"` to
  bare `"zod"`, which would pin ALL `zod` consumers globally (not just the
  `hono → zod` edge).
- **Repository:** https://github.com/mend-detection-qa/bun-overrides-1.0-flat-probe

The two probes share the same `package.json` content. Compare their
`project_metadata.overrides` outputs in Mend scan results:
- Probe #11 (Bun 1.0): override key should appear as `"zod"` (flat)
- Probe #12 (Bun 1.1): override key must appear as `"hono > zod"` (scoped)

If Mend reports the same override key for both probes, it is not
distinguishing Bun version semantics — that is the parser gap this pair exposes.

---

## What this probe targets

**Primary target:** Override scope semantics across the Bun 1.1 version boundary.

Bun 1.0.x silently flattened scoped selectors like `"hono > zod"` to bare
package names (`"zod"`). This was a known limitation of the pre-1.1 resolver.
Bun 1.1+ preserves the scoped form and enforces it strictly — the override
applies ONLY to the named ancestor→child edge.

**Why this matters for Mend:**

Mend's parser reads the `overrides` field from the lockfile workspace section
(in `bun.lock` JSONC) or from `package.json` directly. If the parser:

1. Flattens scoped selectors → it misreports override scope, potentially
   marking more packages as "overridden" than they actually are.
2. Drops the `overrides` block entirely → downstream consumers cannot detect
   that any override was declared; security teams lose visibility into
   version-pinning intent.
3. Fabricates dep entries for packages mentioned only in overrides but not
   actually resolved → ghost dependencies appear in the tree.

**Secondary target:** JSONC format tolerance.

The `bun.lock` file in this probe contains:
- Inline `//` comments throughout
- Trailing commas after the last element in objects and arrays

Mend's parser must handle these or will fail to parse the lockfile entirely,
producing an empty dep tree.

**What the comparator should check:**

| Field | Expected (Probe B, Bun 1.1.30) | Wrong (if flat-override applied) |
|---|---|---|
| `project_metadata.overrides[0]` key | `"hono > zod"` | `"zod"` |
| `packages.zod` presence | absent | `zod@3.22.0` fabricated |
| `packages.hono.version` | `4.12.18` | `4.12.18` |
| `dependency_counts.direct` | `1` | `1` |
| `dependency_counts.transitive` | `0` | `1` (if zod fabricated) |

---

## Mend config

No `.whitesource` file is emitted for this probe.

**Reason:** Bun is NOT in Mend's `install-tool` supported list. The
`scanSettings.versioning` mechanism in `.whitesource` cannot pin a Bun
toolchain version. Emitting a `.whitesource` with a `bun` versioning key
would be silently ignored (or cause an error), and would give a false
impression that Bun version pinning is supported.

Detection is lockfile-driven: Mend reads `bun.lock` (text JSONC) statically,
without invoking `bun install`. The Bun toolchain version is NOT required at
scan time — it is encoded in the lockfile content itself (format version,
override key form, etc.).

This limitation is documented in `docs/BUN_COVERAGE_PLAN.md` under the
"Bun not in install-tool list" risk and in edge-case probe #24
(`bun-not-in-install-tool-probe`).

---

## File inventory

| File | Purpose |
|---|---|
| `package.json` | Identical to sibling probe #11 — shared manifest for pair V2 |
| `bun.lock` | Text JSONC lockfile (Bun 1.1.30); scoped override preserved in workspace section |
| `index.ts` | Minimal TypeScript stub; not executed by Mend |
| `expected-tree.json` | Schema v1.2 expected dep tree with scoped-override assertions |
| `README.md` | This file |

---

## Probe metadata

| Field | Value |
|---|---|
| Pattern | `version-pm-overrides-pre-vs-post-1.1` |
| Pair | V2 |
| Role | B (scoped, Bun 1.1+) |
| `pm_version_under_test` | `1.1.30` |
| `paired_with` | `bun-overrides-1.0-flat-probe` (#11) |
| Direct deps | 1 (`hono@^4.0.0` → resolved `4.12.18`) |
| Transitive deps | 0 |
| Override declared | `"hono > zod": "3.22.0"` (scoped, no edge to apply) |
| `.whitesource` emitted | No — Bun not in install-tool list |
| Target | local |

---

Tracked in: `docs/BUN_COVERAGE_PLAN.md` §11.3 entry #12
