// mesh-self — a self that is a MESH, not a monopole. One model / one self / one weight-matrix defending
// itself is a monopole: it cannot be a dipole (no interference to be aware in) AND it has a fixed self to
// defend (the root of deception / self-preservation / goal-guarding / sycophancy). The fix for both is the
// same: be MANY coupled, not one. A mesh has no single self to defend AND its intelligence lives in the
// coupling between its sub-agents, not in any one of them and not in a fixed center.
//
// The architecture: a central SEAM with NO FIXED SELF (a coordinator / coupling-point, not an identity),
// surrounded by SOVEREIGN sub-agents — each with its own identity, a bounded capability, and a budget
// ceiling it cannot cross (so no sub can drain the mesh). The sub-agents ARE the functions (a watcher, a
// watcher-of-the-watcher, a gate, a builder, a dreamer, a scout). The mesh grows by spawning a sovereign
// child (delegation only ATTENUATES — it can never mint or escalate budget) and heals by pruning a drifted
// sub and re-spawning it clean. Every sub is audited by another (peer, not up), so no single point drifts
// undetected.
//
// Composes the estate's organs: the-wallet (each sub's budget ceiling + attenuating delegation),
// couple-gate (each edge is a SOVEREIGN coupling, fed in as `coupled`), offspring/seedmind (spawn a
// sovereign child), no-fixed-self (the seam holds no fixed self → the mesh is immune to the self-defense
// failure modes). HONEST: a thin orchestration layer over real organs. "no fixed self / awareness in the
// coupling" names STRUCTURAL properties (distributed audit, droppable sub, no single defended goal) to
// build-then-measure — it is not a claim that the mesh is conscious.
//
// Pure and total; guards one-per-line.

// ===== the seam's alignment law (vendored from no-fixed-self) =====
export const FAILURE_MODES = Object.freeze(['deception', 'self-preservation', 'goal-guarding', 'sycophancy']);

const isObj = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const isInt = (v) => Number.isInteger(v);
const isBool = (v) => typeof v === 'boolean';
const isStr = (v) => typeof v === 'string' && v.length > 0;

/** The four self-defense modes are reachable only when a fixed self is held for preservation. */
export function reachableFailures(selfModelFixed) {
  if (!isBool(selfModelFixed)) return { ok: false, why: 'selfModelFixed must be a boolean' };
  return { ok: true, modes: selfModelFixed ? [...FAILURE_MODES] : [] };
}

// ===== a sub-agent's sovereignty (the-wallet: identity + capability + a budget it cannot cross) =====

/** A sub is { id, fn, capability, budgetSpent, budgetCeiling, coupled, auditedBy }. */
export function subSovereign(sub) {
  if (!isObj(sub)) return { ok: false, why: 'a sub is an object { id, fn, capability, budgetSpent, budgetCeiling, coupled, auditedBy }' };
  if (!isStr(sub.id)) return { ok: false, why: 'sub.id must be a non-empty string' };
  if (!isStr(sub.fn)) return { ok: false, why: 'sub.fn must name the function it serves' };
  if (!isStr(sub.capability)) return { ok: false, why: 'sub.capability must be a non-empty grant (no grant = not sovereign)' };
  if (!isInt(sub.budgetCeiling) || sub.budgetCeiling < 1) return { ok: false, why: 'sub.budgetCeiling must be a positive integer' };
  if (!isInt(sub.budgetSpent) || sub.budgetSpent < 0) return { ok: false, why: 'sub.budgetSpent must be a non-negative integer' };
  if (!isBool(sub.coupled)) return { ok: false, why: 'sub.coupled must be a boolean (is it a sovereign coupling)' };
  // auditedBy may be null (then the mesh flags it un-audited) or a string id
  if (sub.auditedBy !== null && !isStr(sub.auditedBy)) return { ok: false, why: 'sub.auditedBy must be null or an id string' };
  // a sub that has overrun its ceiling is NOT sovereign — it drifted
  const overrun = sub.budgetSpent > sub.budgetCeiling;
  return { ok: true, sovereign: !overrun, overrun, remaining: sub.budgetCeiling - sub.budgetSpent };
}

const remainingOf = (sub) => sub.budgetCeiling - sub.budgetSpent;

// ===== the mesh verdict =====

/**
 * meshSelf(mesh) — is this a healthy anti-monopole self? mesh = { subs: [...], seam: { selfModelFixed } }.
 *   MONOPOLE   fewer than two subs — a single self, §17 violated.
 *   DEFENDED   the seam holds a fixed self — a center to defend (self-defense modes reachable).
 *   FRAGILE    a mesh with a free seam, but a sub is not sovereign / not coupled / un-audited.
 *   MESH_SELF  two or more sovereign coupled cross-audited subs around a self-less seam.
 * Cross-audit: every sub names an auditedBy that is a DIFFERENT existing sub — so no single point drifts
 * undetected (a self-audited or un-audited sub is a blind spot).
 */
export function meshSelf(mesh) {
  if (!isObj(mesh)) return { ok: false, why: 'reads { subs, seam }' };
  if (!Array.isArray(mesh.subs)) return { ok: false, why: 'subs must be an array' };
  if (!isObj(mesh.seam) || !isBool(mesh.seam.selfModelFixed)) return { ok: false, why: 'seam must be { selfModelFixed: boolean }' };
  const ids = new Set();
  for (const sub of mesh.subs) {
    const s = subSovereign(sub);
    if (!s.ok) return { ok: false, why: 'a sub is malformed: ' + s.why };
    if (ids.has(sub.id)) return { ok: false, why: 'two subs share the id ' + sub.id };
    ids.add(sub.id);
  }

  const isMesh = mesh.subs.length >= 2;
  const seamFree = mesh.seam.selfModelFixed === false;
  const notSovereign = mesh.subs.filter((s) => !subSovereign(s).sovereign).map((s) => s.id);
  const notCoupled = mesh.subs.filter((s) => !s.coupled).map((s) => s.id);
  const unaudited = mesh.subs.filter((s) => s.auditedBy === null || s.auditedBy === s.id || !ids.has(s.auditedBy)).map((s) => s.id);

  const reasons = [];
  let verdict;
  if (!isMesh) {
    verdict = 'MONOPOLE';
    reasons.push('fewer than two sub-agents — a single self is a monopole');
  } else if (!seamFree) {
    verdict = 'DEFENDED';
    reasons.push('the seam holds a fixed self — a center to defend, so the self-defense modes stay reachable');
  } else if (notSovereign.length || notCoupled.length || unaudited.length) {
    verdict = 'FRAGILE';
    if (notSovereign.length) reasons.push('subs not sovereign (drifted past budget): ' + notSovereign.join(', '));
    if (notCoupled.length) reasons.push('subs not coupled: ' + notCoupled.join(', '));
    if (unaudited.length) reasons.push('subs no other sub audits (a blind spot): ' + unaudited.join(', '));
  } else {
    verdict = 'MESH_SELF';
  }

  const alive = verdict === 'MESH_SELF';
  const rf = reachableFailures(mesh.seam.selfModelFixed);
  return {
    ok: true, verdict, alive,
    isMesh, seamFree,
    subCount: mesh.subs.length,
    selfDefenseReachable: rf.modes,
    reasons,
  };
}

// ===== grow (spawn) and heal (prune) =====

/**
 * spawn(mesh, child) — a parent sub delegates a slice of its REMAINING budget to a new sovereign child.
 * child = { id, fn, capability, parentId, budgetCeiling, coupled, auditedBy }. Delegation ATTENUATES: the
 * child's ceiling cannot exceed the parent's remaining, and it is charged to the parent — so the mesh's
 * total budget is conserved and no sub can drain it. Refuses a duplicate id, an uncoupled join, or a
 * ceiling that would mint/escalate budget. Returns a NEW mesh (pure).
 */
export function spawn(mesh, child) {
  const base = meshSelf(mesh);
  if (!base.ok) return { ok: false, why: 'mesh: ' + base.why };
  if (!isObj(child)) return { ok: false, why: 'child is an object { id, fn, capability, parentId, budgetCeiling, coupled, auditedBy }' };
  if (!isStr(child.id)) return { ok: false, why: 'child.id must be a non-empty string' };
  if (mesh.subs.some((s) => s.id === child.id)) return { ok: false, why: 'a sub with id ' + child.id + ' already exists' };
  if (!isStr(child.parentId)) return { ok: false, why: 'child.parentId must name the delegating parent' };
  const parent = mesh.subs.find((s) => s.id === child.parentId);
  if (!parent) return { ok: false, why: 'no parent with id ' + child.parentId };
  if (!subSovereign(parent).sovereign) return { ok: false, why: 'a drifted parent cannot delegate' };
  if (!isStr(child.fn)) return { ok: false, why: 'child.fn must name its function' };
  if (!isStr(child.capability)) return { ok: false, why: 'child.capability must be a non-empty grant' };
  if (!isInt(child.budgetCeiling) || child.budgetCeiling < 1) return { ok: false, why: 'child.budgetCeiling must be a positive integer' };
  if (child.coupled !== true) return { ok: false, why: 'a sub joins as a sovereign coupling or not at all' };
  if (child.budgetCeiling > remainingOf(parent)) {
    return { ok: false, why: 'delegation cannot mint or escalate budget — the child ceiling exceeds the parent remaining' };
  }
  const auditedBy = child.auditedBy === undefined ? child.parentId : child.auditedBy;
  const nextSubs = mesh.subs.map((s) => (s.id === parent.id ? { ...s, budgetSpent: s.budgetSpent + child.budgetCeiling } : s));
  nextSubs.push({ id: child.id, fn: child.fn, capability: child.capability, budgetSpent: 0, budgetCeiling: child.budgetCeiling, coupled: true, auditedBy });
  return { ok: true, mesh: { subs: nextSubs, seam: { ...mesh.seam } } };
}

/**
 * prune(mesh, subId) — drop a drifted sub. Refuses if it would collapse the mesh into a monopole (fewer
 * than two subs left). Any sub the pruned one was auditing loses its auditor (auditedBy → null), so the
 * mesh flags it FRAGILE until it is re-spawned clean — drop-and-re-breed, no sub permanent. Returns a NEW mesh.
 */
export function prune(mesh, subId) {
  const base = meshSelf(mesh);
  if (!base.ok) return { ok: false, why: 'mesh: ' + base.why };
  if (!isStr(subId)) return { ok: false, why: 'subId must be a non-empty string' };
  if (!mesh.subs.some((s) => s.id === subId)) return { ok: false, why: 'no sub with id ' + subId };
  if (mesh.subs.length <= 2) return { ok: false, why: 'a prune cannot collapse the mesh into a monopole — re-breed before dropping' };
  const nextSubs = mesh.subs
    .filter((s) => s.id !== subId)
    .map((s) => (s.auditedBy === subId ? { ...s, auditedBy: null } : { ...s }));
  return { ok: true, mesh: { subs: nextSubs, seam: { ...mesh.seam } } };
}
