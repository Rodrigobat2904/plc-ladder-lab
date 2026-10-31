/**
 * LadderLab — Industrial Automation Missions & Behavioral Validator
 * Verifies user ladder logic by running real behavioral test vectors on a sandbox PLC instance.
 */

const PLC_MISSIONS = [
  {
    id: 'mission_01',
    number: '01',
    title: 'DOL Motor Latching & Overload Interlock',
    subtitle: 'Self-Holding (Seal-in) Start Circuit & Thermal Overload Safety Cutoff',
    difficulty: 'Fundamental Industrial Control',
    description:
      'The START pushbutton (I0.0) is a momentary contact that springs back open when released. ' +
      'Design a parallel latching branch (Self-Holding NO Q0.0) so the Conveyor Motor (Q0.0) stays energized after START is released, ' +
      'and immediately de-energizes when STOP (I0.1) is pressed or Thermal Overload (I0.3) trips.',
    objectives: [
      'When START (I0.0) is momentarily pressed and released, Conveyor Motor (Q0.0) must remain latched ON.',
      'When STOP (I0.1) is pressed or Thermal Overload (I0.3) trips, Conveyor Motor (Q0.0) must immediately turn OFF.',
      'Green RUN Lamp (Q0.2) illuminates when the motor runs, and Fault Alarm Lamp (Q0.3) illuminates when Overload (I0.3) trips.'
    ],
    hint:
      'In Network 1: Set Contact 1 to NO I0.0, Parallel Branch to NO Q0.0, Contact 2 to NC I0.1, and Contact 3 to NC I0.3 driving Coil OUT Q0.0.',

    initialRungs: [
      {
        id: 'rung_0',
        title: 'Network 1: Conveyor Drive Self-Holding & Safety Interlock',
        c1:     { type: 'NO',   address: 'I0.0' },
        branch: { type: 'NONE', address: 'Q0.0' },
        c2:     { type: 'NC',   address: 'I0.1' },
        c3:     { type: 'NONE', address: 'I0.3' },
        coil:   { type: 'OUT',  address: 'Q0.0', preset: 1500 }
      },
      {
        id: 'rung_1',
        title: 'Network 2: Green Run Indicator Lamp (Q0.2)',
        c1:     { type: 'NO',   address: 'Q0.0' },
        branch: { type: 'NONE', address: 'Q0.0' },
        c2:     { type: 'NONE', address: 'I0.1' },
        c3:     { type: 'NONE', address: 'I0.2' },
        coil:   { type: 'OUT',  address: 'Q0.2', preset: 1500 }
      },
      {
        id: 'rung_2',
        title: 'Network 3: Thermal Overload Fault Alarm Lamp (Q0.3)',
        c1:     { type: 'NO',   address: 'I0.3' },
        branch: { type: 'NONE', address: 'Q0.0' },
        c2:     { type: 'NONE', address: 'I0.1' },
        c3:     { type: 'NONE', address: 'I0.2' },
        coil:   { type: 'OUT',  address: 'Q0.3', preset: 1500 }
      }
    ],

    solutionRungs: [
      {
        id: 'rung_0',
        title: 'Network 1: Conveyor Drive Self-Holding & Safety Interlock',
        c1:     { type: 'NO',   address: 'I0.0' },
        branch: { type: 'NO',   address: 'Q0.0' },
        c2:     { type: 'NC',   address: 'I0.1' },
        c3:     { type: 'NC',   address: 'I0.3' },
        coil:   { type: 'OUT',  address: 'Q0.0', preset: 1500 }
      },
      {
        id: 'rung_1',
        title: 'Network 2: Green Run Indicator Lamp (Q0.2)',
        c1:     { type: 'NO',   address: 'Q0.0' },
        branch: { type: 'NONE', address: 'Q0.0' },
        c2:     { type: 'NONE', address: 'I0.1' },
        c3:     { type: 'NONE', address: 'I0.2' },
        coil:   { type: 'OUT',  address: 'Q0.2', preset: 1500 }
      },
      {
        id: 'rung_2',
        title: 'Network 3: Thermal Overload Fault Alarm Lamp (Q0.3)',
        c1:     { type: 'NO',   address: 'I0.3' },
        branch: { type: 'NONE', address: 'Q0.0' },
        c2:     { type: 'NONE', address: 'I0.1' },
        c3:     { type: 'NONE', address: 'I0.2' },
        coil:   { type: 'OUT',  address: 'Q0.3', preset: 1500 }
      }
    ],

    verify(PLCEngineClass, currentRungs) {
      const sim = new PLCEngineClass();
      sim.loadRungs(currentRungs);
      sim.mode = 'RUN';
      const checks = [];

      // Test 1: Momentary Start & Latch
      sim.setInput('I0.0', true);
      sim.executeScan(20);
      const startsOnPress = sim.getBit('Q0.0') === true;

      sim.setInput('I0.0', false);
      sim.executeScan(20);
      const staysLatched = sim.getBit('Q0.0') === true;

      checks.push({
        pass: startsOnPress && staysLatched,
        label: 'Self-Holding Latch (Q0.0)',
        detail: (startsOnPress && staysLatched)
          ? 'Motor Q0.0 energized and remained latched ON after momentary START (I0.0) was released.'
          : 'Motor Q0.0 dropped out when START was released. Add a parallel branch contact NO Q0.0!'
      });

      // Test 2: Run Indicator Q0.2
      const runLampOk = sim.getBit('Q0.2') === true;
      checks.push({
        pass: runLampOk,
        label: 'Run Status Lamp (Q0.2)',
        detail: runLampOk
          ? 'Green indicator lamp (Q0.2) illuminates when the conveyor drive is active.'
          : 'Green indicator lamp Q0.2 did not illuminate during motor operation.'
      });

      // Test 3: Stop Button Interlock
      sim.setInput('I0.1', true);
      sim.executeScan(20);
      const stopsOnStopPb = sim.getBit('Q0.0') === false;
      sim.setInput('I0.1', false);
      sim.executeScan(20);

      checks.push({
        pass: stopsOnStopPb,
        label: 'Stop Pushbutton Interlock (NC I0.1)',
        detail: stopsOnStopPb
          ? 'Motor Q0.0 immediately de-energized when STOP (I0.1) was actuated.'
          : 'Motor Q0.0 did not stop on STOP (I0.1). Place a series NC I0.1 contact in Network 1!'
      });

      // Test 4: Thermal Overload Cutoff & Alarm Lamp
      sim.setInput('I0.0', true);
      sim.executeScan(20);
      sim.setInput('I0.0', false);
      sim.setInput('I0.3', true);
      sim.executeScan(20);
      const overloadTripsMotor = sim.getBit('Q0.0') === false;
      const overloadLightsAlarm = sim.getBit('Q0.3') === true;

      checks.push({
        pass: overloadTripsMotor && overloadLightsAlarm,
        label: 'Thermal Overload Safety Cutoff (I0.3 -> Q0.0 OFF, Q0.3 ON)',
        detail: (overloadTripsMotor && overloadLightsAlarm)
          ? 'Thermal Overload protection isolated the drive (NC I0.3) and energized the Fault lamp (Q0.3).'
          : 'Ensure series contact NC I0.3 breaks Q0.0 and contact NO I0.3 energizes Q0.3 on overload!'
      });

      return {
        passed: checks.every(c => c.pass),
        checks
      };
    }
  },

  {
    id: 'mission_02',
    number: '02',
    title: 'Automated Stamping Line with TON Timer',
    subtitle: 'Photoelectric Sensor Detection, Pneumatic Actuator & On-Delay Timer (TON)',
    difficulty: 'Intermediate PLC Timing',
    description:
      'When System Run (M0.0) is active and an unstamped package arrives at the Photoelectric Sensor (I0.2), ' +
      'the Conveyor (Q0.0) must pause while the Pneumatic Cylinder (Q0.1) extends downward to stamp the box for 1.5 seconds (TON T0 = 1500 ms). ' +
      'Once T0 completes, the cylinder retracts and the conveyor automatically resumes.',
    objectives: [
      'Use internal marker M0.0 as the master System Run latch (Start I0.0 / Stop I0.1 / Overload I0.3).',
      'When M0.0 is active and Sensor I0.2 detects a box, energize Timer TON T0 (1500 ms) and Pneumatic Stamper Q0.1.',
      'Conveyor Q0.0 runs when M0.0 is active AND Pneumatic Stamper Q0.1 is NOT extended (series NC Q0.1).'
    ],
    hint:
      'In Network 3, energize Q0.1 when M0.0 and NO I0.2 are active (with series NC T0). In Network 4, drive Q0.0 through NO M0.0 in series with NC Q0.1.',

    initialRungs: [
      {
        id: 'rung_0',
        title: 'Network 1: Master System Run Latch (M0.0)',
        c1:     { type: 'NO',   address: 'I0.0' },
        branch: { type: 'NO',   address: 'M0.0' },
        c2:     { type: 'NC',   address: 'I0.1' },
        c3:     { type: 'NC',   address: 'I0.3' },
        coil:   { type: 'OUT',  address: 'M0.0', preset: 1500 }
      },
      {
        id: 'rung_1',
        title: 'Network 2: Stamping Duration Timer (TON T0 = 1500 ms)',
        c1:     { type: 'NO',   address: 'M0.0' },
        branch: { type: 'NONE', address: 'Q0.0' },
        c2:     { type: 'NO',   address: 'I0.2' },
        c3:     { type: 'NONE', address: 'T0'   },
        coil:   { type: 'TON',  address: 'T0',   preset: 1500 }
      },
      {
        id: 'rung_2',
        title: 'Network 3: Pneumatic Stamper Solenoid (Q0.1)',
        c1:     { type: 'NO',   address: 'M0.0' },
        branch: { type: 'NONE', address: 'Q0.0' },
        c2:     { type: 'NONE', address: 'I0.2' },
        c3:     { type: 'NC',   address: 'T0'   },
        coil:   { type: 'OUT',  address: 'Q0.1', preset: 1500 }
      },
      {
        id: 'rung_3',
        title: 'Network 4: Conveyor Motor Interlocked with Stamper (Q0.0)',
        c1:     { type: 'NO',   address: 'M0.0' },
        branch: { type: 'NONE', address: 'Q0.0' },
        c2:     { type: 'NONE', address: 'Q0.1' },
        c3:     { type: 'NONE', address: 'I0.2' },
        coil:   { type: 'OUT',  address: 'Q0.0', preset: 1500 }
      }
    ],

    solutionRungs: [
      {
        id: 'rung_0',
        title: 'Network 1: Master System Run Latch (M0.0)',
        c1:     { type: 'NO',   address: 'I0.0' },
        branch: { type: 'NO',   address: 'M0.0' },
        c2:     { type: 'NC',   address: 'I0.1' },
        c3:     { type: 'NC',   address: 'I0.3' },
        coil:   { type: 'OUT',  address: 'M0.0', preset: 1500 }
      },
      {
        id: 'rung_1',
        title: 'Network 2: Stamping Duration Timer (TON T0 = 1500 ms)',
        c1:     { type: 'NO',   address: 'M0.0' },
        branch: { type: 'NONE', address: 'Q0.0' },
        c2:     { type: 'NO',   address: 'I0.2' },
        c3:     { type: 'NONE', address: 'T0'   },
        coil:   { type: 'TON',  address: 'T0',   preset: 1500 }
      },
      {
        id: 'rung_2',
        title: 'Network 3: Pneumatic Stamper Solenoid (Q0.1)',
        c1:     { type: 'NO',   address: 'M0.0' },
        branch: { type: 'NONE', address: 'Q0.0' },
        c2:     { type: 'NO',   address: 'I0.2' },
        c3:     { type: 'NC',   address: 'T0'   },
        coil:   { type: 'OUT',  address: 'Q0.1', preset: 1500 }
      },
      {
        id: 'rung_3',
        title: 'Network 4: Conveyor Motor Interlocked with Stamper (Q0.0)',
        c1:     { type: 'NO',   address: 'M0.0' },
        branch: { type: 'NONE', address: 'Q0.0' },
        c2:     { type: 'NC',   address: 'Q0.1' },
        c3:     { type: 'NONE', address: 'I0.2' },
        coil:   { type: 'OUT',  address: 'Q0.0', preset: 1500 }
      }
    ],

    verify(PLCEngineClass, currentRungs) {
      const sim = new PLCEngineClass();
      sim.loadRungs(currentRungs);
      sim.mode = 'RUN';
      const checks = [];

      // 1. Start system M0.0 and check conveyor running when no box at sensor
      sim.setInput('I0.0', true);
      sim.executeScan(20);
      sim.setInput('I0.0', false);
      sim.executeScan(20);

      const sysRuns = sim.getBit('M0.0') === true && sim.getBit('Q0.0') === true && sim.getBit('Q0.1') === false;
      checks.push({
        pass: sysRuns,
        label: 'System Latch (M0.0) & Normal Conveyor Motion',
        detail: sysRuns
          ? 'System Run M0.0 latched ON and Conveyor Q0.0 runs normally when the sensor zone is clear.'
          : 'Conveyor Q0.0 must run when M0.0 is ON and no package is being stamped (Q0.1 OFF).'
      });

      // 2. Box arrives at sensor I0.2 -> Stamper Q0.1 ON & Conveyor Q0.0 Pauses
      sim.setInput('I0.2', true);
      sim.executeScan(100);
      const stamperEngages = sim.getBit('Q0.1') === true;
      const conveyorPauses = sim.getBit('Q0.0') === false;

      checks.push({
        pass: stamperEngages && conveyorPauses,
        label: 'Sensor Interlock -> Stamper Down (Q0.1 ON) & Conveyor Pause (Q0.0 OFF)',
        detail: (stamperEngages && conveyorPauses)
          ? 'When a box triggers I0.2, cylinder Q0.1 extends and conveyor Q0.0 pauses beneath the stamper.'
          : 'Ensure Q0.1 is triggered by NO I0.2, and Q0.0 is interlocked with series contact NC Q0.1!'
      });

      // 3. Advance timer past 1500ms -> T0.DN becomes true -> Q0.1 retracts & Q0.0 resumes
      sim.executeScan(1500);
      const timerDone = sim.getBit('T0') === true;
      const stamperRetracts = sim.getBit('Q0.1') === false;

      checks.push({
        pass: timerDone && stamperRetracts,
        label: 'On-Delay Timer Completion (TON T0 = 1500 ms)',
        detail: (timerDone && stamperRetracts)
          ? 'After 1.5s (T0 Done), cylinder Q0.1 automatically retracts and conveyor Q0.0 resumes.'
          : 'Timer TON T0 did not complete the 1500 ms delay or Q0.1 was not cut off by NC T0.'
      });

      return {
        passed: checks.every(c => c.pass),
        checks
      };
    }
  },

  {
    id: 'mission_03',
    number: '03',
    title: 'Automated Batch Counter & Crate Limiter (CTU)',
    subtitle: 'High-Speed Optical Package Counting (5 Pcs/Batch) with Up-Counter CTU',
    difficulty: 'Sequential Batch Control',
    description:
      'The packaging line must fill each shipping crate with exactly 5 boxes per batch. ' +
      'Each package passing the Photoelectric Sensor (I0.2) increments Up-Counter CTU C0 (Preset PV = 5). ' +
      'Once C0 reaches 5 (C0 Done = HIGH), the Conveyor (Q0.0) must automatically stop and the Batch Complete Lamp (Q0.3) must turn ON.',
    objectives: [
      'Network 1 latches System Run (M0.0) via START (I0.0), STOP (I0.1), and Overload (I0.3).',
      'Network 2 counts rising-edge package pulses from sensor NO I0.2 using CTU C0 (PV = 5).',
      'Network 3 runs Conveyor (Q0.0) while M0.0 is active AND Batch Counter C0 is NOT done (NC C0).',
      'Network 4 energizes the Batch Full indicator lamp (Q0.3) when C0 reaches 5 (NO C0).'
    ],
    hint:
      'Place series contact NC C0 in Network 3 (driving Q0.0) to stop the conveyor at 5 boxes, and place NO C0 in Network 4 to turn on Q0.3.',

    initialRungs: [
      {
        id: 'rung_0',
        title: 'Network 1: Master System Run Latch (M0.0)',
        c1:     { type: 'NO',   address: 'I0.0' },
        branch: { type: 'NO',   address: 'M0.0' },
        c2:     { type: 'NC',   address: 'I0.1' },
        c3:     { type: 'NC',   address: 'I0.3' },
        coil:   { type: 'OUT',  address: 'M0.0', preset: 1500 }
      },
      {
        id: 'rung_1',
        title: 'Network 2: Optical Package Up-Counter (CTU C0, PV = 5)',
        c1:     { type: 'NO',   address: 'I0.2' },
        branch: { type: 'NONE', address: 'Q0.0' },
        c2:     { type: 'NONE', address: 'I0.1' },
        c3:     { type: 'NONE', address: 'I0.2' },
        coil:   { type: 'CTU',  address: 'C0',   preset: 5 }
      },
      {
        id: 'rung_2',
        title: 'Network 3: Conveyor Drive with Batch Limit Cutoff (Q0.0)',
        c1:     { type: 'NO',   address: 'M0.0' },
        branch: { type: 'NONE', address: 'Q0.0' },
        c2:     { type: 'NONE', address: 'C0'   },
        c3:     { type: 'NONE', address: 'I0.2' },
        coil:   { type: 'OUT',  address: 'Q0.0', preset: 1500 }
      },
      {
        id: 'rung_3',
        title: 'Network 4: Batch Full Indicator Lamp (Q0.3)',
        c1:     { type: 'NONE', address: 'C0'   },
        branch: { type: 'NONE', address: 'Q0.0' },
        c2:     { type: 'NONE', address: 'I0.1' },
        c3:     { type: 'NONE', address: 'I0.2' },
        coil:   { type: 'OUT',  address: 'Q0.3', preset: 1500 }
      }
    ],

    solutionRungs: [
      {
        id: 'rung_0',
        title: 'Network 1: Master System Run Latch (M0.0)',
        c1:     { type: 'NO',   address: 'I0.0' },
        branch: { type: 'NO',   address: 'M0.0' },
        c2:     { type: 'NC',   address: 'I0.1' },
        c3:     { type: 'NC',   address: 'I0.3' },
        coil:   { type: 'OUT',  address: 'M0.0', preset: 1500 }
      },
      {
        id: 'rung_1',
        title: 'Network 2: Optical Package Up-Counter (CTU C0, PV = 5)',
        c1:     { type: 'NO',   address: 'I0.2' },
        branch: { type: 'NONE', address: 'Q0.0' },
        c2:     { type: 'NONE', address: 'I0.1' },
        c3:     { type: 'NONE', address: 'I0.2' },
        coil:   { type: 'CTU',  address: 'C0',   preset: 5 }
      },
      {
        id: 'rung_2',
        title: 'Network 3: Conveyor Drive with Batch Limit Cutoff (Q0.0)',
        c1:     { type: 'NO',   address: 'M0.0' },
        branch: { type: 'NONE', address: 'Q0.0' },
        c2:     { type: 'NC',   address: 'C0'   },
        c3:     { type: 'NONE', address: 'I0.2' },
        coil:   { type: 'OUT',  address: 'Q0.0', preset: 1500 }
      },
      {
        id: 'rung_3',
        title: 'Network 4: Batch Full Indicator Lamp (Q0.3)',
        c1:     { type: 'NO',   address: 'C0'   },
        branch: { type: 'NONE', address: 'Q0.0' },
        c2:     { type: 'NONE', address: 'I0.1' },
        c3:     { type: 'NONE', address: 'I0.2' },
        coil:   { type: 'OUT',  address: 'Q0.3', preset: 1500 }
      }
    ],

    verify(PLCEngineClass, currentRungs) {
      const sim = new PLCEngineClass();
      sim.loadRungs(currentRungs);
      sim.mode = 'RUN';
      const checks = [];

      sim.setInput('I0.0', true);
      sim.executeScan(20);
      sim.setInput('I0.0', false);
      sim.executeScan(20);

      const runningInitially = sim.getBit('Q0.0') === true && sim.getBit('Q0.3') === false;

      for (let i = 0; i < 5; i++) {
        sim.setInput('I0.2', true);
        sim.executeScan(20);
        sim.setInput('I0.2', false);
        sim.executeScan(20);
      }

      const countReachedFive = sim.counters['C0'] && sim.counters['C0'].cv === 5 && sim.getBit('C0') === true;
      const conveyorStoppedAtFive = sim.getBit('Q0.0') === false;
      const batchLampOnAtFive = sim.getBit('Q0.3') === true;

      checks.push({
        pass: countReachedFive,
        label: 'Up-Counter Accumulation (CTU C0 -> 5 Boxes)',
        detail: countReachedFive
          ? 'Counter C0 accumulated 5 sensor pulses from I0.2 and set Done bit (C0 = HIGH).'
          : 'Counter C0 did not reach 5 pulses from sensor I0.2.'
      });

      checks.push({
        pass: runningInitially && conveyorStoppedAtFive,
        label: 'Automatic Batch Cutoff (NC C0 -> Q0.0 OFF)',
        detail: (runningInitially && conveyorStoppedAtFive)
          ? 'Conveyor Q0.0 automatically stopped as soon as the batch count reached 5.'
          : 'Conveyor Q0.0 kept running after 5 boxes! Place a series NC C0 contact in Network 3.'
      });

      checks.push({
        pass: !runningInitially ? false : batchLampOnAtFive,
        label: 'Batch Complete Signal Lamp (NO C0 -> Q0.3 ON)',
        detail: batchLampOnAtFive
          ? 'Batch Full indicator lamp (Q0.3) illuminated upon reaching the 5-box quota.'
          : 'Place contact NO C0 in Network 4 to energize Q0.3 when the batch counter is full.'
      });

      return {
        passed: checks.every(c => c.pass),
        checks
      };
    }
  }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PLC_MISSIONS };
}
