/**
 * Automated Verification Suite for LadderLab PLC Engine & Industrial Missions
 */
const assert = require('assert');
const { PLCEngine } = require('../js/engine/plc.js');
const { FactoryPlant } = require('../js/engine/plant.js');
const { PLC_MISSIONS } = require('../js/missions/missions.js');

console.log('--- RUNNING LADDERLAB PLC ENGINE & SCADA PLANT TESTS ---');

// 1. Verify incomplete initial rungs fail verification (as expected for puzzles)
PLC_MISSIONS.forEach(m => {
  const resInit = m.verify(PLCEngine, m.initialRungs);
  assert.strictEqual(resInit.passed, false, `Mission ${m.number} initialRungs should require user completion`);
  const resSol = m.verify(PLCEngine, m.solutionRungs);
  assert.strictEqual(resSol.passed, true, `Mission ${m.number} solutionRungs must pass all verification checks`);
  console.log(`✓ Mission ${m.number} (${m.title}): Puzzle & Solution verified.`);
});

// 2. Verify Closed-Loop Plant + PLC Interaction on Mission 02 (Stamping Line)
const plc = new PLCEngine();
const plant = new FactoryPlant(plc);
plant.missionId = 'mission_02';
plc.loadRungs(PLC_MISSIONS[1].solutionRungs);
plc.mode = 'RUN';

// Press START momentary pulse
plant.triggerStartButton(true, true);
for (let step = 0; step < 300; step++) {
  plc.executeScan(20);
  plant.update(20);
}
assert.ok(plant.stampedCount >= 1, `Expected at least 1 box stamped in closed-loop M2 simulation, got ${plant.stampedCount}`);
console.log(`✓ Closed-Loop Plant Simulation: Stamped ${plant.stampedCount} boxes, Delivered ${plant.deliveredCount} boxes.`);

console.log('--- ALL LADDERLAB ENGINE TESTS PASSED! ---');
