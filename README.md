# LadderLab — Industrial PLC Ladder Logic & Smart Factory SCADA Simulator

> An interactive IEC 61131-3 Programmable Logic Controller (PLC) scan-cycle simulator, online power-flow ladder diagram editor, and 2D smart factory SCADA plant built in a clean, minimalist white aesthetic.

[![Tests](https://img.shields.io/badge/tests-passing-brightgreen.svg)]()
[![Standard](https://img.shields.io/badge/PLC-IEC%2061131--3-2563eb.svg)]()
[![Zero Dependencies](https://img.shields.io/badge/dependencies-vanilla%20JS%2FSVG-10b981.svg)]()

---

## ⚡ Key Engineering Features

1. **Deterministic 50Hz PLC Scan Cycle (`PLCEngine`)**:
   - Evaluates Input Image Table (`I0.0` – `I0.3`), Internal Markers (`M0.0`), On-Delay Timers (`TON T0`), Up-Counters (`CTU C0`), and Physical Outputs (`Q0.0` – `Q0.3`).
   - Supports series contacts (`NO`, `NC`), parallel latching branches (`Seal-In OR`), and output coils (`OUT`, `SET`, `RST`, `TON`, `CTU`, `RES`).
2. **Live Online Power-Flow Monitoring**:
   - Energized conductors, contacts, and coils dynamically illuminate in emerald green (`#10B981`) during real-time execution.
3. **2D Closed-Loop Smart Factory SCADA View**:
   - Animated conveyor drive motor (`Q0.0`), moving packages, optical photoelectric sensor (`I0.2`), pneumatic stamping cylinder (`Q0.1`), and industrial stack light tower (`Q0.2`, `Q0.3`).
4. **Sandbox Behavioral Validator**:
   - Validates user ladder logic by running real input/output test vectors against a sandboxed PLC instance rather than static text matching.

---

## 🏭 Included Industrial Automation Missions

| Mission | Title | Core Automation Concepts |
| :--- | :--- | :--- |
| **01** | **DOL Motor Latching & Overload Interlock** | Momentary Start pushbutton (`I0.0`), parallel seal-in contact (`Q0.0`), Stop interlock (`NC I0.1`), and thermal overload cutoff (`I0.3`). |
| **02** | **Automated Sensor Stamping & Timer (`TON`)** | Photoelectric package detection (`I0.2`), conveyor pause interlock (`NC Q0.1`), and timed pneumatic stamping (`TON T0 = 1500 ms`). |
| **03** | **Automated Batch Counter & Crate Limiter (`CTU`)** | Rising-edge package counting (`CTU C0, PV = 5`), automatic batch cutoff (`NC C0`), and batch-full signaling (`Q0.3`). |

---

## 🧪 Running Automated Verification Suite

```bash
node tests/test_plc_engine.js
```
