/**
 * LadderLab — 2D Smart Factory Plant & Kinematics Simulator
 * Models conveyor dynamics, package spawning, photoelectric sensor beams,
 * pneumatic stamping cylinder actuation, and operator control station.
 */

class FactoryPlant {
  constructor(plc) {
    this.plc = plc;
    this.missionId = 'mission_01';

    // Conveyor & mechanical state
    this.beltOffset = 0;
    this.rollerAngle = 0;
    this.beltSpeedPxPerSec = 95; // Speed when Q0.0 is ON

    // Pneumatic Cylinder (Q0.1) state: 0.0 (retracted) to 1.0 (fully extended)
    this.pistonPos = 0;
    this.stampedCount = 0;
    this.deliveredCount = 0;

    // Sensor X coordinate on the conveyor track
    this.sensorX = 360;

    // Active packages on the belt
    this.boxes = [];
    this.nextBoxId = 1;
    this.spawnCooldownMs = 0;

    // Momentary pushbutton pulse timers (so quick clicks hold for 450ms)
    this.startPulseRemainingMs = 0;
    this.stopPulseRemainingMs = 0;

    this.resetPlant();
  }

  resetPlant() {
    this.beltOffset = 0;
    this.rollerAngle = 0;
    this.pistonPos = 0;
    this.stampedCount = 0;
    this.deliveredCount = 0;
    this.startPulseRemainingMs = 0;
    this.stopPulseRemainingMs = 0;

    // Spawn initial box ready on the left side of the conveyor
    this.boxes = [
      { id: 1, x: 140, width: 46, height: 36, stamped: false, color: '#D97706' },
      { id: 2, x: 250, width: 46, height: 36, stamped: false, color: '#D97706' }
    ];
    this.nextBoxId = 3;
    this.spawnCooldownMs = 0;

    this.plc.setInput('I0.0', false);
    this.plc.setInput('I0.1', false);
    this.plc.setInput('I0.2', false);
    this.plc.setInput('I0.3', false);
  }

  /**
   * Trigger momentary START button (I0.0)
   */
  triggerStartButton(pressed, withPulse = false) {
    if (withPulse) {
      this.startPulseRemainingMs = 450;
      this.plc.setInput('I0.0', true);
    } else {
      this.plc.setInput('I0.0', pressed);
    }
  }

  /**
   * Trigger momentary STOP button (I0.1)
   */
  triggerStopButton(pressed, withPulse = false) {
    if (withPulse) {
      this.stopPulseRemainingMs = 450;
      this.plc.setInput('I0.1', true);
    } else {
      this.plc.setInput('I0.1', pressed);
    }
  }

  /**
   * Toggle Thermal Overload Fault (I0.3)
   */
  toggleOverloadFault() {
    const current = this.plc.getBit('I0.3');
    this.plc.setInput('I0.3', !current);
    return !current;
  }

  /**
   * Manually spawn a package at the feeder entry
   */
  spawnBox() {
    const tooClose = this.boxes.some(b => b.x < 155);
    if (tooClose) return false;
    this.boxes.push({
      id: this.nextBoxId++,
      x: 75,
      width: 46,
      height: 36,
      stamped: false,
      color: '#D97706'
    });
    return true;
  }

  /**
   * Step plant physics forward by dtMs
   */
  update(dtMs) {
    const dtSec = dtMs / 1000;

    // 1. Handle momentary button pulse decay
    if (this.startPulseRemainingMs > 0) {
      this.startPulseRemainingMs -= dtMs;
      if (this.startPulseRemainingMs <= 0) {
        this.startPulseRemainingMs = 0;
        this.plc.setInput('I0.0', false);
      }
    }
    if (this.stopPulseRemainingMs > 0) {
      this.stopPulseRemainingMs -= dtMs;
      if (this.stopPulseRemainingMs <= 0) {
        this.stopPulseRemainingMs = 0;
        this.plc.setInput('I0.1', false);
      }
    }

    // 2. Read PLC Outputs
    const motorOn = this.plc.getBit('Q0.0');
    const cylinderOn = this.plc.getBit('Q0.1');

    // 3. Animate Pneumatic Cylinder (Q0.1)
    if (cylinderOn) {
      this.pistonPos = Math.min(1, this.pistonPos + dtSec * 4.5);
    } else {
      this.pistonPos = Math.max(0, this.pistonPos - dtSec * 4.5);
    }

    // 4. Move Conveyor & Boxes if Motor Q0.0 is energized
    if (motorOn) {
      const dx = this.beltSpeedPxPerSec * dtSec;
      this.beltOffset = (this.beltOffset + dx) % 24;
      this.rollerAngle = (this.rollerAngle + dx * 3.5) % 360;

      for (const box of this.boxes) {
        box.x += dx;
      }

      // Auto-spawn new boxes periodically while conveyor runs
      this.spawnCooldownMs -= dtMs;
      if (this.spawnCooldownMs <= 0) {
        if (this.spawnBox()) {
          this.spawnCooldownMs = 1550;
        }
      }
    }

    // 5. Evaluate Photoelectric Sensor (I0.2) & Stamping Interaction
    let sensorBeamBlocked = false;
    const t0Done = this.plc.getBit('T0');

    for (const box of this.boxes) {
      const boxCenter = box.x + box.width / 2;
      const inSensorZone = Math.abs(boxCenter - this.sensorX) <= 20;

      if (inSensorZone) {
        // If piston is fully extended onto the box and timer T0 is done (or in M1/M3), mark stamped
        if (this.pistonPos > 0.7 && (t0Done || this.missionId !== 'mission_02')) {
          if (!box.stamped) {
            box.stamped = true;
            this.stampedCount++;
          }
        }

        // In Mission 02, once a box is stamped (QC OK), sensor clears so conveyor moves it out
        if (this.missionId === 'mission_02') {
          if (!box.stamped) {
            sensorBeamBlocked = true;
          }
        } else {
          sensorBeamBlocked = true;
        }
      }
    }

    this.plc.setInput('I0.2', sensorBeamBlocked);

    // 6. Remove boxes that reached the exit chute (x > 615)
    const beforeLen = this.boxes.length;
    this.boxes = this.boxes.filter(b => {
      if (b.x > 605) {
        this.deliveredCount++;
        return false;
      }
      return true;
    });
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FactoryPlant };
}
