/**
 * LadderLab — 2D Smart Factory SCADA View Renderer (Clean Architectural Vector Style)
 */

class ScadaView {
  constructor(svgElement, plc, plant) {
    this.svg = svgElement;
    this.plc = plc;
    this.plant = plant;
    this.initStaticScene();
  }

  initStaticScene() {
    this.svg.setAttribute('viewBox', '0 0 860 250');
    this.svg.innerHTML = `
      <defs>
        <linearGradient id="steel-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#f8fafc" />
          <stop offset="100%" stop-color="#e2e8f0" />
        </linearGradient>
        <linearGradient id="box-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#f59e0b" />
          <stop offset="100%" stop-color="#d97706" />
        </linearGradient>
        <linearGradient id="box-stamped-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#10b981" />
          <stop offset="100%" stop-color="#059669" />
        </linearGradient>
        <filter id="soft-shadow" x="-10%" y="-10%" width="120%" height="125%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#0f172a" flood-opacity="0.08" />
        </filter>
      </defs>

      <!-- Floor Line -->
      <line x1="20" y1="228" x2="840" y2="228" stroke="#cbd5e1" stroke-width="2" />

      <!-- Conveyor Support Legs -->
      <rect x="110" y="176" width="14" height="52" fill="#94a3b8" rx="2" />
      <rect x="353" y="176" width="14" height="52" fill="#94a3b8" rx="2" />
      <rect x="570" y="176" width="14" height="52" fill="#94a3b8" rx="2" />

      <!-- Pneumatic Gantry Arch at x=360 -->
      <g id="pneumatic-station" filter="url(#soft-shadow)">
        <rect x="318" y="18" width="84" height="22" rx="4" fill="#1e293b" />
        <text x="360" y="32" text-anchor="middle" fill="#ffffff" font-family="JetBrains Mono, monospace" font-size="8.5" font-weight="700">Q0.1 STAMPER</text>
        <!-- Cylinder Housing -->
        <rect x="342" y="40" width="36" height="44" rx="3" fill="url(#steel-grad)" stroke="#64748b" stroke-width="1.5" />
        <!-- Moving Piston Rod & Head -->
        <g id="piston-assembly" transform="translate(0, 0)">
          <rect x="355" y="84" width="10" height="32" fill="#94a3b8" stroke="#475569" stroke-width="1" />
          <rect id="stamper-pad" x="338" y="112" width="44" height="10" rx="2" fill="#2563eb" />
        </g>
      </g>

      <!-- Photoelectric Sensor Laser Beam (I0.2) at x=360 -->
      <g id="sensor-station">
        <line id="sensor-laser" x1="360" y1="122" x2="360" y2="155" stroke="#ef4444" stroke-width="2" stroke-dasharray="3 3" opacity="0.75" />
        <rect x="346" y="182" width="28" height="18" rx="3" fill="#0f172a" />
        <circle id="sensor-led" cx="360" cy="191" r="4" fill="#64748b" />
        <text x="360" y="212" text-anchor="middle" fill="#475569" font-family="JetBrains Mono, monospace" font-size="8.5" font-weight="700">I0.2 PROX</text>
      </g>

      <!-- Moving Packages Layer -->
      <g id="boxes-layer"></g>

      <!-- Main Conveyor Frame (x=70 to x=620, y=154 to y=178) -->
      <g id="conveyor-frame" filter="url(#soft-shadow)">
        <rect x="70" y="154" width="550" height="24" rx="12" fill="url(#steel-grad)" stroke="#64748b" stroke-width="1.8" />
        <!-- Animated Belt Treads -->
        <g id="belt-treads"></g>

        <!-- Left Drive Roller (Motor Q0.0) -->
        <g id="roller-left" transform="translate(84, 166)">
          <circle cx="0" cy="0" r="10" fill="#0f172a" />
          <line x1="-7" y1="0" x2="7" y2="0" stroke="#94a3b8" stroke-width="2" />
          <line x1="0" y1="-7" x2="0" y2="7" stroke="#94a3b8" stroke-width="2" />
        </g>

        <!-- Right Idler Roller -->
        <g id="roller-right" transform="translate(606, 166)">
          <circle cx="0" cy="0" r="10" fill="#0f172a" />
          <line x1="-7" y1="0" x2="7" y2="0" stroke="#94a3b8" stroke-width="2" />
          <line x1="0" y1="-7" x2="0" y2="7" stroke="#94a3b8" stroke-width="2" />
        </g>

        <!-- Motor Drive Status Badge -->
        <rect id="motor-badge-bg" x="155" y="158" width="135" height="16" rx="8" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1" />
        <text id="motor-badge-txt" x="222" y="169" text-anchor="middle" fill="#475569" font-family="JetBrains Mono, monospace" font-size="8.5" font-weight="700">Q0.0 MOTOR: OFF</text>
      </g>

      <!-- Shipping Receiving Crate at Right End (x=640) -->
      <g id="shipping-crate" filter="url(#soft-shadow)">
        <rect x="636" y="138" width="110" height="90" rx="6" fill="#ffffff" stroke="#94a3b8" stroke-width="1.8" />
        <rect x="636" y="138" width="110" height="22" rx="6" fill="#f1f5f9" />
        <text x="691" y="152" text-anchor="middle" fill="#0f172a" font-family="JetBrains Mono, monospace" font-size="8.5" font-weight="700">BATCH CRATE (C0)</text>
        <text id="crate-count-txt" x="691" y="185" text-anchor="middle" fill="#2563eb" font-family="JetBrains Mono, monospace" font-size="18" font-weight="800">0 / 5</text>
        <text id="crate-sub-txt" x="691" y="204" text-anchor="middle" fill="#64748b" font-family="Inter, sans-serif" font-size="8.5">Delivered: 0 pcs</text>
        <text id="timer-sub-txt" x="691" y="219" text-anchor="middle" fill="#d97706" font-family="JetBrains Mono, monospace" font-size="8" font-weight="600">T0: 0 / 1500 ms</text>
      </g>

      <!-- Industrial Stack Light Tower (x=780) -->
      <g id="stack-tower" filter="url(#soft-shadow)">
        <rect x="786" y="128" width="8" height="100" fill="#64748b" />
        <rect x="772" y="222" width="36" height="6" rx="2" fill="#334155" />
        <!-- Tower Housing -->
        <rect x="772" y="50" width="36" height="78" rx="5" fill="#ffffff" stroke="#94a3b8" stroke-width="1.5" />
        <!-- Red/Amber Lamp Q0.3 -->
        <rect id="tower-q03" x="776" y="55" width="28" height="30" rx="3" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1" />
        <text x="790" y="73" text-anchor="middle" fill="#475569" font-family="JetBrains Mono, monospace" font-size="7.5" font-weight="700">Q0.3</text>
        <!-- Green Lamp Q0.2 -->
        <rect id="tower-q02" x="776" y="92" width="28" height="30" rx="3" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1" />
        <text x="790" y="110" text-anchor="middle" fill="#475569" font-family="JetBrains Mono, monospace" font-size="7.5" font-weight="700">Q0.2</text>
      </g>
    `;

    this.boxesLayer = this.svg.querySelector('#boxes-layer');
    this.pistonAssembly = this.svg.querySelector('#piston-assembly');
    this.stamperPad = this.svg.querySelector('#stamper-pad');
    this.sensorLaser = this.svg.querySelector('#sensor-laser');
    this.sensorLed = this.svg.querySelector('#sensor-led');
    this.rollerLeft = this.svg.querySelector('#roller-left');
    this.rollerRight = this.svg.querySelector('#roller-right');
    this.motorBadgeBg = this.svg.querySelector('#motor-badge-bg');
    this.motorBadgeTxt = this.svg.querySelector('#motor-badge-txt');
    this.crateCountTxt = this.svg.querySelector('#crate-count-txt');
    this.crateSubTxt = this.svg.querySelector('#crate-sub-txt');
    this.timerSubTxt = this.svg.querySelector('#timer-sub-txt');
    this.towerQ02 = this.svg.querySelector('#tower-q02');
    this.towerQ03 = this.svg.querySelector('#tower-q03');
  }

  render() {
    const q00 = this.plc.getBit('Q0.0');
    const q01 = this.plc.getBit('Q0.1');
    const q02 = this.plc.getBit('Q0.2');
    const q03 = this.plc.getBit('Q0.3');
    const i02 = this.plc.getBit('I0.2');

    // 1. Rollers rotation & Motor status badge
    this.rollerLeft.setAttribute('transform', `translate(84, 166) rotate(${this.plant.rollerAngle})`);
    this.rollerRight.setAttribute('transform', `translate(606, 166) rotate(${this.plant.rollerAngle})`);

    if (q00) {
      this.motorBadgeBg.setAttribute('fill', '#ecfdf5');
      this.motorBadgeBg.setAttribute('stroke', '#10b981');
      this.motorBadgeTxt.setAttribute('fill', '#059669');
      this.motorBadgeTxt.textContent = 'Q0.0 MOTOR: RUNNING';
    } else {
      this.motorBadgeBg.setAttribute('fill', '#f1f5f9');
      this.motorBadgeBg.setAttribute('stroke', '#cbd5e1');
      this.motorBadgeTxt.setAttribute('fill', '#64748b');
      this.motorBadgeTxt.textContent = 'Q0.0 MOTOR: STOPPED';
    }

    // 2. Pneumatic Piston extension (0..26px downward)
    const dy = (this.plant.pistonPos * 25).toFixed(1);
    this.pistonAssembly.setAttribute('transform', `translate(0, ${dy})`);
    this.stamperPad.setAttribute('fill', q01 ? '#10b981' : '#2563eb');

    // 3. Photoelectric Sensor Beam
    if (i02) {
      this.sensorLaser.setAttribute('stroke', '#10b981');
      this.sensorLaser.setAttribute('stroke-width', '3');
      this.sensorLed.setAttribute('fill', '#10b981');
    } else {
      this.sensorLaser.setAttribute('stroke', '#ef4444');
      this.sensorLaser.setAttribute('stroke-width', '1.8');
      this.sensorLed.setAttribute('fill', '#64748b');
    }

    // 4. Render moving packages
    let boxesHtml = '';
    for (const b of this.plant.boxes) {
      const y = 154 - b.height;
      const fillUrl = b.stamped ? 'url(#box-stamped-grad)' : 'url(#box-grad)';
      const strokeCol = b.stamped ? '#047857' : '#b45309';
      const label = b.stamped ? '✓ QC OK' : `BOX #${b.id}`;
      boxesHtml += `
        <g transform="translate(${b.x.toFixed(1)}, ${y})" filter="url(#soft-shadow)">
          <rect x="0" y="0" width="${b.width}" height="${b.height}" rx="4" fill="${fillUrl}" stroke="${strokeCol}" stroke-width="1.4" />
          <rect x="5" y="10" width="${b.width - 10}" height="15" rx="2" fill="rgba(255,255,255,0.9)" />
          <text x="${b.width / 2}" y="20" text-anchor="middle" fill="#0f172a" font-family="JetBrains Mono, monospace" font-size="7.2" font-weight="700">${label}</text>
        </g>
      `;
    }
    this.boxesLayer.innerHTML = boxesHtml;

    // 5. Update Counter & Timer Readouts in Crate Box
    const c0 = this.plc.counters['C0'] || { cv: 0, pv: 5 };
    const t0 = this.plc.timers['T0'] || { et: 0, pt: 1500 };
    this.crateCountTxt.textContent = `${c0.cv} / ${c0.pv}`;
    this.crateSubTxt.textContent = `Delivered: ${this.plant.deliveredCount} | Stamped: ${this.plant.stampedCount}`;
    this.timerSubTxt.textContent = `T0: ${Math.round(t0.et)} / ${t0.pt} ms`;

    // 6. Update Stack Light Tower (Q0.2 Green, Q0.3 Amber/Red)
    if (q02) {
      this.towerQ02.setAttribute('fill', '#10b981');
      this.towerQ02.setAttribute('stroke', '#059669');
    } else {
      this.towerQ02.setAttribute('fill', '#f1f5f9');
      this.towerQ02.setAttribute('stroke', '#cbd5e1');
    }

    if (q03) {
      this.towerQ03.setAttribute('fill', '#f59e0b');
      this.towerQ03.setAttribute('stroke', '#d97706');
    } else {
      this.towerQ03.setAttribute('fill', '#f1f5f9');
      this.towerQ03.setAttribute('stroke', '#cbd5e1');
    }
  }
}
