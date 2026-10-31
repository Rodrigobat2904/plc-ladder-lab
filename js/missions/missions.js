/**
 * LadderLab — Industrial Automation Missions & Behavioral Validator
 * Verifies user ladder logic by running real behavioral test vectors on a sandbox PLC instance.
 */

const PLC_MISSIONS = [
  {
    id: 'mission_01',
    number: '01',
    title: 'DOL Motor Latching & Overload Interlock',
    subtitle: 'Rangkaian Self-Holding (Pengunci Start) & Proteksi Thermal Overload',
    difficulty: 'Fundamental Industrial Control',
    description:
      'Tombol START (I0.0) adalah momentary pushbutton yang kembali membuka saat dilepas. ' +
      'Rangkai kontak pengunci paralel (Self-Holding / Seal-in Q0.0) agar Motor Conveyor (Q0.0) tetap menyala setelah START dilepas, ' +
      'serta langsung berhenti jika tombol STOP (I0.1) ditekan atau Thermal Overload (I0.3) trip.',
    objectives: [
      'Saat START (I0.0) ditekan sesaat lalu dilepas, Conveyor Motor (Q0.0) harus terkunci tetap ON (Self-Holding).',
      'Saat STOP (I0.1) ditekan atau Overload (I0.3) aktif, Conveyor Motor (Q0.0) harus langsung OFF.',
      'Lampu Hijau RUN (Q0.2) menyala saat motor jalan, dan Lampu Alarm (Q0.3) menyala saat Overload (I0.3) trip.'
    ],
    hint:
      'Pada Network 1: Pasang NO I0.0 pada Kontak 1, pasang NO Q0.0 pada Cabang Paralel (Branch), pasang NC I0.1 pada Kontak 2, dan NC I0.3 pada Kontak 3 menuju Coil OUT Q0.0.',

    // Initial incomplete rungs for user to complete
    initialRungs: [
      {
        id: 'rung_0',
        title: 'Network 1: Conveyor Drive Self-Holding & Safety Interlock',
        c1:     { type: 'NO',   address: 'I0.0' },
        branch: { type: 'NONE', address: 'Q0.0' }, // User needs to set NO Q0.0
        c2:     { type: 'NC',   address: 'I0.1' },
        c3:     { type: 'NONE', address: 'I0.3' }, // User needs to set NC I0.3
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

    // 1-Click Complete Working Solution
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
          ? 'Motor Q0.0 berhasil menyala dan tetap terkunci (latched) setelah tombol START (I0.0) dilepas.'
          : 'Motor Q0.0 mati kembali saat START dilepas. Tambahkan kontak cabang paralel NO Q0.0!'
      });

      // Test 2: Run Indicator Q0.2
      const runLampOk = sim.getBit('Q0.2') === true;
      checks.push({
        pass: runLampOk,
        label: 'Run Status Lamp (Q0.2)',
        detail: runLampOk
          ? 'Lampu indikator hijau (Q0.2) menyala mengikuti status aktif motor.'
          : 'Lampu indikator Q0.2 belum menyala saat motor beroperasi.'
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
          ? 'Motor Q0.0 berhasil berhenti saat tombol STOP (I0.1) ditekan.'
          : 'Motor Q0.0 tidak berhenti saat STOP (I0.1) ditekan. Gunakan kontak NC I0.1 secara seri!'
      });

      // Test 4: Thermal Overload Cutoff & Alarm Lamp
      sim.setInput('I0.0', true);
      sim.executeScan(20);
      sim.setInput('I0.0', false);
      sim.setInput('I0.3', true); // Trip Overload
      sim.executeScan(20);
      const overloadTripsMotor = sim.getBit('Q0.0') === false;
      const overloadLightsAlarm = sim.getBit('Q0.3') === true;

      checks.push({
        pass: overloadTripsMotor && overloadLightsAlarm,
        label: 'Thermal Overload Safety Cutoff (I0.3 -> Q0.0 OFF, Q0.3 ON)',
        detail: (overloadTripsMotor && overloadLightsAlarm)
          ? 'Proteksi Thermal Overload memutus arus motor (NC I0.3) dan menyalakan lampu Fault (Q0.3).'
          : 'Pastikan kontak NC I0.3 memutus jalur Q0.0 dan kontak NO I0.3 menyalakan Q0.3 saat overload!'
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
    subtitle: 'Otomasi Sensor Optik, Silinder Pneumatik, & On-Delay Timer (TON)',
    difficulty: 'Intermediate PLC Timing',
    description:
      'Ketika sistem aktif (M0.0) dan kardus belum berstempel tiba di depan Photoelectric Sensor (I0.2), ' +
      'Conveyor (Q0.0) harus berhenti sejenak sementara Silinder Pneumatik (Q0.1) turun menekan stempel QC selama 1.5 detik (TON T0 = 1500 ms). ' +
      'Setelah T0 selesai, kardus terstempel dan konveyor otomatis kembali berjalan.',
    objectives: [
      'Gunakan internal memory M0.0 sebagai pengunci status System Run (Start I0.0 / Stop I0.1).',
      'Saat M0.0 aktif dan Sensor I0.2 mendeteksi kardus, aktifkan Timer TON T0 (1500 ms) dan Silinder Stempel Q0.1.',
      'Conveyor Q0.0 berjalan saat M0.0 aktif DAN Silinder Stempel Q0.1 sedang TIDAK menekan (NC Q0.1).'
    ],
    hint:
      'Pastikan Network 3 mengaktifkan Q0.1 saat M0.0 dan I0.2 aktif (serta NC T0), dan Network 4 menjalankan Q0.0 melalui kontak NO M0.0 yang diseri dengan NC Q0.1.',

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
        c2:     { type: 'NONE', address: 'I0.2' }, // User sets NO I0.2
        c3:     { type: 'NC',   address: 'T0'   },
        coil:   { type: 'OUT',  address: 'Q0.1', preset: 1500 }
      },
      {
        id: 'rung_3',
        title: 'Network 4: Conveyor Motor Interlocked with Stamper (Q0.0)',
        c1:     { type: 'NO',   address: 'M0.0' },
        branch: { type: 'NONE', address: 'Q0.0' },
        c2:     { type: 'NONE', address: 'Q0.1' }, // User sets NC Q0.1
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
          ? 'Sistem M0.0 terkunci ON dan Conveyor Q0.0 berjalan normal saat jalur sensor kosong.'
          : 'Conveyor Q0.0 harus berjalan saat M0.0 ON dan tidak ada barang di sensor (Q0.1 OFF).'
      });

      // 2. Box arrives at sensor I0.2 -> Stamper Q0.1 ON & Conveyor Q0.0 Pauses
      sim.setInput('I0.2', true);
      sim.executeScan(100);
      const stamperEngages = sim.getBit('Q0.1') === true;
      const conveyorPauses = sim.getBit('Q0.0') === false;

      checks.push({
        pass: stamperEngages && conveyorPauses,
        label: 'Sensor Detection -> Stamper Down (Q0.1 ON) & Conveyor Pause (Q0.0 OFF)',
        detail: (stamperEngages && conveyorPauses)
          ? 'Saat kardus menyentuh sensor I0.2, silinder Q0.1 turun menstempel dan konveyor Q0.0 berhenti tepat di bawah stempel.'
          : 'Pastikan Q0.1 hanya aktif saat I0.2 ON, dan Q0.0 di-interlock dengan kontak NC Q0.1!'
      });

      // 3. Advance timer past 1500ms -> T0.DN becomes true -> Q0.1 retracts & Q0.0 resumes
      sim.executeScan(1500);
      const timerDone = sim.getBit('T0') === true;
      const stamperRetracts = sim.getBit('Q0.1') === false;

      checks.push({
        pass: timerDone && stamperRetracts,
        label: 'On-Delay Timer Completion (TON T0 = 1500 ms)',
        detail: (timerDone && stamperRetracts)
          ? 'Setelah 1.5 detik (T0 Done), silinder Q0.1 otomatis naik kembali dan konveyor kembali berjalan.'
          : 'Timer TON T0 belum menyelesaikan siklus 1500 ms atau Q0.1 belum diputus oleh kontak NC T0.'
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
    subtitle: 'Pencacah Kardus Otomatis (5 Pcs/Batch) dengan Up-Counter CTU',
    difficulty: 'Sequential Batch Control',
    description:
      'Lini pengemasan harus mengisi peti pengiriman dengan tepat 5 kardus per batch. ' +
      'Setiap kardus yang melewati Photoelectric Sensor (I0.2) menambah hitungan Counter CTU C0 (Preset = 5). ' +
      'Saat C0 mencapai 5 (C0 Done = HIGH), Conveyor (Q0.0) harus otomatis berhenti dan Lampu Batch Penuh (Q0.3) menyala.',
    objectives: [
      'Network 1 mengunci System Run (M0.0) menggunakan tombol START (I0.0) dan STOP (I0.1).',
      'Network 2 menghitung pulsa kardus dari sensor NO I0.2 menggunakan blok CTU C0 (PV = 5).',
      'Network 3 menjalankan Conveyor (Q0.0) saat M0.0 aktif DAN Batch Counter C0 belum penuh (NC C0).',
      'Network 4 menyalakan indikator Batch Complete (Q0.3) saat C0 penuh (NO C0).'
    ],
    hint:
      'Pasang kontak NC C0 secara seri pada Network 3 (jalur Q0.0) agar konveyor otomatis berhenti tepat saat hitungan C0 mencapai 5.',

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
        c2:     { type: 'NONE', address: 'C0'   }, // User sets NC C0
        c3:     { type: 'NONE', address: 'I0.2' },
        coil:   { type: 'OUT',  address: 'Q0.0', preset: 1500 }
      },
      {
        id: 'rung_3',
        title: 'Network 4: Batch Full Indicator Lamp (Q0.3)',
        c1:     { type: 'NONE', address: 'C0'   }, // User sets NO C0
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

      // Start system
      sim.setInput('I0.0', true);
      sim.executeScan(20);
      sim.setInput('I0.0', false);
      sim.executeScan(20);

      const runningInitially = sim.getBit('Q0.0') === true && sim.getBit('Q0.3') === false;

      // Pulse 5 boxes on I0.2
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
          ? 'Counter C0 berhasil menghitung 5 pulsa kardus dari sensor I0.2 dan mengaktifkan bit Done (C0 = HIGH).'
          : 'Counter C0 belum menghitung pulsa I0.2 sampai 5.'
      });

      checks.push({
        pass: runningInitially && conveyorStoppedAtFive,
        label: 'Automatic Batch Cutoff (NC C0 -> Q0.0 OFF)',
        detail: (runningInitially && conveyorStoppedAtFive)
          ? 'Conveyor Q0.0 otomatis berhenti tepat saat jumlah barang mencapai 5 pcs.'
          : 'Conveyor Q0.0 masih terus jalan setelah 5 barang! Pasang kontak NC C0 secara seri pada Network 3.'
      });

      checks.push({
        pass: !runningInitially ? false : batchLampOnAtFive,
        label: 'Batch Complete Signal Lamp (NO C0 -> Q0.3 ON)',
        detail: batchLampOnAtFive
          ? 'Lampu indikator Batch Penuh (Q0.3) menyala saat kuota 5 kardus terpenuhi.'
          : 'Pasang kontak NO C0 pada Network 4 untuk menyalakan lampu indikator Q0.3 saat counter penuh.'
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
