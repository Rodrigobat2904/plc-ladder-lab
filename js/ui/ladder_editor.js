/**
 * LadderLab — Interactive IEC 61131-3 Ladder Diagram SVG Renderer & Slot Editor
 * Uses persistent DOM nodes and delegated pointerdown/click events so slots are 100% responsive at all times.
 */

class LadderEditorUI {
  constructor(containerEl, plc, onSlotClick) {
    this.container = containerEl;
    this.plc = plc;
    this.onSlotClick = onSlotClick;
    this.lastRungSignatures = [];

    this.attachDelegatedEvents();
  }

  /**
   * Event delegation on the persistent workspace container.
   * Using pointerdown ensures instant response without ever being interrupted by animation frames.
   */
  attachDelegatedEvents() {
    this.container.addEventListener('pointerdown', (e) => {
      // Only trigger on primary mouse button or touch
      if (e.button !== undefined && e.button !== 0) return;

      const slotEl = e.target.closest('.ladder-slot');
      if (!slotEl) return;

      const svgEl = slotEl.closest('.ladder-rung-svg');
      if (!svgEl) return;

      e.preventDefault();
      e.stopPropagation();

      const rIdx = Number(svgEl.dataset.rungIndex);
      const slotKey = slotEl.dataset.slotKey;

      if (this.onSlotClick && !Number.isNaN(rIdx) && slotKey) {
        this.onSlotClick(rIdx, slotKey);
      }
    });
  }

  /**
   * Compute a state signature for a rung so we only update its SVG when state actually changes
   */
  getRungSignature(rung) {
    const f = rung.flow || {};
    const c = rung.coil || {};
    let extra = '';
    if (c.type === 'TON' && this.plc.timers[c.address]) {
      extra = `T:${Math.floor(this.plc.timers[c.address].et / 50)}`;
    } else if (c.type === 'CTU' && this.plc.counters[c.address]) {
      extra = `C:${this.plc.counters[c.address].cv}`;
    }
    return `${this.plc.mode}|${JSON.stringify(rung.c1)}|${JSON.stringify(rung.branch)}|${JSON.stringify(rung.c2)}|${JSON.stringify(rung.c3)}|${JSON.stringify(rung.coil)}|${JSON.stringify(f)}|${extra}`;
  }

  /**
   * Build the DOM structure for all rungs
   */
  renderAllRungs() {
    this.container.innerHTML = '';
    this.lastRungSignatures = [];

    this.plc.rungs.forEach((rung, rIdx) => {
      const card = document.createElement('div');
      card.className = 'rung-card';

      const header = document.createElement('div');
      header.className = 'rung-header';
      header.innerHTML = `
        <span class="rung-title">${rung.title}</span>
        <span class="rung-hint-tag">👆 Click any Contact / Parallel Branch / Coil slot to configure instruction</span>
      `;

      const wrap = document.createElement('div');
      wrap.className = 'rung-svg-wrap';

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 740 112');
      svg.setAttribute('class', 'ladder-rung-svg');
      svg.dataset.rungIndex = rIdx;

      wrap.appendChild(svg);
      card.appendChild(header);
      card.appendChild(wrap);
      this.container.appendChild(card);

      this.drawRungSVG(svg, rung, rIdx);
      this.lastRungSignatures[rIdx] = this.getRungSignature(rung);
    });
  }

  /**
   * Update SVG contents only when a rung's electrical or timer/counter state actually changes
   */
  updatePowerFlow() {
    const svgs = this.container.querySelectorAll('.ladder-rung-svg');
    svgs.forEach(svg => {
      const rIdx = Number(svg.dataset.rungIndex);
      const rung = this.plc.rungs[rIdx];
      if (!rung) return;

      const sig = this.getRungSignature(rung);
      if (this.lastRungSignatures[rIdx] !== sig) {
        this.lastRungSignatures[rIdx] = sig;
        this.drawRungSVG(svg, rung, rIdx);
      }
    });
  }

  drawRungSVG(svg, rung, rIdx) {
    const isRun = this.plc.mode === 'RUN';
    const f = rung.flow || {};
    const cWireOn = '#10b981';
    const cWireOff = '#cbd5e1';

    const railColor = isRun ? cWireOn : '#94a3b8';
    const wAfterC1 = (isRun && f.c1Flow) ? cWireOn : cWireOff;
    const wBranch = (isRun && f.branchFlow) ? cWireOn : cWireOff;
    const wAfterBranch = (isRun && f.afterBranchFlow) ? cWireOn : cWireOff;
    const wAfterC2 = (isRun && f.c2Flow) ? cWireOn : cWireOff;
    const wAfterC3 = (isRun && f.rungFlow) ? cWireOn : cWireOff;

    const hasBranch = rung.branch && rung.branch.type !== 'NONE';

    svg.innerHTML = `
      <!-- Left 24V Power Rail -->
      <line x1="16" y1="6" x2="16" y2="106" stroke="${railColor}" stroke-width="4" stroke-linecap="round" />
      <!-- Right 0V Return Rail -->
      <line x1="724" y1="6" x2="724" y2="106" stroke="#94a3b8" stroke-width="4" stroke-linecap="round" />

      <!-- Main Rung Horizontal Wires -->
      <line x1="16" y1="34" x2="65" y2="34" stroke="${railColor}" stroke-width="2.6" />
      <line x1="165" y1="34" x2="195" y2="34" stroke="${wAfterC1}" stroke-width="2.6" />
      <line x1="195" y1="34" x2="230" y2="34" stroke="${wAfterBranch}" stroke-width="2.6" />
      <line x1="330" y1="34" x2="380" y2="34" stroke="${wAfterC2}" stroke-width="2.6" />
      <line x1="480" y1="34" x2="545" y2="34" stroke="${wAfterC3}" stroke-width="2.6" />
      <line x1="685" y1="34" x2="724" y2="34" stroke="${wAfterC3}" stroke-width="2.6" />

      <!-- Parallel Branch Drop Wires (around Contact 1) -->
      <path d="M 42 34 L 42 84 L 65 84" fill="none" stroke="${hasBranch ? railColor : '#cbd5e1'}" stroke-width="${hasBranch ? '2.4' : '1.5'}" ${hasBranch ? '' : 'stroke-dasharray="4 3"'} />
      <path d="M 165 84 L 195 84 L 195 34" fill="none" stroke="${hasBranch ? wBranch : '#cbd5e1'}" stroke-width="${hasBranch ? '2.4' : '1.5'}" ${hasBranch ? '' : 'stroke-dasharray="4 3"'} />

      <!-- Slot C1 (Series Contact 1) -->
      ${this.renderContactSlotSVG(rung.c1, 65, 12, 'c1', isRun && f.c1Cond, isRun && f.c1Flow, 'Contact 1')}

      <!-- Slot Branch (Parallel Seal-in / OR Contact) -->
      ${this.renderBranchSlotSVG(rung.branch, 65, 62, 'branch', isRun && f.branchCond, isRun && f.branchFlow)}

      <!-- Slot C2 (Series Contact 2) -->
      ${this.renderContactSlotSVG(rung.c2, 230, 12, 'c2', isRun && f.c2Cond, isRun && f.c2Flow, 'Contact 2')}

      <!-- Slot C3 (Series Contact 3) -->
      ${this.renderContactSlotSVG(rung.c3, 380, 12, 'c3', isRun && f.c3Cond, isRun && f.c3Flow, 'Contact 3')}

      <!-- Slot Coil / Function Block -->
      ${this.renderCoilSlotSVG(rung.coil, 545, 8, 'coil', isRun && f.rungFlow, isRun && f.coilActive)}
    `;
  }

  renderContactSlotSVG(slot, x, y, slotKey, isClosed, isEnergized, placeholderLabel) {
    const info = this.plc.getAddressInfo(slot.address);
    const w = 100;
    const h = 44;

    if (!slot || slot.type === 'NONE') {
      const wireCol = isEnergized ? '#10b981' : '#cbd5e1';
      return `
        <g class="ladder-slot" data-slot-key="${slotKey}" transform="translate(${x}, ${y})" style="cursor: pointer; pointer-events: all;">
          <rect class="slot-box" x="0" y="0" width="${w}" height="${h}" rx="6" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.4" stroke-dasharray="4 3" />
          <line x1="0" y1="22" x2="${w}" y2="22" stroke="${wireCol}" stroke-width="2.6" />
          <rect x="14" y="13" width="72" height="18" rx="4" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" />
          <text x="${w / 2}" y="25" text-anchor="middle" fill="#2563eb" font-family="Inter, sans-serif" font-size="8.5" font-weight="600">+ ${placeholderLabel}</text>
        </g>
      `;
    }

    const bgFill = isEnergized ? '#ecfdf5' : (isClosed ? '#f0fdf4' : '#ffffff');
    const borderCol = isEnergized ? '#10b981' : (isClosed ? '#6ee7b7' : '#94a3b8');
    const symCol = isEnergized ? '#059669' : '#0f172a';

    const ncSlash = slot.type === 'NC'
      ? `<line x1="39" y1="30" x2="61" y2="14" stroke="${symCol}" stroke-width="2.2" />`
      : '';

    return `
      <g class="ladder-slot" data-slot-key="${slotKey}" transform="translate(${x}, ${y})" style="cursor: pointer; pointer-events: all;">
        <rect class="slot-box" x="0" y="0" width="${w}" height="${h}" rx="6" fill="${bgFill}" stroke="${borderCol}" stroke-width="1.6" />
        <!-- Address & Symbolic Tag -->
        <text x="${w / 2}" y="11" text-anchor="middle" fill="#0f172a" font-family="JetBrains Mono, monospace" font-size="9" font-weight="700">${slot.address} (${info.symbol})</text>
        <!-- IEC Contact Parallel Bars -->
        <line x1="0" y1="22" x2="40" y2="22" stroke="${symCol}" stroke-width="2.2" />
        <line x1="40" y1="13" x2="40" y2="31" stroke="${symCol}" stroke-width="2.4" />
        <line x1="60" y1="13" x2="60" y2="31" stroke="${symCol}" stroke-width="2.4" />
        <line x1="60" y1="22" x2="${w}" y2="22" stroke="${symCol}" stroke-width="2.2" />
        ${ncSlash}
        <text x="${w / 2}" y="40" text-anchor="middle" fill="#2563eb" font-family="JetBrains Mono, monospace" font-size="7.5" font-weight="600">${slot.type} ✎</text>
      </g>
    `;
  }

  renderBranchSlotSVG(slot, x, y, slotKey, isClosed, isEnergized) {
    const w = 100;
    const h = 44;
    if (!slot || slot.type === 'NONE') {
      return `
        <g class="ladder-slot" data-slot-key="${slotKey}" transform="translate(${x}, ${y})" style="cursor: pointer; pointer-events: all;">
          <rect class="slot-box" x="0" y="0" width="${w}" height="${h}" rx="6" fill="#f8fafc" stroke="#94a3b8" stroke-width="1.3" stroke-dasharray="4 3" />
          <text x="${w / 2}" y="25" text-anchor="middle" fill="#2563eb" font-family="Inter, sans-serif" font-size="8.5" font-weight="600">+ Parallel Latch</text>
        </g>
      `;
    }
    return this.renderContactSlotSVG(slot, x, y, slotKey, isClosed, isEnergized, 'Branch');
  }

  renderCoilSlotSVG(coil, x, y, slotKey, rungInFlow, coilActive) {
    const w = 140;
    const h = 52;
    const info = this.plc.getAddressInfo(coil.address);

    const bgFill = coilActive ? '#ecfdf5' : (rungInFlow ? '#eff6ff' : '#ffffff');
    const borderCol = coilActive ? '#10b981' : (rungInFlow ? '#60a5fa' : '#94a3b8');
    const symCol = coilActive ? '#059669' : '#0f172a';

    if (coil.type === 'TON' || coil.type === 'CTU') {
      const isTimer = coil.type === 'TON';
      const statusText = isTimer
        ? `ET: ${Math.round((this.plc.timers[coil.address] || { et: 0 }).et)} / ${coil.preset || 1500}ms`
        : `CV: ${(this.plc.counters[coil.address] || { cv: 0 }).cv} / ${coil.preset || 5}`;

      return `
        <g class="ladder-slot" data-slot-key="${slotKey}" transform="translate(${x}, ${y})" style="cursor: pointer; pointer-events: all;">
          <rect class="slot-box" x="0" y="0" width="${w}" height="${h}" rx="6" fill="${bgFill}" stroke="${borderCol}" stroke-width="1.8" />
          <rect x="0" y="0" width="${w}" height="16" rx="6" fill="${coilActive ? '#10b981' : '#f1f5f9'}" />
          <text x="${w / 2}" y="11.5" text-anchor="middle" fill="${coilActive ? '#ffffff' : '#0f172a'}" font-family="JetBrains Mono, monospace" font-size="8.5" font-weight="700">[${coil.type}] ${coil.address} (${info.symbol})</text>
          <text x="${w / 2}" y="31" text-anchor="middle" fill="${symCol}" font-family="JetBrains Mono, monospace" font-size="9.5" font-weight="700">${statusText}</text>
          <text x="${w / 2}" y="45" text-anchor="middle" fill="#2563eb" font-family="JetBrains Mono, monospace" font-size="7.5" font-weight="600">DN: ${coilActive ? '1 (HIGH)' : '0 (LOW)'} ✎</text>
        </g>
      `;
    }

    const innerChar = coil.type === 'SET' ? 'S' : (coil.type === 'RST' ? 'R' : (coil.type === 'RES' ? 'RES' : ''));

    return `
      <g class="ladder-slot" data-slot-key="${slotKey}" transform="translate(${x}, ${y})" style="cursor: pointer; pointer-events: all;">
        <rect class="slot-box" x="0" y="0" width="${w}" height="${h}" rx="6" fill="${bgFill}" stroke="${borderCol}" stroke-width="1.6" />
        <text x="${w / 2}" y="13" text-anchor="middle" fill="#0f172a" font-family="JetBrains Mono, monospace" font-size="9" font-weight="700">${coil.address} (${info.symbol})</text>
        <!-- IEC Coil Parentheses -->
        <line x1="0" y1="26" x2="48" y2="26" stroke="${symCol}" stroke-width="2.2" />
        <path d="M 55 16 A 12 12 0 0 0 55 36" fill="none" stroke="${symCol}" stroke-width="2.4" />
        <path d="M 85 16 A 12 12 0 0 1 85 36" fill="none" stroke="${symCol}" stroke-width="2.4" />
        <text x="70" y="29" text-anchor="middle" fill="${symCol}" font-family="JetBrains Mono, monospace" font-size="9" font-weight="700">${innerChar}</text>
        <line x1="92" y1="26" x2="${w}" y2="26" stroke="${symCol}" stroke-width="2.2" />
        <text x="${w / 2}" y="46" text-anchor="middle" fill="#2563eb" font-family="JetBrains Mono, monospace" font-size="7.5" font-weight="600">COIL (${coil.type}) ✎</text>
      </g>
    `;
  }
}
