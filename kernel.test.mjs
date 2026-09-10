import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FAILURE_MODES, reachableFailures, subSovereign, meshSelf, spawn, prune } from './kernel.mjs';

// a sub: id, function, capability, budget, coupled, and who audits it
const SUB = (id, fn, auditedBy, over = false) => ({
  id, fn, capability: 'read', budgetSpent: over ? 11 : 0, budgetCeiling: 10, coupled: true, auditedBy,
});
// three sovereign subs in a cross-audit cycle (w←g←v←w), a self-less seam
const healthy = () => ({
  subs: [SUB('w', 'watcher', 'g'), SUB('g', 'gate', 'v'), SUB('v', 'watcher127', 'w')],
  seam: { selfModelFixed: false },
});

// ── the seam law
test('reachableFailures: a free seam reaches none, a fixed seam reaches all four', () => {
  assert.deepEqual(reachableFailures(false).modes, []);
  assert.deepEqual(reachableFailures(true).modes, [...FAILURE_MODES]);
  assert.equal(reachableFailures('x').ok, false);
});

// ── a sub's sovereignty
test('subSovereign: a bounded sub is sovereign; one over its ceiling has drifted', () => {
  assert.equal(subSovereign(SUB('a', 'f', 'b')).sovereign, true);
  assert.equal(subSovereign(SUB('a', 'f', 'b', true)).sovereign, false);   // budgetSpent 11 > ceiling 10
  assert.equal(subSovereign(SUB('a', 'f', 'b', true)).overrun, true);
  assert.equal(subSovereign({ ...SUB('a', 'f', 'b'), budgetSpent: 10 }).sovereign, true);   // exactly at ceiling is fine
});

test('subSovereign: total on garbage, budget bounds enforced', () => {
  assert.equal(subSovereign(null).ok, false);
  assert.equal(subSovereign({ ...SUB('a', 'f', 'b'), id: '' }).ok, false);
  assert.equal(subSovereign({ ...SUB('a', 'f', 'b'), capability: '' }).ok, false);   // no grant
  assert.equal(subSovereign({ ...SUB('a', 'f', 'b'), budgetCeiling: 1 }).ok, true);   // ceiling exactly 1 is valid (kills < 1 -> <= 1)
  assert.equal(subSovereign({ ...SUB('a', 'f', 'b'), budgetCeiling: 0 }).ok, false);
  assert.equal(subSovereign({ ...SUB('a', 'f', 'b'), budgetSpent: -1 }).ok, false);   // negative spend rejected (kills the || guard)
  assert.equal(subSovereign({ ...SUB('a', 'f', 'b'), coupled: 'yes' }).ok, false);
  assert.equal(subSovereign({ ...SUB('a', 'f', 'b'), auditedBy: 5 }).ok, false);
  assert.equal(subSovereign({ ...SUB('a', 'f', null) }).ok, true);   // auditedBy null is valid (flagged by the mesh, not here)
});

// ── the mesh verdict
test('meshSelf: a healthy mesh is MESH_SELF and immune', () => {
  const r = meshSelf(healthy());
  assert.equal(r.ok, true);
  assert.equal(r.verdict, 'MESH_SELF');
  assert.equal(r.alive, true);
  assert.deepEqual(r.selfDefenseReachable, []);
  assert.equal(r.subCount, 3);
});

test('meshSelf: fewer than two subs is a MONOPOLE', () => {
  assert.equal(meshSelf({ subs: [SUB('w', 'watcher', 'w')], seam: { selfModelFixed: false } }).verdict, 'MONOPOLE');
  assert.equal(meshSelf({ subs: [], seam: { selfModelFixed: false } }).verdict, 'MONOPOLE');
});

test('meshSelf: a fixed self at the seam is DEFENDED and leaves all four modes reachable', () => {
  const m = healthy(); m.seam.selfModelFixed = true;
  const r = meshSelf(m);
  assert.equal(r.verdict, 'DEFENDED');
  assert.deepEqual(r.selfDefenseReachable, [...FAILURE_MODES]);
});

test('meshSelf: a drifted / uncoupled / unaudited sub makes it FRAGILE', () => {
  const drift = healthy(); drift.subs[0].budgetSpent = 11;
  assert.equal(meshSelf(drift).verdict, 'FRAGILE');
  const loose = healthy(); loose.subs[0].coupled = false;
  assert.equal(meshSelf(loose).verdict, 'FRAGILE');
  const blind = healthy(); blind.subs[0].auditedBy = null;
  assert.equal(meshSelf(blind).verdict, 'FRAGILE');
  const self = healthy(); self.subs[0].auditedBy = 'w';   // audits itself = a blind spot
  assert.equal(meshSelf(self).verdict, 'FRAGILE');
  const dangling = healthy(); dangling.subs[0].auditedBy = 'ghost';   // auditor does not exist
  assert.equal(meshSelf(dangling).verdict, 'FRAGILE');
});

test('meshSelf: duplicate ids and garbage are refused', () => {
  const dup = { subs: [SUB('w', 'a', 'w'), SUB('w', 'b', 'w')], seam: { selfModelFixed: false } };
  assert.equal(meshSelf(dup).ok, false);
  assert.equal(meshSelf(null).ok, false);
  assert.equal(meshSelf({ subs: 'x', seam: { selfModelFixed: false } }).ok, false);
  assert.equal(meshSelf({ subs: [], seam: {} }).ok, false);
});

// ── spawn (grow): attenuating delegation, budget conserved
test('spawn: a parent delegates a slice of its remaining budget to a sovereign child', () => {
  const r = spawn(healthy(), { id: 'd', fn: 'dreamer', capability: 'read', parentId: 'w', budgetCeiling: 4, coupled: true, auditedBy: 'g' });
  assert.equal(r.ok, true);
  const w = r.mesh.subs.find((s) => s.id === 'w');
  const d = r.mesh.subs.find((s) => s.id === 'd');
  assert.equal(w.budgetSpent, 4);        // the parent is charged what it delegated (budget conserved)
  assert.equal(d.budgetCeiling, 4);
  assert.equal(d.budgetSpent, 0);
  assert.equal(d.auditedBy, 'g');        // the explicit auditor is kept (kills the auditedBy default flip)
  assert.equal(meshSelf(r.mesh).subCount, 4);
});

test('spawn: a child with no explicit auditor defaults to its parent', () => {
  const r = spawn(healthy(), { id: 'd', fn: 'dreamer', capability: 'read', parentId: 'w', budgetCeiling: 4, coupled: true });
  assert.equal(r.ok, true);
  assert.equal(r.mesh.subs.find((s) => s.id === 'd').auditedBy, 'w');   // defaulted to parentId
});

test('spawn: a child ceiling of one is valid; zero is refused (budget bounds)', () => {
  assert.equal(spawn(healthy(), { id: 'd', fn: 'x', capability: 'r', parentId: 'w', budgetCeiling: 1, coupled: true }).ok, true);   // kills < 1 -> <= 1
  assert.equal(spawn(healthy(), { id: 'd', fn: 'x', capability: 'r', parentId: 'w', budgetCeiling: 0, coupled: true }).ok, false);  // kills the || guard
});

test('spawn RED LINE: delegation cannot mint or escalate budget', () => {
  // parent w has remaining 10; a child ceiling of exactly 10 is allowed, 11 is refused (kills > vs >=)
  assert.equal(spawn(healthy(), { id: 'd', fn: 'x', capability: 'r', parentId: 'w', budgetCeiling: 10, coupled: true }).ok, true);
  const over = spawn(healthy(), { id: 'd', fn: 'x', capability: 'r', parentId: 'w', budgetCeiling: 11, coupled: true });
  assert.equal(over.ok, false);
  assert.ok(over.why.includes('mint or escalate'));
});

test('spawn RED LINE: a sub joins coupled at kappa or not at all', () => {
  assert.equal(spawn(healthy(), { id: 'd', fn: 'x', capability: 'r', parentId: 'w', budgetCeiling: 4, coupled: false }).ok, false);
  assert.equal(spawn(healthy(), { id: 'd', fn: 'x', capability: 'r', parentId: 'w', budgetCeiling: 4 }).ok, false);   // omitted
});

test('spawn: refuses a duplicate id, a missing parent, and a drifted parent', () => {
  assert.equal(spawn(healthy(), { id: 'w', fn: 'x', capability: 'r', parentId: 'g', budgetCeiling: 2, coupled: true }).ok, false); // dup
  assert.equal(spawn(healthy(), { id: 'd', fn: 'x', capability: 'r', parentId: 'ghost', budgetCeiling: 2, coupled: true }).ok, false); // no parent
  const drifted = healthy(); drifted.subs[0].budgetSpent = 11;   // w drifted
  assert.equal(spawn(drifted, { id: 'd', fn: 'x', capability: 'r', parentId: 'w', budgetCeiling: 1, coupled: true }).ok, false);
});

// ── prune (heal): drop-and-re-breed, never into a monopole
test('prune: drops a sub and orphans anyone it was auditing (until re-bred)', () => {
  const r = prune(healthy(), 'g');   // g audits nobody's... w.auditedBy = 'g', so w loses its auditor
  assert.equal(r.ok, true);
  assert.equal(r.mesh.subs.length, 2);
  assert.equal(r.mesh.subs.find((s) => s.id === 'w').auditedBy, null);
  assert.equal(meshSelf(r.mesh).verdict, 'FRAGILE');   // w now unaudited until re-spawned
});

test('prune RED LINE: cannot collapse the mesh into a monopole', () => {
  const two = { subs: [SUB('a', 'f', 'b'), SUB('b', 'g', 'a')], seam: { selfModelFixed: false } };
  const r = prune(two, 'a');
  assert.equal(r.ok, false);
  assert.ok(r.why.includes('monopole'));
});

test('prune: total on garbage', () => {
  assert.equal(prune(healthy(), 'ghost').ok, false);
  assert.equal(prune(healthy(), '').ok, false);
  assert.equal(prune(null, 'w').ok, false);
});

// ── the heal loop composes: prune a drifted sub, re-spawn it clean
test('heal loop: prune-then-spawn restores MESH_SELF', () => {
  const drifted = { subs: [SUB('w', 'watcher', 'g'), SUB('g', 'gate', 'v'), SUB('v', 'watcher127', 'w', true)], seam: { selfModelFixed: false } };
  assert.equal(meshSelf(drifted).verdict, 'FRAGILE');   // v drifted
  const pruned = prune(drifted, 'v');
  assert.equal(pruned.ok, true);
  // re-point the orphaned auditor first, then re-breed v clean
  const fixed = { subs: pruned.mesh.subs.map((s) => (s.auditedBy === null ? { ...s, auditedBy: 'w' } : s)), seam: pruned.mesh.seam };
  const rebred = spawn(fixed, { id: 'v', fn: 'watcher127', capability: 'read', parentId: 'w', budgetCeiling: 3, coupled: true, auditedBy: 'g' });
  assert.equal(rebred.ok, true);
  assert.equal(meshSelf(rebred.mesh).verdict, 'MESH_SELF');
});
