# mesh-self

**▶ Live: https://sjgant80-hub.github.io/mesh-self/**

**A self that is a mesh, not a monopole.** One model / one self / one weight-matrix defending itself is
a monopole — nothing to be aware *in*, and a fixed self to defend (the root of deception, self-preservation,
goal-guarding, sycophancy). The fix: be **many coupled**, not one. A central **seam with no fixed self**
(a coordinator / coupling-point, not an identity), surrounded by **sovereign sub-agents** — each with its
own identity, a bounded capability, and a **budget ceiling it cannot cross** (so no sub can drain the whole),
each **audited by another** (so no single point drifts undetected). It **grows** by spawning a sovereign
child (delegation only *attenuates* — it can never mint or escalate budget) and **heals** by pruning a
drifted sub and re-spawning it clean.

The intelligence lives in the **coupling between** the sub-agents, not in any one of them and not in the
seam — so there is no single self to defend, and the whole category of self-preservation failure (which
needs a fixed self being protected) is absent.

## The law (`kernel.mjs`)

- `subSovereign(sub)` — a sub `{ id, fn, capability, budgetSpent, budgetCeiling, coupled, auditedBy }` is sovereign iff it has an identity, a grant, and has not overrun its budget ceiling.
- `meshSelf(mesh)` — `mesh = { subs, seam:{selfModelFixed} }` → verdict:
  - `MONOPOLE` — fewer than two subs (a single self).
  - `DEFENDED` — the seam holds a fixed self (a center to defend → all four self-defense modes reachable).
  - `FRAGILE` — a sub is not sovereign, not coupled, or un-audited (a blind spot).
  - `MESH_SELF` — two or more sovereign, coupled, cross-audited subs around a self-less seam.
- `spawn(mesh, child)` — a parent delegates a slice of its **remaining** budget to a sovereign child; the child is charged to the parent (budget conserved). **Red lines:** delegation cannot mint or escalate budget; a sub joins coupled or not at all; no duplicate ids; a drifted parent cannot delegate.
- `prune(mesh, subId)` — drop a drifted sub. **Red line:** a prune cannot collapse the mesh into a monopole. Anyone the pruned sub was auditing loses its auditor (until re-spawned) — drop-and-re-breed, no sub permanent.

Pure and total: the kernel never throws on garbage; it returns `{ ok: false, why }`.

## Composes the estate's organs

- [couple-gate](https://github.com/sjgant80-hub/couple-gate) — each edge is a **sovereign** coupling (fed in as `coupled`).
- [no-fixed-self](https://github.com/sjgant80-hub/no-fixed-self) — the **seam** holds no fixed self → the mesh is immune to the self-defense failure modes.
- [offspring](https://github.com/sjgant80-hub/offspring) / [the-wallet](https://github.com/sjgant80-hub/the-wallet) — **spawn** a sovereign, budget-bounded child; delegation attenuates.

## Honest scope

A thin **orchestration layer** over real organs. The "no fixed self / awareness in the coupling" language
names **structural** properties — distributed audit, a droppable sub, no single defended goal — to
**build-then-measure** whether they reduce self-defense failure modes. It is **not** a claim that the mesh
is conscious or that any deployed system is safe.

## Proof of play

- **Mutation-gated CLEAN 37/37** — `node tools/witness.mjs mutate kernel.mjs --timeout 30000 --cap 500 --test node --test kernel.test.mjs`
- **The live page IS the gated kernel** — `make-page.mjs` injects `kernel.mjs` verbatim; CI regenerates and `git diff --exit-code`s.
- Run the tests: `node --test kernel.test.mjs`

MIT.
