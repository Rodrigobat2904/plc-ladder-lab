/**
 * LadderLab — Main Application Controller
 * Connects PLC Scan Cycle Engine, 2D Smart Factory Plant, Ladder Editor, and Diagnostics.
 */

class LadderLabApp {
  constructor() {
    this.plc = new PLCEngine();
    this.plant = new FactoryPlant(this.plc);
    this.currentMissionIdx = 0;

    // Currently edited ladder slot in modal
    this.editingRungIdx = null;
    this.editingSlotKey = null;
    this.tempSlotType = 'NO';
    this.lastIOSignature = '';

    this.initDOM();
    this.scadaView = new ScadaView(this.svgScada, this.plc, this.plant);
    this.ladderEditor = new LadderEditorUI(
      this.ladderContainer,
      this.plc,
      (rIdx, slotKey) => this.openSlotEditor(rIdx, slotKey)
    );

    this.attachEvents();
    this.loadMission(0);
    this.startMainLoop();
  }

  initDOM() {
    this.missionSelect = document.getElementById('mission-select');
    this.missionTitle = document.getElementById('mission-title');
    this.missionDesc = document.getElementById('mission-desc');
    this.objectiveList = document.getElementById('objective-list');

    this.plcBadge = document.getElementById('plc-status-badge');
    this.scanTimeTxt = document.getElementById('scan-time-txt');
    this.ioMonitorContainer = document.getElementById('io-monitor-container');
    this.diagContainer = document.getElementById('diag-container');

    this.svgScada = document.getElementById('scada-svg');
    this.ladderContainer = document.getElementById('ladder-workspace');

    // Operator station buttons
    this.btnOpStart = document.getElementById('btn-op-start');
    this.btnOpStop = document.getElementById('btn-op-stop');
    this.btnOpOverload = document.getElementById('btn-op-overload');
    this.btnOpSpawn = document.getElementById('btn-op-spawn');
    this.btnOpResetCnt = document.getElementById('btn-op-reset-cnt');

    // Modal elements
    this.modalBackdrop = document.getElementById('slot-modal-backdrop');
    this.modalTitle = document.getElementById('slot-modal-title');
    this.typeSelectorGrid = document.getElementById('type-selector-grid');
    this.addressSelect = document.getElementById('slot-address-select');
    this.presetGroup = document.getElementById('slot-preset-group');
    this.presetInput = document.getElementById('slot-preset-input');
  }

  attachEvents() {
    this.missionSelect.addEventListener('change', (e) => {
      this.loadMission(Number(e.target.value));
    });

    // Verify & Run PLC button
    document.getElementById('btn-verify-run').addEventListener('click', () => {
      this.verifyAndRunPLC();
    });

    // Toggle PLC STOP
    document.getElementById('btn-plc-stop').addEventListener('click', () => {
      this.plc.mode = 'STOP';
      this.plc.resetState();
      this.updatePLCStatusUI();
      this.ladderEditor.updatePowerFlow();
    });

    // Auto-Build Solution button
    document.getElementById('btn-autobuild').addEventListener('click', () => {
      this.applySolutionRungs();
    });

    // Reset Rungs to Initial Puzzle
    document.getElementById('btn-reset-rungs').addEventListener('click', () => {
      const m = PLC_MISSIONS[this.currentMissionIdx];
      this.plc.loadRungs(m.initialRungs);
      this.plc.resetState();
      this.plant.resetPlant();
      this.ladderEditor.renderAllRungs();
      this.renderVerificationReport(null, 'Rangkaian di-reset ke kondisi awal puzzle.');
    });

    // Hint button
    document.getElementById('btn-hint').addEventListener('click', () => {
      const m = PLC_MISSIONS[this.currentMissionIdx];
      alert(`💡 Petunjuk Misi ${m.number}:\n\n${m.hint}`);
    });

    // Operator Pushbuttons (Support both hold AND quick click 450ms pulse)
    this.btnOpStart.addEventListener('mousedown', () => this.plant.triggerStartButton(true, true));
    this.btnOpStop.addEventListener('mousedown', () => this.plant.triggerStopButton(true, true));

    this.btnOpOverload.addEventListener('click', () => {
      const tripped = this.plant.toggleOverloadFault();
      this.btnOpOverload.classList.toggle('tripped', tripped);
      this.btnOpOverload.textContent = tripped ? '⚠️ OVERLOAD: TRIPPED (I0.3=1)' : '🛡️ Simulate Overload (I0.3)';
    });

    this.btnOpSpawn.addEventListener('click', () => {
      this.plant.spawnBox();
    });

    this.btnOpResetCnt.addEventListener('click', () => {
      this.plc.counters['C0'].cv = 0;
      this.plc.counters['C0'].dn = false;
      this.plc.timers['T0'].et = 0;
      this.plc.timers['T0'].dn = false;
      this.plant.triggerStartButton(true, true);
    });

    // Modal events
    document.getElementById('btn-modal-cancel').addEventListener('click', () => {
      this.modalBackdrop.classList.remove('open');
    });

    document.getElementById('btn-modal-save').addEventListener('click', () => {
      this.saveSlotEdit();
    });

    this.modalBackdrop.addEventListener('click', (e) => {
      if (e.target === this.modalBackdrop) {
        this.modalBackdrop.classList.remove('open');
      }
    });
  }

  loadMission(index) {
    this.currentMissionIdx = index;
    this.missionSelect.value = index;
    const m = PLC_MISSIONS[index];

    this.plant.missionId = m.id;
    this.plc.mode = 'RUN';
    this.plc.resetState();
    this.plant.resetPlant();
    this.btnOpOverload.classList.remove('tripped');
    this.btnOpOverload.textContent = '🛡️ Simulate Overload (I0.3)';

    this.missionTitle.textContent = `Misi ${m.number}: ${m.title}`;
    this.missionDesc.textContent = m.description;
    this.objectiveList.innerHTML = m.objectives.map(o => `<li>${o}</li>`).join('');

    this.plc.loadRungs(m.initialRungs);
    this.ladderEditor.renderAllRungs();
    this.updatePLCStatusUI();
    this.renderVerificationReport(
      null,
      `Misi ${m.number} dimuat. Klik kotak kontak pada diagram Ladder di bawah untuk melengkapi rangkaian, atau klik "⚡ Auto-Build Solusi" untuk melihat demo berjalan.`
    );
  }

  applySolutionRungs() {
    const m = PLC_MISSIONS[this.currentMissionIdx];
    this.plc.loadRungs(m.solutionRungs);
    this.plc.resetState();
    this.plant.resetPlant();
    this.plc.mode = 'RUN';
    this.ladderEditor.renderAllRungs();
    this.verifyAndRunPLC(true);
    // Automatically pulse START (I0.0) so conveyor starts moving immediately
    this.plant.triggerStartButton(true, true);
  }

  verifyAndRunPLC(isAutoSolution = false) {
    const m = PLC_MISSIONS[this.currentMissionIdx];
    const result = m.verify(PLCEngine, this.plc.rungs);
    this.plc.mode = 'RUN';
    this.updatePLCStatusUI();
    this.renderVerificationReport(result, isAutoSolution ? 'Solusi otomatis diterapkan dan diverifikasi!' : null);
    if (result.passed) {
      this.plant.triggerStartButton(true, true);
    }
  }

  renderVerificationReport(result, infoBanner = null) {
    if (!result) {
      this.diagContainer.innerHTML = `
        <div class="diag-item">
          <div class="diag-item-title">Status Verifikasi Ladder</div>
          <div class="diag-item-detail">${infoBanner || 'Belum diverifikasi.'}</div>
        </div>
      `;
      return;
    }

    let html = '';
    if (infoBanner) {
      html += `
        <div class="diag-item pass">
          <div class="diag-item-title">⚡ ${infoBanner}</div>
          <div class="diag-item-detail">Tekan tombol START (I0.0) atau amati pergerakan paket pada konveyor di atas.</div>
        </div>
      `;
    }

    result.checks.forEach(c => {
      html += `
        <div class="diag-item ${c.pass ? 'pass' : 'fail'}">
          <div class="diag-item-title">${c.pass ? '✓ [PASS]' : '✕ [FAIL]'} ${c.label}</div>
          <div class="diag-item-detail">${c.detail}</div>
        </div>
      `;
    });

    this.diagContainer.innerHTML = html;
  }

  updatePLCStatusUI() {
    const isRun = this.plc.mode === 'RUN';
    this.plcBadge.className = `plc-badge ${isRun ? 'run' : 'stop'}`;
    this.plcBadge.innerHTML = `<span class="dot"></span> PLC: ${this.plc.mode}`;
    this.scanTimeTxt.textContent = `Scan: ${this.plc.scanTimeMs} ms | Cycle #${this.plc.scanCount}`;
  }

  renderIOMonitor() {
    const inKeys = ['I0.0', 'I0.1', 'I0.2', 'I0.3'];
    const outKeys = ['Q0.0', 'Q0.1', 'Q0.2', 'Q0.3'];
    const memKeys = ['M0.0', 'T0', 'C0'];

    const sig = [...inKeys, ...outKeys, ...memKeys].map(k => (this.plc.getBit(k) ? '1' : '0')).join('');
    if (this.lastIOSignature === sig) return;
    this.lastIOSignature = sig;

    const makeChip = (addr, isOutput = false) => {
      const val = this.plc.getBit(addr);
      const info = this.plc.getAddressInfo(addr);
      const activeClass = val ? (isOutput ? 'active-out' : 'active-in') : '';
      return `
        <div class="io-chip ${activeClass}" title="${info.desc}">
          <span>${addr} <small style="opacity:0.75">${info.symbol}</small></span>
          <span class="io-led"></span>
        </div>
      `;
    };

    this.ioMonitorContainer.innerHTML = `
      <div class="io-section-title">Digital Inputs (24V DC)</div>
      <div class="io-grid">${inKeys.map(k => makeChip(k, false)).join('')}</div>
      <div class="io-section-title">Digital Outputs (Actuators)</div>
      <div class="io-grid">${outKeys.map(k => makeChip(k, true)).join('')}</div>
      <div class="io-section-title">Internal Flags / Timer / Counter</div>
      <div class="io-grid">${memKeys.map(k => makeChip(k, true)).join('')}</div>
    `;

    // Sync operator button visual press states
    this.btnOpStart.classList.toggle('pressed', this.plc.getBit('I0.0'));
    this.btnOpStop.classList.toggle('pressed', this.plc.getBit('I0.1'));
  }

  /**
   * Open Modal to configure clicked Contact, Branch, or Coil
   */
  openSlotEditor(rIdx, slotKey) {
    this.editingRungIdx = rIdx;
    this.editingSlotKey = slotKey;
    const rung = this.plc.rungs[rIdx];
    const currentSlot = rung[slotKey];
    const isCoil = slotKey === 'coil';

    this.modalTitle.textContent = isCoil
      ? `Konfigurasi Output / Function Block (${rung.title})`
      : `Konfigurasi Kontak Logika (${slotKey.toUpperCase()} — ${rung.title})`;

    this.tempSlotType = currentSlot.type || (isCoil ? 'OUT' : 'NO');

    const contactTypes = [
      { type: 'NO',   symbol: '─| |─', label: 'Normally Open' },
      { type: 'NC',   symbol: '─|/|─', label: 'Normally Closed' },
      { type: 'NONE', symbol: '─────', label: 'Kosong / Jumper' }
    ];

    const coilTypes = [
      { type: 'OUT', symbol: '─( )─',   label: 'Output Coil' },
      { type: 'TON', symbol: '[TON]',   label: 'Timer On-Delay' },
      { type: 'CTU', symbol: '[CTU]',   label: 'Counter Up' },
      { type: 'SET', symbol: '─(S)─',   label: 'Set Latch' },
      { type: 'RST', symbol: '─(R)─',   label: 'Reset Latch' },
      { type: 'RES', symbol: '─(RES)─', label: 'Reset Tmr/Cnt' }
    ];

    const options = isCoil ? coilTypes : contactTypes;
    this.typeSelectorGrid.innerHTML = options.map(opt => `
      <div class="type-option-btn ${opt.type === this.tempSlotType ? 'selected' : ''}" data-type="${opt.type}">
        <span class="type-option-symbol">${opt.symbol}</span>
        <span class="type-option-label">${opt.label}</span>
      </div>
    `).join('');

    this.typeSelectorGrid.querySelectorAll('.type-option-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.tempSlotType = btn.dataset.type;
        this.typeSelectorGrid.querySelectorAll('.type-option-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.updateModalFieldsVisibility();
      });
    });

    // Populate address dropdown
    const allowedCatalog = isCoil
      ? PLC_ADDRESS_CATALOG.filter(a => a.category !== 'INPUT')
      : PLC_ADDRESS_CATALOG;

    this.addressSelect.innerHTML = allowedCatalog.map(item => `
      <option value="${item.address}" ${item.address === currentSlot.address ? 'selected' : ''}>
        ${item.address} — ${item.symbol} (${item.desc})
      </option>
    `).join('');

    this.presetInput.value = currentSlot.preset || (this.tempSlotType === 'CTU' ? 5 : 1500);
    this.updateModalFieldsVisibility();
    this.modalBackdrop.classList.add('open');
  }

  updateModalFieldsVisibility() {
    const showPreset = this.editingSlotKey === 'coil' && (this.tempSlotType === 'TON' || this.tempSlotType === 'CTU');
    this.presetGroup.style.display = showPreset ? 'block' : 'none';
  }

  saveSlotEdit() {
    const rung = this.plc.rungs[this.editingRungIdx];
    if (!rung) return;

    const addr = this.addressSelect.value;
    const presetVal = Number(this.presetInput.value) || 1500;

    rung[this.editingSlotKey] = {
      type: this.tempSlotType,
      address: addr,
      preset: presetVal
    };

    this.modalBackdrop.classList.remove('open');
    this.ladderEditor.renderAllRungs();
    this.verifyAndRunPLC(false);
  }

  startMainLoop() {
    let lastTime = performance.now();
    const tick = (now) => {
      const dt = Math.min(50, Math.max(5, now - lastTime));
      lastTime = now;

      this.plc.executeScan(dt);
      this.plant.update(dt);

      this.scadaView.render();
      this.ladderEditor.updatePowerFlow();
      this.renderIOMonitor();
      this.updatePLCStatusUI();

      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.ladderApp = new LadderLabApp();
});
