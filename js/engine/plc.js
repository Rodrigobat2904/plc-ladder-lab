/**
 * LadderLab — IEC 61131-3 PLC Scan Cycle & Ladder Logic Engine
 * Supports Inputs (I), Outputs (Q), Internal Memory (M),
 * On-Delay Timers (TON), and Up-Counters (CTU).
 */

const PLC_ADDRESS_CATALOG = [
  // Physical Digital Inputs (24V DC)
  { address: 'I0.0', symbol: 'START_PB',   category: 'INPUT',   desc: 'Momentary Start Pushbutton (NO)' },
  { address: 'I0.1', symbol: 'STOP_PB',    category: 'INPUT',   desc: 'Stop Pushbutton Trigger' },
  { address: 'I0.2', symbol: 'PROX_SENS',  category: 'INPUT',   desc: 'Photoelectric Box Sensor' },
  { address: 'I0.3', symbol: 'THERM_OL',   category: 'INPUT',   desc: 'Motor Thermal Overload Fault' },

  // Physical Digital Outputs (Relay / 24V Solenoid)
  { address: 'Q0.0', symbol: 'CONV_MTR',   category: 'OUTPUT',  desc: 'Conveyor Drive Motor Contactor' },
  { address: 'Q0.1', symbol: 'PNEUM_CYL',  category: 'OUTPUT',  desc: 'Pneumatic Stamper / Pusher Solenoid' },
  { address: 'Q0.2', symbol: 'LAMP_RUN',   category: 'OUTPUT',  desc: 'Tower Light: Green (RUN)' },
  { address: 'Q0.3', symbol: 'LAMP_ALRM',  category: 'OUTPUT',  desc: 'Tower Light: Amber/Red (BATCH/FAULT)' },

  // Internal Memory Bits (Markers)
  { address: 'M0.0', symbol: 'SYS_RUN',    category: 'MEMORY',  desc: 'Internal System Run Latch Bit' },
  { address: 'M0.1', symbol: 'AUX_FLAG',   category: 'MEMORY',  desc: 'Auxiliary Process Flag Bit' },

  // Timers & Counters
  { address: 'T0',   symbol: 'STAMP_TMR',  category: 'TIMER',   desc: 'On-Delay Timer T0 (Done Bit & Acc)' },
  { address: 'C0',   symbol: 'BATCH_CNT',  category: 'COUNTER', desc: 'Up-Counter C0 (Done Bit & Count)' }
];

class PLCEngine {
  constructor() {
    this.mode = 'STOP'; // 'RUN' | 'STOP'
    this.scanCount = 0;
    this.scanTimeMs = 1.2;

    // Bit tables
    this.inputs = {
      'I0.0': false,
      'I0.1': false,
      'I0.2': false,
      'I0.3': false
    };

    this.outputs = {
      'Q0.0': false,
      'Q0.1': false,
      'Q0.2': false,
      'Q0.3': false
    };

    this.memory = {
      'M0.0': false,
      'M0.1': false
    };

    this.timers = {
      'T0': { pt: 1500, et: 0, dn: false, en: false }
    };

    this.counters = {
      'C0': { pv: 5, cv: 0, dn: false, prevCu: false }
    };

    // Ladder Rungs array
    this.rungs = [];
  }

  /**
   * Look up metadata for an address
   */
  getAddressInfo(address) {
    return PLC_ADDRESS_CATALOG.find(item => item.address === address) || {
      address,
      symbol: address,
      category: 'UNKNOWN',
      desc: ''
    };
  }

  /**
   * Read boolean state of any bit address (I, Q, M, T, C)
   */
  getBit(address) {
    if (!address) return false;
    if (address in this.inputs) return Boolean(this.inputs[address]);
    if (address in this.outputs) return Boolean(this.outputs[address]);
    if (address in this.memory) return Boolean(this.memory[address]);
    if (address in this.timers) return Boolean(this.timers[address].dn);
    if (address in this.counters) return Boolean(this.counters[address].dn);
    return false;
  }

  /**
   * Write boolean state to writable coil address (Q or M)
   */
  setBit(address, val) {
    const b = Boolean(val);
    if (address in this.outputs) {
      this.outputs[address] = b;
    } else if (address in this.memory) {
      this.memory[address] = b;
    }
  }

  /**
   * Set physical input state (from pushbuttons, sensors, overload switches)
   */
  setInput(address, val) {
    if (address in this.inputs) {
      this.inputs[address] = Boolean(val);
    }
  }

  /**
   * Reset all outputs, internal memory, timers, and counters
   */
  resetState() {
    Object.keys(this.outputs).forEach(k => { this.outputs[k] = false; });
    Object.keys(this.memory).forEach(k => { this.memory[k] = false; });
    Object.keys(this.timers).forEach(k => {
      this.timers[k].et = 0;
      this.timers[k].dn = false;
      this.timers[k].en = false;
    });
    Object.keys(this.counters).forEach(k => {
      this.counters[k].cv = 0;
      this.counters[k].dn = false;
      this.counters[k].prevCu = false;
    });
    this.scanCount = 0;
    this.clearPowerFlow();
  }

  /**
   * Clear live power-flow visualization flags on all rungs
   */
  clearPowerFlow() {
    this.rungs.forEach(r => {
      r.flow = {
        c1Cond: false,
        c1Flow: false,
        branchCond: false,
        branchFlow: false,
        afterBranchFlow: false,
        c2Cond: false,
        c2Flow: false,
        c3Cond: false,
        rungFlow: false,
        coilActive: false
      };
    });
  }

  /**
   * Load a set of ladder rungs into PLC memory
   */
  loadRungs(rungsConfig) {
    this.rungs = JSON.parse(JSON.stringify(rungsConfig)).map((r, idx) => ({
      id: r.id || `rung_${idx}`,
      title: r.title || `Network ${idx + 1}`,
      c1: r.c1 || { type: 'NONE', address: 'I0.0' },
      branch: r.branch || { type: 'NONE', address: 'Q0.0' },
      c2: r.c2 || { type: 'NONE', address: 'I0.1' },
      c3: r.c3 || { type: 'NONE', address: 'I0.2' },
      coil: r.coil || { type: 'OUT', address: 'Q0.0', preset: 1500 },
      flow: {
        c1Cond: false,
        c1Flow: false,
        branchCond: false,
        branchFlow: false,
        afterBranchFlow: false,
        c2Cond: false,
        c2Flow: false,
        c3Cond: false,
        rungFlow: false,
        coilActive: false
      }
    }));
  }

  /**
   * Evaluate a single contact condition (NO, NC, or NONE jumper)
   */
  evalContact(contact) {
    if (!contact || contact.type === 'NONE') return true;
    const bitVal = this.getBit(contact.address);
    if (contact.type === 'NO') return bitVal === true;
    if (contact.type === 'NC') return bitVal === false;
    return false;
  }

  /**
   * Execute one deterministic PLC Scan Cycle
   * @param {number} dtMs Elapsed time since last scan in milliseconds
   */
  executeScan(dtMs = 20) {
    if (this.mode !== 'RUN') {
      Object.keys(this.outputs).forEach(k => { this.outputs[k] = false; });
      this.clearPowerFlow();
      return;
    }

    const tStart = performance.now ? performance.now() : Date.now();
    this.scanCount++;

    // Track which OUT coils are driven in this scan (if multiple rungs, last wins or active wins)
    const outAssignments = {};

    for (const rung of this.rungs) {
      // 1. Evaluate C1 & Parallel Branch
      const hasC1 = rung.c1 && rung.c1.type !== 'NONE';
      const hasBranch = rung.branch && rung.branch.type !== 'NONE';

      const c1Cond = this.evalContact(rung.c1);
      const c1Flow = hasC1 ? c1Cond : (!hasBranch);

      let branchCond = false;
      let branchFlow = false;
      if (hasBranch) {
        branchCond = this.evalContact(rung.branch);
        branchFlow = branchCond;
      }

      const afterBranchFlow = hasC1 ? (c1Flow || branchFlow) : (hasBranch ? branchFlow : true);

      // 2. Evaluate C2
      const c2Cond = this.evalContact(rung.c2);
      const c2Flow = afterBranchFlow && c2Cond;

      // 3. Evaluate C3
      const c3Cond = this.evalContact(rung.c3);
      const rungFlow = c2Flow && c3Cond;

      // 4. Execute Output Instruction / Function Block
      const coil = rung.coil;
      let coilActive = false;

      if (coil && coil.type !== 'NONE') {
        const addr = coil.address;

        if (coil.type === 'OUT') {
          outAssignments[addr] = rungFlow;
          this.setBit(addr, rungFlow);
          coilActive = rungFlow;
        } else if (coil.type === 'SET') {
          if (rungFlow) this.setBit(addr, true);
          coilActive = this.getBit(addr);
        } else if (coil.type === 'RST') {
          if (rungFlow) this.setBit(addr, false);
          coilActive = rungFlow;
        } else if (coil.type === 'TON') {
          const tmr = this.timers[addr] || (this.timers[addr] = { pt: coil.preset || 1500, et: 0, dn: false, en: false });
          if (coil.preset) tmr.pt = Number(coil.preset);
          tmr.en = rungFlow;
          if (rungFlow) {
            tmr.et = Math.min(tmr.pt, tmr.et + dtMs);
            tmr.dn = tmr.et >= tmr.pt;
          } else {
            tmr.et = 0;
            tmr.dn = false;
          }
          coilActive = tmr.dn;
        } else if (coil.type === 'CTU') {
          const cnt = this.counters[addr] || (this.counters[addr] = { pv: coil.preset || 5, cv: 0, dn: false, prevCu: false });
          if (coil.preset) cnt.pv = Number(coil.preset);
          // Rising edge detection
          if (rungFlow && !cnt.prevCu) {
            cnt.cv += 1;
          }
          cnt.prevCu = rungFlow;
          cnt.dn = cnt.cv >= cnt.pv;
          coilActive = cnt.dn;
        } else if (coil.type === 'RES') {
          if (rungFlow) {
            if (addr in this.counters) {
              this.counters[addr].cv = 0;
              this.counters[addr].dn = false;
            }
            if (addr in this.timers) {
              this.timers[addr].et = 0;
              this.timers[addr].dn = false;
            }
          }
          coilActive = rungFlow;
        }
      }

      rung.flow = {
        c1Cond,
        c1Flow,
        branchCond,
        branchFlow,
        afterBranchFlow,
        c2Cond,
        c2Flow,
        c3Cond,
        rungFlow,
        coilActive
      };
    }

    const tEnd = performance.now ? performance.now() : Date.now();
    this.scanTimeMs = Math.max(0.4, Number((tEnd - tStart + 0.8).toFixed(2)));
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PLCEngine, PLC_ADDRESS_CATALOG };
}
