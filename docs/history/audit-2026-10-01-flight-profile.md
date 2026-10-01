# Flight-profile method audit, 2026-10-01

Steps 1–3 of [FLIGHT-PROFILE-METHOD.md](../FLIGHT-PROFILE-METHOD.md) (data closed against the published gross mass, propulsion against published figures and traces, events and cut-off logic) applied to eight vehicles by eight independent auditors, then one critic over all of them. The reports are as the auditors returned them, condensed; *proposals* are proposals, not changes. What was applied is listed under each vehicle and in [VALIDATION.md](../VALIDATION.md) §1, "Fitted and derived values".

Dated record: where it disagrees with the documents above, the documents above are right.

## Saturn V (AS-506) (`saturnv506`)

**Tier.** A

**Cut-off logic.** How each stage really stops (FER MPR-SAT-FE-69-9), compared with the model:  (1) S-IC CECO: commanded by an IU timer at 135.20 s 'as planned' (§5.1, §5.4, Table 2-2 #19). The model has engineEvents shutdown [4] at 137.7 s after its T−2.5 s ignition, i.e. 135.20 s. Correct, and an input.  (2) S-IC OECO: 'initiated by LOX low level sensors' at 161.63 s, 0.55 s later than predicted (3σ ±3.74 s). The FER puts the lateness down to lower Isp and propellant loads. 18,041 kg of LOX and 13,954 kg of RP-1 were left at OECO (§5.1, §5.5, Table 5-2). This is a depletion-type cut-off, and the model also cuts off at depletion. But the model's load (2,053,900 kg) is held to the clock: standard-condition flow × the published times, the 'construction' the method forbids. With the published load (Table 5-2 less the OECO residual and the kept GOX) and the in-flight flow (Fig. 5-3), OECO becomes a prediction: 161.40 s measured (−0.23 s).  (3) S-II CECO: an IU command at ESC+297.58 s (460.62 s) to avoid pogo (§6.3). In flight it is referenced to time base 3, which starts at OECO. The model's engineEvents are referenced to S-II ignition, which follows OECO, so the structure is right. Correct, and an input.  (4) S-II EMR shift (5.5 → about 4.3): on AS-506 the IU command was triggered by a preprogrammed stage characteristic velocity (on AS-505 it was a timer). The command came at 494.8 s (ESC+331.8), the shift at about 498.0 s. That was 9.5 s later than the propulsion prediction: 5.5 s from an LVDC scaling error and 3.5 s from a known presetting mismatch (§6.1, §6.5, §10.2.1, Table 2-2 #40–41). The model has a timed event at 335 s after ignition (498.0 s). That is right as a flight-specific input, though structurally it was a velocity trigger.  (5) S-II OECO: 'initiated by the stage LOX low level sensors' plus a 1.5 s delay timer, so depletion-type. 3,388 kg was left at the signal (816 LOX + 2,572 LH2; 2,623 kg predicted). The burn was 4.0 s shorter than predicted (548.22 s against 551.7 s nominal) (§6.1, §6.4, §6.5). The model depletes the whole loaded mass (442,530 kg) from ESC at full flow, with zero residual and the 3.2 s build-up at full flow. The two cancel on the clock (548.51 s, +0.3 s), but the stage hands over 52 m/s fast. With usable = Table 6-2's loaded mass less the residual, starting at the mainstage-equivalent time, the cut-off is a prediction: 548.09 s (−0.13 s).  (6) S-IVB first cut-off: 'initiated at 699.34 seconds by a guidance velocity cutoff command' (§7.4), so commanded. The model's closed loop cuts off on reaching the target orbit, which is the same structure. The time is a prediction: 692.69 s today (−6.6 s, the cost of the fast S-II) and 698.63 s with the proposed data (−0.7 s). The second burn (TLI) is also a guidance cut-off, at 10,203.07 s; it is outside this audit.

**Guidance structure.** What is published about the steering:  The S-IC flies an open-loop, time-based tilt programme from the LVDC: a four-segment polynomial in time from time base 1 (D5-15551(I)-7 §3.4; NASSP). It is designed to give 'a near zero lift trajectory through the atmosphere' (TIS AS-506). The sequence: - yaw manoeuvre 1.7–9.7 s; - pitch and roll from 13.2 s; - roll complete 31.1 s; - tilt arrest at 160.0 s, the attitude then frozen in inertial space through staging; - IGM phase 1 from 204.1 s (T3+42.4 s), with a pitch-up transient at initiation; - IGM phase 2 and artificial tau at the EMR shift (494.8–504.2 s); - chi-bar steering near the end, then the guidance velocity cut-off at 699.34 s. (FER Table 2-2, §11.1.)  AS-506's own commanded pitch is published as plots, not as a table. FER Fig. 11-1 covers the S-IC burn on a fine scale (20° a division): commanded and actual attitude, pitch error, pitch rate and engine angle. FER Fig. 10-4 covers 0–700 s on a coarse scale; its arrest at about −69.5° agrees with Fig. 11-1. The tabulated AS-506 programme is MFT-1-69, the operational trajectory, which was not found online. The AS-507 G-mission operational trajectory (D5-15551(I)-7, Table 4-III) tabulates chi for a sibling flight; it runs 2–3° less tilted than AS-506 after 110 s and is not AS-506's.  Digitised from Fig. 11-1, in the platform frame (chi, deg): 20 s −1.6; 30 −4.3; 40 −8.8; 50 −15.0; 60 −21.3; 70 −29.7; 80 −36.9; 90 −43.2; 100 −48.7; 110 −54.2; 120 −57.8; 130 ≈−62; 135 −63.8; 140 −64.6; 150 −67.4; 160 −69.6, then held. Converted to pitch above the local horizon by adding two terms: the range angle from D5-15560-6, and the Earth's rotation since guidance reference release in the flight plane, 0.003495°/s × (t+17).  The conversion checks against D5-15560-6's Earth-fixed flight-path angle. Attitude minus flight-path angle stays between −1.3° and +0.6° from 20 to 160 s, consistent with FER Table 11-2 (at most 1.6° at high q, with winds). Digitisation uncertainty is about ±0.5°.  What the model does instead: a vertical rise, a 3° kick, then a zero-angle gravity turn along the air-relative velocity limited to 0.5°/s, until closedLoopStart = 204.1 s. Then its own closed loop steers into the flown plane. The six-DOF uses a 3° kick over 12 s from 50 m and 0.5°/s. The register lists these as fitted ('the S-IC hands over at the flown state').  Measured in the point mass, this departs from the flight in two ways: 1. From 40 to 120 s the 0.5°/s limit, below the ~0.7°/s the flight pitched at per Fig. 11-1's rate panel, holds the nose 3.5–5.9° above the Earth-relative velocity. q·α reaches about 120 kPa·deg at 60–100 s; the flown peak was 1.6°. 2. After 160 s the model keeps turning with the velocity. Its local pitch is 16.8° at 204 s, where the tilt-arrested vehicle held about 22.9°.  A stored programme would replace a fitted value. The pitchProgram table in proposedChanges is an input, not a fit: it replaces the fitted kick and turn rate in both flight models. Its last point (204.1 s) is the published IGM start, which takes the place of closedLoopStart. Flown in the point mass with the proposed S-IC and S-II data and no fitted scalar, it gives: - OECO at 65.8 km and 18.6° space-fixed, against 66.1 km and 19.1° flown; - S-II CECO at 179.8 km, 5,705.8 m/s and 0.85°, against 180.2 km, 5,707.5 m/s and 0.90°; - \|α\| ≤ 1.7° while q > 2 kPa.  The remaining bias, Earth-relative flight-path angle 0.6–1.4° below the flown from 30 s on, is inside the digitisation uncertainty. The programme was not flown in six-DOF.  After IGM starts, the model's closed loop pitches to about 35° local at 220 s. Converting Fig. 10-4's ≈−63.5° gives about 29°. That is step 5+ territory and is noted only.

**Sources.**

- Saturn V Launch Vehicle Flight Evaluation Report AS-506 Apollo 11 Mission, MPR-SAT-FE-69-9 (MSFC, 20 Sep 1969) — https://ibiblio.org/apollo/Documents/lvfea-AS506-Apollo11.pdf (read): Inputs: Table 2-2 (event times and how each was commanded), Table 5-1 (F-1, standard conditions, 35–38 s), Table 5-2 (S-IC propellant history), Fig. 5-3 (S-IC thrust, flow and Isp in flight), §6 text and Table 6-1 (J-2 on the S-II, ESC+61 s), Table 6-2 (S-II propellant), Fig. 6-3 (S-II thrust, flow and Isp, including after the EMR shift), Table 7-1 (S-IVB first burn), Table 20-9 (flight-sequence mass summary), Fig. 11-1 (S-IC commanded and actual pitch attitude, 0–162 s). Checks: Table 4-1 (max Q 35.2 kPa at 83.0 s and 13.6 km; max accelerations 3.94 g, 17.99 and 6.73 m/s²), Table 4-2 (state at CECO, OECO, S-II CECO/OECO and S-IVB cut-off), Fig. 10-4 (pitch command 0–700 s, coarse), Table 11-2 (largest angle of attack at high q: 1.6° pitch).
- Boeing D5-15560-6, Apollo/Saturn V Postflight Trajectory – AS-506 (6 Oct 1969) — https://www.ibiblio.org/apollo/Documents/19920075301.pdf (read): Check: Table B-III (altitude, Earth-fixed speed and flight-path angle, surface range every 1–2 s through the ascent). Derived: the surface range used to convert Fig. 11-1's platform-frame pitch to pitch above the local horizon. It cites MFT-1-69, the AS-506 operational trajectory.
- Boeing D5-15551(I)-7, Saturn V AS-507 'G' Mission Launch Vehicle Operational Flight Trajectory, September launch month (13 Jun 1969) — https://www.ibiblio.org/apollo/Documents/19700072469.pdf (read): Structure only: §3.4 says a four-segment, open-loop tilt polynomial gives the S-IC pitch, tilt arrest starts about 158 s after first motion and lasts until S-II IGM starts. Its Table 4-III (minor-loop chi commands) is for another vehicle, flight and wind season (2–3° less tilt than AS-506 late in the S-IC burn), so it is not used as data.
- MSFC Technical Information Summary, Apollo-11 (AS-506) Apollo Saturn V Space Vehicle, SE-ASTR-S-101-69 — https://www.ibiblio.org/apollo/Documents/19700011707_1970011707.pdf (read): Structure: 'a first stage tilt attitude program which gives a near zero lift trajectory'; IGM steering on the S-II and S-IVB.
- NASA MFT-1-69, AS-506 G Mission Launch Vehicle Operational Trajectory (14 Jul 1969) (not opened): Would hold AS-506's own tabulated tilt polynomial and chi commands. Not found online; only cited in the references of D5-15560-6.
- Saturn V Flight Manual SA-506 (MSFC-MAN-506) (not opened): Named in the task as a source for the tilt programme. Not found: ibiblio has MSFC-MAN-503, the SA-504 manual and MSFC-MAN-507 only.
- NASA SP-4029 (Saturn V flight evaluation summary tables) (not opened): Cited by the repo for the stage masses. Not opened: the FER tables it summarises were read directly.
- NASSP wiki, Launch Vehicle Digital Computer — https://nassp.space/index.php/Launch_Vehicle_Digital_Computer (read): None: it confirms the four-segment time polynomial (F[x][y]) but gives no AS-506 coefficients.
- ibiblio Virtual AGC document index — https://www.ibiblio.org/apollo/links.html (read): Used only to find the documents above.

**Mass budget.**

| part | published | model | closes |
| --- | --- | --- | --- |
| S-IC stage | FER Table 20-9: 2,278,688 kg = 130,423 dry + 2,145,798 RP-1/LOX + 2,468 other. Table 5-2 (reconstructed): 2,106,424 kg propellant at hold-down release (LOX 1,468,594 + RP-1 637,830); 31,995 kg left at OECO (18,041 + 13,954); 28,356 kg left at separation. S-IC stage at separation 164,381 kg (so about 3,134 kg of GOX pressurant is kept aboard). Build-up to hold-down release used 39,307–39,374 kg; outboard thrust decay used 3,634 kg. | dryMass 152,250 + propellantMass 2,053,900 = 2,206,150 kg. Measured: 27.2 t burned on the pad from T−2.5 s, 813.7 t stack at T+161.7 s. | no |
| S-IC/S-II interstage | FER Table 20-9: 5,206 kg = small ring 614 (stays with the S-IC) + large ring 3,982 (dropped at 192.3 s) + 609 kg of ullage-motor propellant, all burned by S-II ignition (162.1–166.1 s) | Small ring counted in S-IC dry (per the comment). The large ring is dropped at 192.3 s as 4,591 kg, which includes the 609 kg of ullage propellant. | yes |
| S-II stage (+ large ring + S-II/S-IVB interstage) | FER Table 20-9: S-II 479,964 kg = 36,158 dry + 443,236 LOX/LH2 + 572 other, plus ring 3,982 + 609 and S-II/S-IVB interstage 3,663 (3,180 dry + 484 retro propellant), total 488,218 kg. Table 6-2: loaded at ESC 442,393 kg (LOX 370,778 + LH2 71,615); residual at the OECO signal 3,388 kg (816 + 2,572; tanks only). Table 20-9 consumption: build-up 582 + start tank 11 + mainstage and venting 435,499 + decay 49 = 436,141 kg. S-II at separation 43,436 kg. | dryMass 45,654 + propellantMass 442,530 = 488,184 kg. Ignition at ESC (163.04 s) at full flow after a 1 s ramp. Burns to depletion at 548.51 s. | yes |
| S-IVB stage + IU | FER Table 20-9: S-IVB 119,119 kg (11,273 dry + 107,095 LOX/LH2 + 751 other) + IU 1,939 = 121,058 kg. First burn used 31,419 kg (lead 23, build-up 163, mainstage 31,152, decay 81); the coast lost 1,053 kg; TLI used 70,921 kg; 2,559 kg of propellant was left at spacecraft separation. | dryMass 15,758 + propellantMass 105,300 = 121,058 kg (1,795 kg of the load counted as dry, 'the two burns use 105.3 t') | yes |
| Spacecraft (CSM + LM + SLA + LES) | SP-4029 / FER Table 20-9: 28,806 + 15,095 + 1,792 + 4,042 = 49,735 kg; LES jettisoned at 197.9 s | payloadMass 49,735; tower 4,042 kg dropped at T+197.87 s | yes |
| Stack at liftoff | FER Table 20-9: 2,938,315 kg at ignition; 2,899,008 kg at hold-down arm release (first motion T+0.3 s) | 2,837.9 t at T0 (measured). With the proposed S-IC and S-II data: 2,898.9 t. | no |

**Proposals.**

| target | from | to | role | confidence | source |
| --- | --- | --- | --- | --- | --- |
| F1_AS506.thrustSL | 6719 * kN | 6886.2 * kN | derived | medium | FER MPR-SAT-FE-69-9 Table 5-1, 5-2, 2-2, 20-9, Fig. 5-3 |
| F1_AS506.thrustVac | 7722 * kN | 7914.6 * kN | derived | medium | FER Fig. 5-3 |
| saturnv506 stages[0] (sic506).propellantMass | 2053900 | 2102829 | derived | medium | FER Table 5-2, Table 20-9; probe tests/_probe/saturnv506-audit.test.ts |
| saturnv506 stages[0] (sic506).dryMass | 152250 | 164995 | input | high | FER Table 20-9 |
| saturnv506 stages[1] (sii506).propellantMass | 442530 | 439005 | input | medium | FER Table 6-2, §6.5; Table 20-9 |
| saturnv506 stages[1] (sii506).dryMass | 45654 | 49179 | derived | medium | FER Table 20-9 |
| saturnv506 stages[1] (sii506).ignitionDelay | 0.74 | 3.42 | derived | medium | FER Table 2-2, Table 20-9, §6.2 |
| saturnv506 stages[1] (sii506).engineEvents and jettisons (re-referenced to the new ignition) | engineEvents [{t: 297.58, shutdown: [4]}, {t: 335, mixture: …}]; jettisons [{t: 29.26, mass: 4591, part: 'interstage'}, {t: 34.86, mass: 4042, part: 'tower'}] | engineEvents [{t: 294.90, shutdown: [4]}, {t: 332.28, mixture: …}]; jettisons [{t: 26.58, …interstage}, {t: 32.18, …tower}] | input | medium | FER Table 2-2 |
| saturnv506 stages[1] (sii506) engineEvents mixture.ispVac (role and comment) | 427 (comment: 'the J-2's rating at that ratio; estimated') | 427 (input: FER Fig. 6-3 stage Isp ≈4.19×10³ N·s/kg after the shift) | input | medium | FER §6.3, Fig. 6-3 |
| saturnv506.guidanceDefaults.pitchProgram (new; flown in both models) | none (kickAngle 3, maxTurnRate 0.5, closedLoopStart 204.1; six-DOF kick 3° in 12 s from 50 m, 0.5 °/s) | [[0,90],[13.2,90],[20,88.53],[30,85.86],[40,81.40],[50,75.24],[60,68.98],[70,60.63],[80,53.48],[90,47.25],[100,41.83],[110,36.42],[120,32.93],[130,28.87],[135,27.15],[140,26.44],[150,23.82],[160,21.83],[180,22.30],[204.1,22.90]] | input | medium | FER Fig. 11-1, Fig. 10-4, Table 2-2; D5-15560-6 Table B-III |
| §1 'Fitted and derived values', Saturn V rows | \| Saturn V \| kick 3° at 0.5 °/s \| fitted \| the S-IC hands over at the flown state (PHYSICS.md §13.8) \| — \| 2026-09 \| | Retire the kick row (kept as the operator's pitch-over). Add these rows: S-IC programme (input, FER Fig. 11-1 digitised ±0.5°, frame conversion derived); F-1 flow 2,654.8 kg/s (derived, Table 5-2/2-2/20-9, checked against Fig. 5-3); S-IC load 2,102,829 kg (derived; pad term measured); S-II usable 43 | construction | high | docs/FLIGHT-PROFILE-METHOD.md |
| §13.8 Apollo 11 on the Saturn V: S-IC mass and F-1 wording | 'so the stack weighs 2,838 t at liftoff, about what flew (2,938 t at ignition), and 825 t at the S-IC's cut-off (827.3 t flown)'; 'F-1 \| 6,719 kN, 264.5 s at sea level (flight average)' | Measured today: 2,837.9 t at T0 against 2,899.0 t at first motion; 813.7 t at T+161.7 s against 827.3 t at OECO. F-1 6,719 kN is FER Table 5-1 at standard inlet conditions (35–38 s), not the flight average; in flight 2,644→2,688 kg/s an engine (Fig. 5-3). | input | high | FER; probe |
| Apollo 11 point-mass pin at T+200 s | expect(sim.state.ascentPhase).toBe('gravityTurn') | expect(sim.state.ascentPhase).toBe('pitchProgram') | construction | high | — |
| saturnv506 stages[1] jettisons[0].mass (ring) | 4591 | 3982 | input | low | FER Table 20-9, Table 2-2 #26, #30 |
| J2_SIVB.thrustSL and the S-II mixture thrustSL (vacuumOnly placeholders) | J2_SIVB thrustSL 426 * kN; mixture thrustSL 364 * kN | J2_SIVB thrustSL 420.4 * kN; mixture thrustSL 361.0 * kN | derived | low | arithmetic |
| saturnv506 stages[2] (sivb506).propellantMass / dryMass | 105300 / 15758 | 107095 / 13963 | input | low | FER Table 20-9, §7.4 |

**Disagreements to pin.**

- Max Q comes 7 s early, and with the published programme 2 kPa low: 75.7 s, 33.2 kPa, 11 km in the model against 83.0 s, 35.2 kPa, 13.6 km flown (FER Table 4-1). The model's state at 80 s matches the flight (12.6 km and 477 m/s against 12.8 km and 466 m/s), so the cause is the day's measured atmosphere and winds (the FER used met data to 56 km) against the model's standard atmosphere. It is not the trajectory.
- The Earth-relative flight-path angle through the S-IC burn is 0.6–1.4° below the flown (D5-15560-6 Table B-III) from 30 s on, and OECO is 0.3 km low. This is inside the digitisation uncertainty of FER Fig. 11-1 (±0.5°). A ×0.99 scale on the departure from vertical would remove it, but that would be a fit; leave it unfitted.
- The FER gives two readings of S-II consumption: Table 6-2 (flowmeter) 439,005 kg and Table 20-9 (mass summary) 436,141 kg. The 2.9 t (0.66 %) moves S-II OECO −4.3 s and the S-IVB cut-off +7 s (measured).
- S-II cut-off altitude 183.7 km against 187.3 km flown, and flight-path angle 0.12° against 0.61°. This is the model's own closed loop, not the flown IGM: at 220 s it pitches to about 35° local against about 29° from FER Fig. 10-4.
- The S-IC thrust varies in flight (34.35 → 40.05 MN with the rising pump inlet pressure and altitude). A constant-flow F-1 is 0.2 % high at liftoff and 1.2 % low before CECO.
- The S-IC's outboard cut-off impulse (10.6 MN·s, 11 % above predicted, FER §5.4) is not modelled beyond the generic 0.25 s tail-off.
- Liftoff is at T+0.0 in the model against first motion at T+0.3 s (TB1 0.6 s). Time base 3 events (S-II CECO, ring, LES, IGM) are referenced to OECO in flight, but the 204.1 s hand-over is absolute in the model.
- The S-II EMR shift is a timed event in the model. On AS-506 it was a characteristic-velocity trigger that fired 9.5 s late because of an LVDC scaling error (FER §10.2.1).
- The 609 kg of ullage-motor propellant is carried on the ring until 192.3 s; it was burned by 166.1 s.
- The current data's S-IVB cut-off is 6.6 s early (692.69 against 699.34 s) because the S-II hands over 52 m/s fast (6,968 against 6,916 m/s). With the proposed data it is −0.7 s.

**Open questions.**

- Can MFT-1-69 (the AS-506 G Mission LV Operational Trajectory, 14 Jul 1969), with AS-506's own tilt polynomial coefficients or chi table, be found (NTRS, the UAH archives)? It would replace the ±0.5° digitisation of FER Fig. 11-1.
- The SA-506 Flight Manual (MSFC-MAN-506), named as a tilt-programme source, was not found. Does it tabulate the programme, or only describe it as the SA-503 and SA-507 manuals do?
- Six-DOF flyability of the published programme (α, q·α, body rate, aerodynamic table) was not flown here, by instruction. The six-DOF guidance defaults (3° kick in 12 s from 50 m, 0.5 °/s) are also fitted and would be retired along with the point-mass kick.
- Should the S-II EMR shift be modelled as a characteristic-velocity trigger, as AS-506 flew it? The flown time already includes the LVDC scaling error.
- Should closedLoopStart and the programme's end be referenced to OECO (time base 3 + 42.4 s), as the LVDC did, rather than to absolute range time?
- Should the fleet 'saturnv' (parts.ts 'sic', 'sii', 'sivb', 'f1', 'j2', which use rounded en.wikipedia masses, e.g. S-IVB 109 t against FER 107,095 kg) take the same FER figures, or stay a generic rounded vehicle?
- Should the S-IVB's 1,795 kg 'unusable' stay as an estimate, or should the full 107,095 kg load be carried with the TLI leftover predicted against the FER's 2,559 kg?

## Vostok-K (8K72K) (`vostok8k72k`)

**Tier.** B (times only). Published: times at four events (strap-ons T+119 s, fairing T+156 s, core cut-off T+300 s, Blok E cut-off or spacecraft separation near T+666 to 676 s) and the orbit. There is one speed, "5.5 km/s" at core cut-off (Gerchik via Zak), and its frame is not stated. No heights are published along the ascent, so no trajectory fit is allowed. Steps 1 to 3 apply; the guidance stays generic and is labelled as generic.

**Cut-off logic.** STRAP-ONS: not found for the 8K72K. What is published is the engine side only. The 8D74's shutdown is staged: intermediate-1 with the verniers stopped, then off 1 s later (lpre.de cyclogram of the 8D74/8D75; 8D74K 'shut down through the first intermediate stage'). Sputnik's 8D74PS stepped to intermediate-1 at 100 s. What issues the 1961 command (apparent velocity as on Soyuz-2 per Andrienko, a timer, or a depletion sensor) was not found. Measured: with Energomash's flow (326.1 kg/s) and astronautix's lumped 39,590 kg, the strap-ons run dry at T+119.1 s, on the flown T+119 s separation. A commanded cut-off at T+118.6 s would leave 212 kg each. Any peroxide, nitrogen or residuals inside the 39,590 kg would turn that into a negative reserve. Model: both entries run to depletion, then a 1 s delay (unsourced). CORE (Blok A): commanded. The primary cut-off is the radio range-control system's preliminary and main commands, issued at the computed velocity and coordinates. The backup is the autonomous apparent-velocity integrator (Chertok vol. III, on the R-7/R-7A radio control). On Vostok 1 the radio command was never issued (failed power converter), and the integrator, set above the radio's design velocity, shut the engine down late (Chertok; Zak: about 0.5 s long). The shutdown is staged: main chambers off, then the 8D75 verniers' final stage for 10 s (lpre.de), then Blok E fires through the truss before Blok A separates (Zak). Flown at T+300 s (ESA; Gerchik: separation T+299 s). Model: depletion at T+314.6 s (vostokk, astronautix 912 kN) and T+302.9 s (fleet). With the published engines it runs dry at T+304.6 s. Commanded at T+300 s it leaves 1,545 kg (1.7 %, a prediction close to Soyuz-2.1a's 1.3 %), but Blok E then runs dry suborbital (85 × 170 km). BLOK E: commanded by the control system at the calculated velocity, from its integrator (Zak vostok_lv; Chertok: 'normal shutdown of the third stage from the integrator' on Korabl-Sputnik). The lesson and PHYSICS.md §13.6 say Blok E's radio cut-off failed; per Chertok and Zak it was Blok A's. The 365 s published burn is close to its 368.6 s load, so the flown reserve was small. Model: closed-loop cut-off on the target orbit. The propellant left is a prediction: 452 kg on vostokk (SECO T+657.7 s), 543 kg on the fleet lesson (SECO T+725.0 s).

**Guidance structure.** Published for the family: the R-7 flies its strap-on and core phases on a pitch programme stored before flight (Khorolsky 2011, via the method doc). The R-7A-generation control system (which includes the 8K72K's core and strap-ons, engines 8D74/8D75) is described by Chertok vol. III. It is Pilyugin's autonomous system with lateral stabilisation, apparent-velocity regulation (RKS), tank-emptying control (SOB) and three longitudinal integrators. The radio system kept only range control, issuing the core's preliminary and main cut-off commands. Gagarin's report (via Zak) is qualitative only: a low climb, levelling out by the end of the core burn and then slightly descending. No 8K72K pitch table, shape or state points along the ascent were found. How Blok E was steered (programmed attitude versus closed loop) was not found; it is known only that it cut off on its integrator. The model flies the generic kick and turn on both entries (point mass 3° at 0.3 °/s; six-DOF 4°), then a modern closed loop on Blok E to the target orbit. These are generic, not fitted, and should be labelled so. Soyuz-2.1a's stored programme (Starsem shape advanced 10 s, departure ×1.06, core 16°/10°) must not be borrowed. It is fitted to Soyuz MS flights on different hardware: engines 1021/990 against 1000/941 kN, loads 44.4/99.8 against 43.3/100.4 t, Blok I and a 7 t payload against Blok E and 4.7 t, staging at 118/285 against 119/300 s. The method's shared-hardware exception covers 2.1b, not the 8K72K. The pitchProgram mechanism transfers. A programme for this vehicle would need its own source, and Tier B allows no fit.

**Sources.**

- astronautix.com, Vostok 8K72K (stage gross and empty masses, vehicle-page thrusts and Isp, burn times) — http://www.astronautix.com/v/vostok8k72k.html (read): input: stage masses (strap-on 43,300 / 3,710 kg; core 100,400 / 6,800; Blok E 7,775 / 1,440). Its vehicle-page thrusts (970 / 912 kN) are superseded by its own engine pages and by Energomash
- astronautix.com engine pages: RD-107-8D74-1959, RD-108-8D75-1959, RD-0109 — http://www.astronautix.com/r/rd-107-8d74-1959.html ; http://www.astronautix.com/r/rd-108-8d75-1959.html ; http://www.astronautix.com/r/rd-0109.html (read): check: 996 kN, 313/256 s, Pc 58.6 bar, O/F 2.47; 941 kN, 315/248 s, Pc 51 bar, O/F 2.39; RD-0109 54.52 kN, 324 s, 430 s rated, 121 kg
- lpre.de, 'ЖРД РД-107 и РД-108 и их модификации', Table 1 (parameters of 8D74, 8D75, 8D74K, 8D75K ... after NPO Energomash) and Table 2 (cyclogram of the 8D74 and 8D75), plus the chronology — http://www.lpre.de/energomash/RD-107/index.htm (read): input: 8D74 83/102 tf, 2508/3067 m/s; 8D75 76/96 tf, 2430/3087 m/s. States that the 8K72K flew the base 8D74/8D75 and that the 8D74K/8D75K first flew on the 8K78 in Oct 1960. Staged shutdowns: RD-107 via intermediate-1 for 1 s; 8D75 final (vernier) stage 10 s; RD-107 at main stage only from 6 s after the liftoff contact
- NPO Energomash, RD-107/108 page (2019 archive) — https://web.archive.org/web/20190308003032/http://engine.space/dejatelnost/engines/rd-107-108/ (not opened): primary for the engine figures; read here only through lpre.de's reproduction
- B. Chertok, Rockets and People Vol. III: Hot Days of the Cold War (NASA SP-2009-4110) — https://www.nasa.gov/wp-content/uploads/2015/04/636007main_RocketsPeopleVolume3-ebook.pdf (read): input: cut-off logic. The R-7 core is cut off by the radio range-control preliminary and main commands (velocity and coordinates), with the autonomous integrators as backup (R-7A: Pilyugin system, RKS). On Vostok 1 the radio command was not issued (power converter); the integrator, set above the radio's design velocity, shut down Block A late. Planned orbit 180-230 km. The Blok E shutdown 'from the integrator'
- USSR Central Aero Club, Records File on the first space flight (1961), incl. Coordinating Computation Centre results — https://www.fai.org/sites/default/files/documents/record_file_gagarin_1.pdf (read): input: payload weighed at 4,725 kg (10 Apr 1961); orbit 181 km (±1) × 327 km (±2) 'from the Earth's surface', period '89:34'; liftoff 9:07 Moscow time
- ESA, 'The flight of Vostok 1' — https://www.esa.int/About_Us/50_years_of_ESA/50_years_of_humans_in_space/The_flight_of_Vostok_1 (read): input: event times T+119 s (strap-ons), T+156 s (shroud), T+300 s (core off, final stage ignites), 'T+676 s' (stated with 'final stage shuts down, ten seconds later the spacecraft separates', so ambiguous)
- RussianSpaceWeb (A. Zak), vostok_lv.html — https://www.russianspaceweb.com/vostok_lv.html (read): input: 287 t liftoff (RKK Energia history 1996); fairing 0.8 t, 2.7 m (Chertok, Rakety i Lyudi vol. 2); alternatives: 290.515 t, rocket dry 28.759 t, stage I+II dry 23.560 t, Blok E dry 1.34 t, thrusts in 'kH' that cannot be reconciled; Blok E cut-off by the control system at the calculated velocity
- RussianSpaceWeb (A. Zak), vostok1_launch.html and vostok1_orbit.html — https://www.russianspaceweb.com/vostok1_launch.html ; https://www.russianspaceweb.com/vostok1_orbit.html (read): check: liftoff 09:06:59.7; Stage I separation T+119 s, fairing T+154 s (Gerchik) or T+150 s (Baturin 2008 documents), Stage II separation T+299 s; spacecraft separation 09:18:07 (Lisov) or 09:18:28 (Uspenskaya 2011); the core's main engine fired about 0.5 s long, verniers trimmed to 5.5 km/s; orbits: planned 180 × 230, TASS 175 × 302 / 65°4' / 89.1 min, Pravda 181 × 327, US radar on Blok E 190.6 × 326.2
- J. McDowell, GCAT (satcat.tsv, stages.tsv, engines.tsv) — https://planet4589.org/space/gcat/tsv/cat/satcat.tsv ; https://planet4589.org/space/gcat/tsv/tables/stages.tsv ; https://planet4589.org/space/gcat/tsv/tables/engines.tsv (read): input: Vostok 1 at 168 × 314 km, 64.95°, heights on GCAT's 6378 km sphere (the model's datum); Blok E (8K72KE) 1,440 kg dry, 54.5 kN, 430 s; RO-7 (RD-0109) 323 s
- ru.wikipedia, 'Восток (ракета-носитель)' — https://ru.wikipedia.org/wiki/Восток_(ракета-носитель) (read): check: 287 t, 38.36 m, 4,725 kg; core 941 kN vac., strap-on 1 MN vac., Blok E 54.5 kN vac., 430 s, 121 kg. Its 'SL Isp 2508 m/s' for RD-0109 is the 8D74's figure
- en.wikipedia, Vostok-K; RD-0109; Vostok 1 (raw wikitext) — https://en.wikipedia.org/wiki/Vostok-K ; https://en.wikipedia.org/wiki/RD-0109 ; https://en.wikipedia.org/wiki/Vostok_1 (read): check only: 970.86 / 912 / 54.5 kN, 281,375 kg (all copied from astronautix's vehicle page); RD-0109 323.5 s; Vostok 1 181 × 327 (citing the FAI file), 64.95° (NSSDC)
- Khorolsky (2011): the R-7 flies its first two stages on a stored pitch programme (not opened): structure (family), quoted from docs/FLIGHT-PROFILE-METHOD.md
- Andrienko, Tropova, Chadaev, Problemy Upravleniya 2013 (Soyuz-2 strap-ons cut off by command) (not opened): Soyuz-2 only; quoted from the repo; not established for 1961
- KBKhA RD-0109 page (kbkha.ru prod=38) — http://www.kbkha.ru/?cat=8&p=8&prod=38 (not opened): would be primary for RD-0109; the URL now redirects to the home page

**Mass budget.**

| part | published | model | closes |
| --- | --- | --- | --- |
| strap-on (each), Blok B/V/G/D | 43,300 kg gross = 3,710 empty + 39,590 (astronautix; lumped, no H2O2/N2 split published) | vostokk: 3,710 + 39,590 = 43,300. vostok8k72k (parts 'blokBVGD-8k72k'): 3,450 + 39,250 = 42,700 | no |
| core, Blok A | 100,400 kg gross = 6,800 empty + 93,600 (astronautix) | vostokk: 6,800 + 93,600 = 100,400. vostok8k72k ('blokA-8k72k'): 6,800 + 93,000 = 99,800 | no |
| Blok E (RD-0109) | 7,775 kg gross = 1,440 empty + 6,335 (astronautix; GCAT 1,440 dry). Alternative: 1.34 t dry (Chertok via Zak), which gives 6,435 | vostokk: 1,440 + 6,335 = 7,775. vostok8k72k ('blokE'): 1,440 + 7,780 = 9,220 | no |
| fairing (shroud) | 0.8 t, 2.7 m max diameter (Chertok via Zak); length not published | vostokk 800 kg, 2.7 × 6.8 m (length estimated); vostok8k72k 800 kg, 2.6 × 5 m | yes |
| payload, Vostok 3KA | 4,725 kg weighed on 10 Apr 1961 (FAI records file) | vostokk 4,725 (Watch); vostok8k72k lesson 4,730 (satellite 'vostok3ka') | yes |
| whole vehicle at the pad | 287 t (RKK Energia 1996, via Zak). Alternative: 290.515 t (Chertok via Zak). Stage sum 281,375 (astronautix 'gross') + 4,725 + 800 = 286,900 kg | measured at T−10 s: vostokk 286.90 t; vostok8k72k 285.35 t (lesson payload) | no |

**Proposals.**

| target | from | to | role | confidence | source |
| --- | --- | --- | --- | --- | --- |
| STAGE_BODIES 'blokE' propellantMass | 7780 | 6335 | derived | high | astronautix Vostok 8K72K (Stage 2); GCAT 8K72KE 1,440 kg dry |
| BOOSTER_BODIES 'blokBVGD-8k72k' dryMass, propellantMass | dryMass 3450, propellantMass 39250 | dryMass 3710, propellantMass 39590 | input | medium | astronautix Vostok 8K72K (Stage 0) |
| STAGE_BODIES 'blokA-8k72k' propellantMass | 93000 | 93600 | derived | medium | astronautix Vostok 8K72K (Stage 1) |
| RD107_1959 (vostokk strap-on engine) | thrustSL 793 kN, thrustVac 970 kN, ispSL 256, ispVac 313 | thrustSL 813.95 kN (83 tf), thrustVac 1000.28 kN (102 tf), ispSL 255.7 (2508 m/s), ispVac 312.7 (3067 m/s) | input | high | lpre.de Table 1 after NPO Energomash; astronautix RD-107-8D74-1959 |
| RD108_1959 (vostokk core engine) | thrustSL 718 kN, thrustVac 912 kN, ispSL 248, ispVac 315 | thrustSL 745.31 kN (76 tf), thrustVac 941.44 kN (96 tf), ispSL 247.8 (2430 m/s), ispVac 314.8 (3087 m/s) | input | high | lpre.de Table 1 after NPO Energomash; astronautix RD-108-8D75-1959 |
| ENGINE_PARTS 'rd107-8d74k' and 'rd108-8d75k' | 'RD-107 (8D74K)' 821/1000 kN, 257/313 s; 'RD-108 (8D75K)' 745/941 kN, 249.4/315 s | 'RD-107 (8D74)' 813.95/1000.28 kN, 255.7/312.7 s; 'RD-108 (8D75)' 745.31/941.44 kN, 247.8/314.8 s | input | medium | lpre.de (chronology and Table 1) |
| FAIRING_PARTS 'vostok8k72k' diameter | 2.6 | 2.7 | input | medium | Chertok, Rakety i Lyudi vol. 2, via russianspaceweb.com/vostok_lv.html |
| adv-vostok brief (en/ru/th) | 'The radio command to shut down Blok E did not come, and the stage burned on to its backup cut-off.' | 'The radio command to shut down the core stage (Blok A) did not come; its own integrator, set for a higher speed, shut it down late, and Blok E then carried the extra speed into orbit.' Make the same correction in docs/PHYSICS.md §13.6 ('a backup timer cut [Blok E] off'). | input | high | Chertok, Rockets and People vol. III (NASA SP-2009-4110); russianspaceweb.com/vostok1_launch.html |
| adv-vostok orbit datum (solution 181 × 327; criteria perigee 170-195, apogee 315-340) | 181 × 327 km taken as model heights | 168 × 314 km in the model's datum (R_EARTH = 6378.137 km), or state that 181 × 327 is the Soviet surface-referenced figure | derived | medium | FAI records file; GCAT satcat |
| vostok1 flown.events | { key: 'evt.seco', t: 676 } | { key: 'evt.payloadSep', t: 676, approx: true } and { key: 'evt.seco', t: 666, approx: true } | input | low | ESA 'The flight of Vostok 1'; astronautix (365 s); russianspaceweb.com/vostok1_orbit.html |
| §1 register: Vostok-K rows (none exist) | (no Vostok rows) | Fairing T+156 s: input (ESA; alternatives 154 s Gerchik, 150 s Baturin). Fairing lengths 5 m / 6.8 m: estimate. Strap-on separation delay 1 s: estimate (no 8K72K source). Kick 3° at 0.3 °/s, six-DOF 4°: generic, not fitted. Watch target 168 × 314: input (GCAT). Fleet strap-on 3,450/39,250 kg: unsour | estimate | high | docs/FLIGHT-PROFILE-METHOD.md |

**Disagreements to pin.**

- One rocket has two data sets: 'vostok8k72k' (fleet, lesson 5.4) and 'vostokk' (Watch Vostok 1) disagree on strap-ons (42.7 vs 43.3 t), core (99.8 vs 100.4 t), Blok E (9.22 vs 7.775 t), engines (1000/941 vs 970/912 kN), fairing (2.6 × 5 vs 2.7 × 6.8 m) and target orbit (181 × 327 vs 168 × 314). runtime.ts R7_TRIM_SHARE_VEHICLES also lists 'vostok8k72k' but not 'vostokk' or 'r7sputnik' (six-DOF; not measured).
- Core cut-off: on published engines and loads the core runs dry at T+304.6 s against the flown T+300 s. Commanded at T+300 s, Blok E runs dry at T+668.9 s suborbital (85 × 170 km), roughly 25-50 m/s short. Commanded at T+302 s it reaches 168 × 311 with 97 kg left and SECO at T+665.5 s; at T+303 s, 209 kg left. Blok E Isp 326 s gives 145 × 172; Blok E dry 1.34 t gives 168 × 266. Candidate causes, none established: the generic turn (no programme source), the 8D75's 10 s vernier final stage (not modelled), the unsplit H2O2/N2/residual content of the lumped loads, and ±1 % engine data.
- Hot staging is not modelled. Blok E fires through the truss before Blok A separates (Zak); the model separates Blok A at its cut-off with no delay.
- Blok E cut-off: model SECO T+649-658 s (vostokk) against about T+666 s flown. ESA's T+676 s is possibly the separation time.
- The orbit's height datum: 181 × 327 km (Soviet, 'from the Earth's surface') and 168 × 314 km (GCAT, 6378 km sphere, the model's datum) are the same orbit. Lesson 5.4 targets 181 × 327 in model heights.
- Over-burn attribution: lesson 5.4 and PHYSICS.md §13.6 say Blok E's radio cut-off failed; Chertok and Zak say Blok A's (core).
- Over-burn size: Chertok gives +40 km of apogee (his translator corrects 0.25 to 25 m/s); Zak gives about +97 km (230 → 327 km).
- Fairing time: ESA 156 s, Gerchik 154 s, Baturin documents 150 s.
- Liftoff mass: 287 t (RKK Energia 1996) against 290.515 t (Chertok via Zak). Stage I+II dry 23.56 t (Chertok) against 21.64 t (astronautix).
- The strap-ons run dry at the flown separation (T+119.1 s against 119 s) on the published flow and lumped load. A commanded cut-off cannot be shown to leave a reserve.

**Open questions.**

- What commanded the 8K72K strap-on cut-off in 1961 (apparent velocity, a timer, or depletion)? Not found.
- How much H2O2 and N2 are inside the 8K72K strap-on and core loads (astronautix lumps gross minus empty)? Not found.
- What are the RD-107 thrust levels at intermediate-2 (the first 6 s after liftoff per the cyclogram) and intermediate-1 (the 1 s before cut-off), and what is the RD-108 vernier final-stage thrust? Not found, so no thrustSteps or core vernier tail can be entered.
- What is the pad (pre-liftoff) consumption of the 8D74/8D75 start (preliminary plus intermediate stages, about 16 s from the start command to the liftoff contact)? The 8D74 used three intermediate stages against the 8D74K's two (lpre.de). No full-flow figure was found, so padBurnS has no source.
- What is the 8K72K pitch programme, and was Blok E steered on a programme or a closed loop? Not found.
- Heights and speeds at the Vostok 1 events: only '5.5 km/s' at core cut-off, frame not stated.
- Is ESA's T+676 s the Blok E cut-off or the spacecraft separation? Zak's sources give T+667.3 or T+688.3 s for the separation.
- The primary sources for the stage masses (RKK Energia 1996; Chertok, Rakety i Lyudi vol. 2 table) and KBKhA's RD-0109 page were not accessed. The NPO Energomash figures were read only through lpre.de's reproduction.

## Falcon 9 Block 5 (`falcon9`)

**Tier.** A (six-DOF kick already fitted, VALIDATION.md §2). This audit covers steps 1-3 only. Nothing was fitted and nothing was tuned to a clock.

**Cut-off logic.** Published: both stages have a 'Commanded shutdown' (Falcon User's Guide 2025 stage table; Wikipedia's table says the same). SpaceX does not publish the criterion. For recovery flights the first stage keeps propellant for boostback, entry and landing. The User's Guide says side-booster shutdown on Falcon Heavy is 'tailored for each mission to ensure the proper impulse is delivered'.  Model, first stage: cut-off happens when the usable propellant above a reserve runs out (VehicleModel.usablePropellant), so MECO sits on a propellant target. - RTLS keeps returnReserve 0.15. That is an estimate: the least that lands on LZ-1 in the model's own point mass is 13 %. - A drone ship keeps droneShipReserve(spec, payload, 0.12). It is computed from estimated constants: 800 m/s landing, 1,100 m/s ascent losses from the model's own Demo-2 flight, a 550 m/s entry end speed and 75 % entry use. - An expended stage runs to depletion. On recovery flights the propellant left at MECO is therefore set, not predicted: CRS-16 62.2 t (15.1 %) at T+132.8 s against 145 flown; drone ships 35.6-36.6 t (8.6-8.9 %) at T+142.5-142.6 s against 143/150/152 flown. Expended, 0.3 t (0.1 %) at T+157.9 s against 168 flown and 164 planned. - The real expended burn ends with a ~21 s hold at ~37 m/s2. The model holds at 45 m/s2 from T+140.7 s. - The real expended booster's residual is not published, so depletion is a reasonable reading of 'commanded' near empty. - None of the reserves is in the §1 register.  Model, second stage: SECO-1 is commanded by the closed loop at the parking orbit (200 km, or 250 km to GTO), which matches 'commanded'. The propellant left is a prediction, and positive on every flight: CRS-16 4.96 t (4.6 %), Iridium NEXT 8 2.51 t (2.3 %), Bangabandhu-1 7.63 t (7.1 %), SSO-A 7.75 t (7.2 %), GPS III SV01 11.72 t (10.9 %), Starlink-class 15.6 t 3.14 t (2.9 %). No published residuals to compare.  No load, thrust or throttle in the data is set from a clock. The bucket and the reserves were chosen or checked against flight rows or the model's own landings, as stated in propulsion and proposedChanges.

**Guidance structure.** Nothing about the steering law is published. The Falcon User's Guide (2025) describes the avionics (three-string fault-tolerant flight computers, GPS receivers, IMUs) and gives only sample timelines (Tables 10-3/10-4) and sample mission-profile figures (10-11/10-12). It has no pitch programme, tilt table, or statement of when closed-loop guidance takes over. No SpaceX or agency document found gives one.  The model therefore keeps the generic structure, labelled generic: a kick and gravity turn, then a blend into closed loop below ~12 kPa. - Point mass: 1.5° kick, 0.3 °/s, pitchMax 35. - Six-DOF: the registered fitted 3.5° kick. - The second stage flies closed loop to a fixed parking orbit.  A stored programme cannot be an input here. The only ascent attitude data are the webcast flight-path angles, which are already the fit targets for the six-DOF kick. Building a table from them would be a fit, not an input. The flights also differ widely in their turns: Bangabandhu-1 at 28° and SSO-A at 58° at T+140. So per the method Falcon 9 keeps the generic guidance, with the existing registered fit.

**Sources.**

- SpaceX, Falcon User's Guide, 9 May 2025 — https://www.spacex.com/assets/media/falcon-users-guide-2025-05-09.pdf (read): input (primary). Stage table: 190,000 lbf per Merlin 1D at sea level; 981 kN / 220,500 lbf MVac; throttle ranges 190,000→108,300 lbf (sea level) and 220,500→140,679 lbf; 'Shutdown process: Commanded shutdown' for both stages. Fairing 'nominally deployed when free molecular aero-thermal heating is less than 1,135 W/m2'. Engine start at T-3 s with full power checked during hold-down. Tables 10-3 (GTO) and 10-4 (LEO) give sample timelines (max Q 74/67 s, MECO 147/145, separation 151/148, SES-1 158/156, fairing 222/195, SECO-1 484/514). Engines 'may be throttled to help maintain ... steady state acceleration limits', with no value given. Note: the table says 7,686 kN beside 1,710,000 lbf; 1,710,000 lbf is 7,607 kN, and the guide's own text says 7,605 kN.
- SpaceX, Falcon 9 vehicle page (figures read from the page's own JS bundle, chunk 8102) — https://www.spacex.com/vehicles/falcon-9/ (read): input (primary): mass 549,054 kg; first stage 7,607 kN at sea level and 8,227 kN in vacuum (nine engines); Merlin 845 kN / 190,000 lbf; second stage 981 kN, burn time 397 s; fairing 13.1 x 5.2 m. No Isp, no first-stage burn time, no stage masses.
- Wikipedia, 'Falcon 9 Block 5' (action=raw), spec table citing Espace & Exploration no. 39 (May 2017), 'Fiche technique: Falcon-9' — https://en.wikipedia.org/w/index.php?title=Falcon_9_Block_5&action=raw (read): input (secondary, the source already used for s1, F1): S1 22,200 kg empty, 287,400 LOX + 123,500 RP-1, gross 433,100 kg. S2 4,000 kg empty, 75,200 LOX + 32,300 RP-1, gross 111,500 kg. Shutdown 'Commanded' for both stages. The magazine itself was not opened: it is dead and archived only.
- Espace & Exploration no. 39 (May 2017), pp. 36-37 — https://web.archive.org/web/20170821172058/http://www.espace-exploration.com/fr/numeros/672-espace-et-exploration-n%C2%B039 (not opened): input (quoted by Wikipedia; not read)
- Wikipedia, 'SpaceX Merlin' (action=raw) — https://en.wikipedia.org/w/index.php?title=SpaceX_Merlin&action=raw (read): input (secondary) for the Isp values. Merlin 1D 282/311 s is cited to SpaceX's 2013 Falcon 9 page, and Wikipedia itself flags it 'Figures are from 2013 and do not reflect current engine performance'. MVac 348 s is cited to SpaceX's Falcon 9 page of 2017-18, archived. 914/845 kN comes from SpaceX's May 2016 upgrade announcement and Musk's 190,000 lbf of May 2018. The 2015 user's guide gave MVac throttling to 39 %.
- SpaceX Falcon 9 page, 2013 and 2018 archives (Isp 282/311 s; MVac 348 s) — https://web.archive.org/web/20180208031148/http://www.spacex.com/falcon9 (not opened): input, quoted via Wikipedia. web.archive.org reset the connection from this session.
- shahar603/Telemetry-Data @ b245d3b81aa36b7941ec10f3f4b508999d106a6d: five Block 5 flights (analysed.json, events.json, README) — https://github.com/shahar603/Telemetry-Data (read): check, as already registered: fit target for the six-DOF kick (flight-path angles of CRS-16, Iridium NEXT 8 and GPS III SV01) and held-out rows. Used here diagnostically only: the acceleration plateau, the throttle-down windows and the q peaks. Its 'acceleration' is dv/dt + g sin(gamma), i.e. (T cos(alpha) - D)/m. Its scale checks against MVac at SES-1: 8.2-8.5 m/s2 against the model's 8.27-8.30.
- Spaceflight Now, 'Falcon 9 launch timeline with Bangabandhu-1' (2018-05-11) — https://spaceflightnow.com/2018/05/11/falcon-9-launch-timeline-with-bangabandhu-1/ (read): planned timeline (secondary, from SpaceX): max Q 74 s, MECO 151, separation 153, SES-1 156, fairing 217, SECO-1 499
- Spaceflight Now, 'Falcon 9 launch timeline with the GPS 3 SV01 navigation satellite' (2018-12-18) — https://spaceflightnow.com/2018/12/18/falcon-9-launch-timeline-with-the-gps-3-sv01-navigation-satellite/ (read): planned timeline (secondary): max Q 64 s, MECO 164, separation 168, SES-1 170, fairing 202, SECO-1 496; booster not recovered

**Mass budget.**

| part | published | model | closes |
| --- | --- | --- | --- |
| First stage (body s1) | 433,100 kg gross = 22,200 empty + 287,400 LOX + 123,500 RP-1 (E&E no. 39 via Wikipedia, secondary, 2017 Full Thrust) | 22,200 dry + 410,900 propellant = 433,100 kg | yes |
| Second stage (body s2) | 111,500 kg gross = 4,000 empty + 75,200 LOX + 32,300 RP-1 (same source as s1) | 4,300 dry + 108,000 propellant = 112,300 kg (source UNCITED) | no |
| Fairing | not found (the User's Guide and SpaceX page give 13.1 x 5.2 m only; secondary web text says 'about 2 t') | 1,900 kg (UNCITED) | no |
| Whole vehicle without payload | 549,054 kg (SpaceX Falcon 9 page) | 547,300 kg (22,200 + 410,900 + 4,300 + 108,000 + 1,900); 546,500 kg with the published s2 | yes |

**Proposals.**

| target | from | to | role | confidence | source |
| --- | --- | --- | --- | --- | --- |
| stage body 's2' dryMass / propellantMass / source | dryMass: 4300, propellantMass: 108000, source: UNCITED | dryMass: 4000, propellantMass: 107500, source: 'Espace & Exploration no. 39 (May 2017), as cited by Wikipedia’s “Falcon 9 Block 5”' (75,200 LOX + 32,300 RP-1) | input | medium | https://en.wikipedia.org/w/index.php?title=Falcon_9_Block_5&action=raw (E&E no. 39) |
| f9Stage2() ignitionDelay | stageSpec('s2', { restartable: true, sepDelay: 3, ignitionDelay: 4, ... }) | ignitionDelay: 8 (sepDelay 3 kept), so SES-1 is at MECO+11 s | input | medium | Falcon User's Guide 2025-05-09, Table 10-4 (https://www.spacex.com/assets/media/falcon-users-guide-2025-05-09.pdf) |
| Falcon 9 reference mission milestone 'MVac ignition' published column | published: 'MECO + 7 s' | published: 'MECO + 11 s' (Falcon User's Guide 2025, Tables 10-3/10-4); 'stage separation' stays 'MECO + 3 s' (LEO sample) | input | high | Falcon User's Guide 2025-05-09, Tables 10-3/10-4 |
| engine 'merlin1d' minThrottle; engine 'mvac' minThrottle | merlin1d minThrottle: 0.4; mvac minThrottle: 0.4 | merlin1d minThrottle: 108300 / 190000 (0.570); mvac minThrottle: 140679 / 220500 (0.638) | input | medium | Falcon User's Guide 2025-05-09, stage characteristics table ('Throttle capability') |
| engine 'merlin1d' and 'mvac' source fields | source: UNCITED (both) | merlin1d: 'thrust: SpaceX Falcon 9 page (7,607/8,227 kN for nine) and Falcon User's Guide 2025 (190,000 lbf); Isp 282/311 s: SpaceX 2013 via Wikipedia (the 2013 Merlin 1D; outdated, inconsistent with the thrust pair by 1.95 %)'. mvac: 'thrust 981 kN: SpaceX page and User's Guide 2025; Isp 348 s: Spa | input | high | https://www.spacex.com/vehicles/falcon-9/ ; User's Guide 2025 ; https://en.wikipedia.org/w/index.php?title=SpaceX_Merlin&action=raw |
| engine 'merlin1d' ispSL | ispSL: 282 | ispSL: 287.5 (= 845,000 / (9.80665 x 299.70 kg/s)), or keep 282 and record the 1.95 % inconsistency | derived | low | SpaceX thrust pair; Isp 311 s (Wikipedia/SpaceX 2013) |
| §1 'Fitted and derived values' register: Falcon 9 rows | only 'six-DOF kick \| fitted' | Add: (1) maxQThrottle 22 kPa / 75 %, fitted by selection (first commit uncited; kept by sweeps on CRS-16, Iridium NEXT 8 and GPS III SV01 rows, §2 'The throttle profile'; 35 of 41 rows); also Falcon Heavy's (F11). (2) maxAccel 45 m/s2, estimate (uncited). (3) recoveryReserve 0.12 (cap) and returnRes | fitted | high | git de6ae33 (origin of 22e3/0.75/45); docs/VALIDATION.md §2; src/physics/vehicle.ts droneShipReserve |
| first-stage acceleration hold (falcon9 currently has only the vehicle-wide maxAccel) | maxAccel: 45 (vehicle-wide, uncited) | a per-stage limit on stage 1 of 37 m/s2 (new optional StageSpec field), with vehicle-wide maxAccel 45 kept for the second stage | derived | low | https://github.com/shahar603/Telemetry-Data @ b245d3b, 'GPS III SV01' and 'Bangabandhu-1' analysed.json; Falcon User's Guide 2025 §5 |
| statement that the real vehicle 'peaks nearer 33 kPa at T+72 s' | 'the real vehicle peaks nearer 33 kPa at T+72 s' / '22 kPa, not the real ~33 kPa peak' | 'the five webcast flights peak at 24.3-30.3 kPa at T+54-74 s (the data set's own q); the User's Guide's sample timelines put max Q at T+67 s (LEO) and T+74 s (GTO)' | input | medium | Falcon User's Guide 2025 Tables 10-3/10-4; telemetry data set analysed.json |

**Disagreements to pin.**

- Expended first-stage burn (F1, left after F1's masses): published thrust (914 kN vac), 2013 Isp (311 s) and the E&E load (410.9 t) give 152.2 s of full flow. GPS III SV01 was flown to MECO at T+168 s (planned 164 s), and the point mass cuts off at T+157.9 s. Of that 10 s: a stage-1 acceleration hold at ~37 m/s2 instead of 45 adds ~5.3 s (measured). The model's bucket saves ~5.7 s of flow against ~3 s flown, so a flown-shape bucket would take back ~2-3 s. About 5-8 s (3-5 % of flow or load) stays unexplained by any published figure.
- Thrust-to-mass at T+20 s: the model is 2.1-5.6 % above the webcast trace on all five flights (15.43-15.61 against 14.62-15.27 m/s2, drag under 0.06 m/s2). Either the real stack is ~10-15 t heavier, or the thrust is below the User's Guide's 'up to 845 kN' per engine. Not tuned.
- Throttle bucket: the model is a q-limiter pinning 22.2-22.6 kPa at 75 % from T+40-43 to T+66-67 s, with max Q at T+49-50 s. Flights throttle in windows starting T+43-55 s and ending T+65-78 s, to roughly 0.80-0.91 of full. Their q peaks at 24-30 kPa at T+54-74 s, and published max Q is T+64-74 s. The bucket was kept by selection on the fit flights.
- Merlin 1D Isp pair (282/311 s, 2013) is inconsistent with the published thrust pair (845/914 kN) by 1.95 %: 305.6 against 299.7 kg/s. The model takes the vacuum pair and delivers 287.5 s at sea level.
- Second-stage burn time: SpaceX's 397 s against 374-376 s of full flow from 981 kN, 348 s and 107.5-108 t. 397 s fits the earlier 934 kN MVac (392.8 s).
- Separation to SES-1: the model's MECO+7 s; User's Guide MECO+11 s (separation +7-8 s); 2018 planned timelines separation +2-3 s; webcast thrust onset ~MECO+9 s. tests/fleet-defaults.test.ts calls 'MECO + 7 s' published, with no source.
- RTLS MECO: the model's 15 % returnReserve (an estimate from its own landings) cuts CRS-16 off at T+132.8 s against 145 s flown.
- Drone-ship MECO: droneShipReserve gives 8.6-8.9 % and T+142.5-142.6 s on all three flights, against 143/150/152 s flown. Per-mission sizing does not follow the real spread (F4).
- Falcon User's Guide 2025 internal typo: the stage table says 7,686 kN beside 1,710,000 lbf (7,607 kN). Its text says 7,605 kN. The model's 845 kN x 9 is the consistent reading.

**Open questions.**

- Current (Block 5, 845/914 kN) Merlin 1D Isp: no primary source found. The 282/311 s figures are SpaceX's 2013 numbers for a smaller engine.
- Block 5 propellant load and first-stage empty mass (landing legs, titanium grid fins, interstage, pressurants). The only figures are a 2017 magazine (Full Thrust Block 3) via Wikipedia. The trace suggests 2-3 % more mass at T+20 s.
- The level of the stage-1 acceleration hold as T/m: the trace gives (T cos(alpha) - D)/m and the data set has no pitch attitude, so 37 m/s2 is a lower bound. Is it a fixed limit, or set per mission (only two of five flights reach it)?
- Fairing mass: not found in SpaceX documents. The model's 1,900 kg is an estimate.
- Engine start: the User's Guide says T-3 s; the model ignites all liquid first stages at T-2.5 s. The flow during the start sequence is not published (~0.5 s, ~1.3 t at full flow).
- Which SES-1 timing to adopt: the User's Guide 2025 sample (+11 s) or the 2018 mission timelines (+5/+6 s). The webcasts show ~+9 s to thrust onset.
- Whether the bucket should be a time-windowed schedule. That would need a new core-stage thrust schedule (the strap-ons already have thrustSteps). No primary source for its depth or window exists, so it would remain an estimate.
- Falcon Heavy shares s2, merlin1d, mvac, f9Stage2 and the bucket. Every proposal here touches it and must be measured on its own flights (F11).
- No published residuals for either stage at MECO or SECO to judge the model's predictions against: 0.1 % expended at MECO, 2.3-10.9 % at SECO-1.

## Atlas V 551 (`atlasv551`)

**Tier.** B

**Cut-off logic.** Atlas booster (CCB): depletion, detected. AVUG §2.2.1.1/2 says 'the RD-180 cutoff sequence is initiated when a propellant low-level sensor system indicates that the Atlas booster is about to deplete available propellants'. The Juno MO says it holds 4.6 g 'until propellant depletion is detected (BECO)'. So BECO time is a prediction from load, flow and the throttle history. The model agrees: the CCB has no cutoffAt, the depletion sensor trips with tail-off propellant aboard, and 13–165 kg is left at BECO. The prediction is early because the throttle history is incomplete: BECO comes at T+250.2 s (VALIDATION) against Juno's 267.2 and the GEM-era 263.1–263.5.  The model's booster throttle has three published elements missing. It returns to 100 % at T+62 s when q falls below 22 kPa; the published profile holds the throttle-down until after max-Q and SRB burnout. It has no 2.5 g hold before PLF jettison. It has no 4.6 g phase about 10 s before BECO.  GEM 63 / AJ-60A strap-ons burn to burnout. Jettison is commanded: 'SRBs 1 and 2 are jettisoned at a predetermined time dependent upon the dynamic pressure constraint. SRBs 3, 4, and 5 are jettisoned 1.5 seconds later' (AVUG §2.2.1.2). NH flew 105.0 / 107.0 s. The model jettisons all five at burnout + sepDelay 5 s. Audit B24 picked that 5 s as 'the tighter fit' to AJ-60A-era jettison times, so it is clock-fitted.  Atlas/Centaur separation is BECO + 6.0 s on Juno, NH, KA-01 and ViaSat-3 F2 (the 2010 guide's generic table has 8 s). The model uses 3 s. MES1 is separation + 10 s (9.6–10.0 s flown); the model's ignitionDelay 10 agrees.  Centaur: MECO1 and MECO2 are guidance-commanded on the target orbit (Juno MO), as in the model's closed loop. The Centaur propellant left is a prediction.  PLF: thermal criterion, 'when the 3-sigma free molecular heat flux falls below 1,135 W/m²' (AVUG). It is planned per mission and appears as a time in each booklet (Juno 204.9 s 'based on thermal constraints'). The model uses the same 1,135 W/m² on the nominal trajectory, which by construction fires earlier than a 3-sigma criterion. The CFLR goes about 2 s after the PLF (MSL).  Measured (point mass, Juno mission), structure only, no level fitted. With the published throttle structure added to the published data (throttle-down held to SRB burnout, 2.5 g hold to the PLF at 204.9 s, 4.6 g in the last 10 s) and the model's own uncited 0.6 level, BECO comes at 268.5 s on Juno's AJ-60A hardware and 269.2 s on GEM 63. 5.0 g is reached at 233.0 / 233.7 s against the published 233.0 s. At the 541's 76 %, BECO comes at 260.4 / 260.7 s.

**Guidance structure.** Published (AVUG Rev 11 §2.2.1.1–2, Juno MO): - The RD-180 lights at T−2.7 s and the vehicle is held down for a health check. It is then released and the SRBs light (T+0.8 s in the AJ-60A-era table). - After a vertical rise of 85 ft, a roll/pitch/yaw manoeuvre starts at 3.8 s (4.0–4.1 s on GEM-63 flights). It is followed by a nominal zero-alpha/zero-beta phase through the atmosphere. Both are 'implemented through the launch-day wind-steering system' (ADDJUST): a pre-computed steering profile, re-designed on launch day from measured winds. No pitch table or tilt programme is published. - On 501/502 only, alpha-bias steering runs from 24.4 to 33.5 km. - On every 500-series vehicle with SRBs, zero-alpha is held until 6 s after the initial SRB jettison, when closed-loop guidance is enabled: 110 s on Juno. MSL's commentary: 'We have re-enabled guidance' about 6 s after its SRB jettison. - The booster then flies guidance-steered to depletion. The Centaur is closed-loop (MECO by guidance command).  So a stored programme cannot be an input: none is published.  The model's generic structure matches the published shape: kick (6°, 0.3 °/s, loft 150 km; six-DOF 8°), zero-alpha gravity turn, closed loop. Two of its points are generic rather than published: - The kick starts at 200 m instead of 26 m (85 ft). - The hand-over uses the generic q < 4 kPa rule, measured at T+84.7 s on Juno, while the SRBs are still burning. The published hand-over is a time, 110 s.  `closedLoopStart: 110` would be the published structure. Measured in the point mass, it leaves every event time unchanged and lifts the BECO altitude from 170 to 192–196 km. It belongs to step 5, so it is not proposed under Tier B.

**Sources.**

- ULA, Atlas V Launch Services User's Guide, Revision 11 (March 2010) — https://www.ulalaunch.com/docs/default-source/rockets/atlasvusersguide2010.pdf (read): input: booster, Centaur, PLF, adapter and SRB masses (Figs. 1.4.1-3/-4); RD-180 figures and 47-100 % throttle (Fig. 1.4.1-4, §A.2.2.3); ascent and cut-off logic (§2.2.1.2: SRB jettison sequence, 2.5 g hold before PLF jettison, 3-sigma 1,135 W/m² PLF criterion, 4.6 g, low-level-sensor BECO); typical timelines (Table 2.4.1-1)
- ULA, Atlas V Juno Mission Overview (2011) — https://www.ulalaunch.com/docs/default-source/news-items/av_juno_mob.pdf (read): reference flight (check): event times. Input: throttle structure (down after pitch-over, back to 100 % after max-Q and SRB burnout; 5.0 g from 233.0 s; 4.6 g about 10 s before BECO), BECO at detected depletion, separation at BECO + 6.0 s, closed loop at 110 s. Hardware: AJ-60A SRBs ('92-second burn'), RL10A-4-2 (22,300 lbf)
- New Horizons Atlas V 551 Mission Overview (2006) — https://pluto.jhuapl.edu/Mission/Path-to-Pluto/FINAL-PLUTO_MO.pdf (read): check: liftoff mass 573,160 kg; AJ-60A 94,000 lb of propellant, about 372,000 lbf max, about 95 s; SRB jettison (1,2) 105.0 s and (3,4,5) 107.0 s; PLF 203.0 s; BECO 267.4 s; separation 273.4 s; MES1 283.0 s
- Northrop Grumman, GEM 63 and GEM 63XL data sheet DS-26 (2020) — https://cdn.northropgrumman.com/-/media/wp-content/uploads/GEM-63-GEM-63XL-Datasheet.pdf?v=1.0.0 (read): input: GEM 63 total 49,300 kg, propellant 44,200 kg, burn time 97.6 s, max thrust 370,835 lbf (it does not say whether vacuum or sea level)
- ULA mission page and flight-profile graphic, Atlas V 551 USSF-51 (2024, GEM 63) — https://www.ulalaunch.com/missions/next-launch/atlas-v-ussf-51/ (read): check (GEM-63 era): liftoff 1.0 s, max Q 47.0 s, SRB jettison 104.9 s, PLF 193.1 s; RL10C-1-1 23,825 lbf
- ULA mission page and flight-profile graphic, Atlas V 551 Kuiper 1 / KA-01 (2025-04-28, GEM 63) — https://www.ulalaunch.com/missions/next-launch/atlas-v-kuiper-1 (read): check (GEM-63 era): liftoff 1.0, max Q 45.6, SRB jettison 106.2, PLF 184.8, BECO 263.1, separation 269.1, MES-1 279.0, MECO-1 1094.9 s; RL10A-4-2 22,600 lbf. Payload mass not published
- ULA mission page and flight-profile graphic, Atlas V 551 ViaSat-3 F2 (2025-11-14 UTC, GEM 63) — https://www.ulalaunch.com/missions/next-launch/atlas-v-viasat-3-f2 (read): check (GEM-63 era): liftoff 1.0, max Q 54.5, SRB jettison 106.8, PLF 194.1, BECO 263.5, separation 269.5, MES-1 279.5, MECO-1 695.4, MES-2 1295.0, MECO-2 1615.4, MES-3 12415.1, MECO-3 12548.8 s; RL10C-1-1 106 kN
- ULA blog: ViaSat-3 F2 uses Atlas V for launch to space — https://blog.ulalaunch.com/blog/viasat-3-f2-engineering-marvel-uses-atlas-v-for-launch-to-space (read): payload 'more than 13,000 pounds (6 metric tons)'; 20.7 m fairing (5-m short)
- ULA blog: Kuiper 1 — https://blog.ulalaunch.com/blog/kuiper-1-ula-to-launch-first-operational-satellites-for-amazons-project-kuiper (read): loose check: 551 '1.3 million pounds (589,000 kg) once fueled' (payload and fairing differ)
- ULA, NROL-101 mission booklet (2020, Atlas V 531, first GEM 63 flight) — https://www.ulalaunch.com/docs/default-source/launch-booklets/mobrochure_nrol101.pdf (read): input: RL10C-1 22,900 lbf (101.9 kN); SRB 371,550 lbf (1.6 MN) each; liftoff 1.1 s; 531 SRB jettison 113.9 s
- NASA/JPL, Curiosity launch commentary transcript, Atlas V 541, 2011-11-26 — https://mars.jpl.nasa.gov/system/downloadable_items/32099_msl20111126_launchOnNTV.pdf (read): structure evidence on a sister configuration (541, four AJ-60A). Elapsed times are video times; liftoff is about 19 s into the video. Throttle down to 76 % about T+24 s; max Q about T+50; back to 100 % about T+62; SRB burnout about T+89; both pairs jettisoned about T+112; guidance re-enabled about T+117; 'throttled down to hold a constant 2.5 G level for payload fairing jettison'; fairing about T+205; 'CFLR jettison' 2 s later; throttle up to 89 %
- Wikipedia, Atlas V — https://en.wikipedia.org/wiki/Atlas_V (read): secondary: CCB 21,054 kg empty (the 400-series figure) and 284,089 kg; its GEM 63 column gives '94 seconds', which repeats the AJ-60A value; 551 total 590,000 kg; GEM 63 since 2020-11-13
- Wikipedia, Graphite-Epoxy Motor — https://en.wikipedia.org/wiki/Graphite-Epoxy_Motor (read): secondary: GEM 63 Isp 279.06 s, 97.6 s, 1,649.6 kN, cited to a Northrop Grumman catalogue
- Wikipedia, AJ-60A — https://en.wikipedia.org/wiki/AJ-60A (read): secondary: 46,697 kg, 1,688.4 kN, 94 s (no references in the table)
- Aerojet Rocketdyne RL10 data sheet (Oct 2021, Wayback copy) — https://web.archive.org/web/20220130111530/https://rocket.com/sites/default/files/documents/Capabilities/PDFs/RL10_data_sheet.pdf (not opened): input for the RL10C-1's 101.8 kN and 449.7 s, as quoted in src/data/parts.ts; I did not open it
- NASASpaceflight, 'ULA launches first operational Amazon Kuiper mission' (2025-04) — https://www.nasaspaceflight.com/2025/04/kuiper-ka01/ (not opened): seen only in a search summary: KA-01 had GEM-63s and a 5.4 m medium fairing, max Q about 45 s, SRBs off about T+1:46
- docs/history/AUDIT-2026-09-16.md, items B22 and B24 (repository) (read): provenance: B24 picked GEM-63 sepDelay 5 s as 'the tighter fit' to a 'documented 99–100 s' jettison. B22 accepted 93.0 s against '92–94 published', which are AJ-60A figures

**Mass budget.**

| part | published | model | closes |
| --- | --- | --- | --- |
| Atlas booster (CCB), stage inert at BECO | 23,848 kg = 500-series booster inert 21,351 kg + booster cylindrical ISA 285 kg + C-ISA 2,212 kg (5X1; 'includes ISA, aft stub adapter & boattail'). AVUG Fig. 1.4.1-4. All three stay on the booster at Atlas/Centaur separation: the frangible joint is just aft of the Centaur aft tank ring, 'inside the PLF boattail that remains attached to the booster' (AVUG §3.2.7.5.2) | 21,054 kg (parts.ts ccb, UNCITED). This is the 400-series booster inert mass (AVUG Fig. 1.4.1-3). No adapter mass is carried | no |
| Atlas booster propellant | 284,089 kg LO2 + RP-1 (AVUG Figs. 1.4.1-3 and -4) | 284,089 kg | yes |
| Atlas booster gross | 305,440 kg bare booster (21,351 + 284,089); 307,937 kg with the adapters it carries | 305,143 kg | no |
| GEM 63 strap-on (each, ×5) | 49,300 kg total = 44,200 kg propellant + 5,100 kg inert (NG DS-26). Wikipedia's GEM page gives 49,342 / 44,087 kg | 5,100 dry + 44,200 propellant = 49,300 kg | yes |
| AJ-60A (Juno's SRB; not in the model) | 46,697 kg each including attach kit, nose fairing and instrumentation (AVUG); 94,000 lb = 42,638 kg propellant (NH MO; Wikipedia 42,630), so about 4,059 kg inert | Not modelled: the catalogue 551 flies five GEM 63s, 49,300 kg each | no |
| Centaur (5X1 single-engine) | 2,247 kg inert + 20,830 kg LH2/LO2 (AVUG Fig. 1.4.1-4) | 2,243 kg (the 4X1 figure) + 20,830 kg | yes |
| Centaur forward load reactor (CFLR) | 275 kg (AVUG Fig. 1.4.1-4); jettisoned about 2 s after the PLF (MSL commentary) | not carried | no |
| 5-m short PLF | 3,524 kg (AVUG Fig. 1.4.1-4); the fixed boattail is booked in the C-ISA | 3,524 kg | yes |
| Liftoff stack (New Horizons, AJ-60A) | 573,160 kg gross liftoff weight (NH MO) | Catalogue hardware with AJ-60A swapped in: 565.2 t + NH payload stack. With the 500-series inert masses: 568.0 t + payload stack | no |

**Proposals.**

| target | from | to | role | confidence | source |
| --- | --- | --- | --- | --- | --- |
| STAGE_BODIES 'ccb' dryMass | 21054 | 23848 | derived | high | AVUG Rev 11 (2010) Figs. 1.4.1-3, 1.4.1-4, §3.2.7.5.2 |
| STAGE_BODIES 'ccb' source | UNCITED | 'ULA, Atlas V Launch Services User’s Guide Rev 11 (March 2010), Fig. 1.4.1-4 and §3.2.7.5.2 (https://www.ulalaunch.com/docs/default-source/rockets/atlasvusersguide2010.pdf)' | input | high | AVUG Rev 11 |
| ENGINE_PARTS 'rd180' source (values unchanged) | UNCITED | AVUG Rev 11 Fig. 1.4.1-4 (3,827 / 4,152 kN, 311.3 / 337.8 s at 100 %) and §A.2.2.3 (continuous 47–100 %) | input | high | AVUG Rev 11 |
| ENGINE_PARTS 'gem63' thrustVac | 1300 * kN | 1239.3 * kN | derived | high | Northrop Grumman GEM 63 data sheet DS-26 (97.6 s, 44,200 kg); Isp 279.06 s per Wikipedia 'Graphite-Epoxy Motor' (NG catalogue) |
| ENGINE_PARTS 'gem63' thrustSL | 1180 * kN | 1124.9 * kN | derived | medium | as thrustVac |
| ENGINE_PARTS 'gem63' peakFactor | 1.27 | 1.331 | derived | medium | NG DS-26 |
| ENGINE_PARTS 'gem63' source, and BOOSTER_BODIES 'gem63' source | `${W}Graphite-Epoxy_Motor (published peak 1 649.6 kN, for peakFactor); mean thrust and Isp ${UNCITED}` / `${W}Atlas_V` | Northrop Grumman GEM 63/63XL data sheet DS-26 (49,300 kg, 44,200 kg, 97.6 s, 370,835 lbf); Isp from Wikipedia 'Graphite-Epoxy Motor' (secondary) | input | high | NG DS-26 |
| PUBLISHED_BURN_TIME 'atlasv551/ccb/gem63'; design-budget ['atlasv551', 0, 'parallel', 94] | 94 | 97.6 | input | high | NG DS-26 |
| atlasv551 stageSpec('centaur3', { sepDelay }) | 3 | 6 | input | high | Juno MO; NH MO; ULA KA-01 and ViaSat-3 F2 flight profiles |
| STAGE_BODIES 'centaur3' dryMass | 2243 | 2247 | input | high | AVUG Rev 11 Figs. 1.4.1-3 and 1.4.1-4 |
| FAIRING_PARTS 'atlasv551' mass | 3524 | 3799 | derived | medium | AVUG Fig. 1.4.1-4; NASA/JPL MSL launch transcript |
| atlasv551 boosterSpec('gem63', 5, { sepDelay }) | sepDelay: 5, all five at once | Construction from the adopted reference flight's jettison time, e.g. 9.4 s (KA-01's T+106.2 s less the model's GEM 63 burnout at T+96.8 s with the 97.6-s data). Optionally two groups, 2 and 3 motors, the second 1.5 s later (AVUG). Record it in the register. | construction | low | AVUG §2.2.1.2; ULA USSF-51, KA-01, ViaSat-3 F2 profiles; audit B24 |
| atlasv551 maxQThrottle | { qStart: 22e3, qEnd: 22e3, throttle: 0.6 } (uncited; 0.6 whenever q > 22 kPa on stage 1, T+20.1–62.0 s on Juno) | A timed core throttle-down held until SRB burnout, the published structure (e.g. StageSpec thrust steps mirroring BoosterGroupSpec.thrustSteps). The level is kept as a labelled estimate (0.6, origin unrecorded); it is not fitted. | estimate | low | Juno MO; AVUG; MSL transcript |
| atlasv551 acceleration limit before PLF jettison | none (maxAccel 49 m/s² throughout) | Hold 2.5 g from when the stack first reaches it after SRB jettison until PLF jettison, then back to the 5.0 g limit | input | medium | AVUG §2.2.1.2; MSL transcript |
| atlasv551 final acceleration limit | maxAccel 49 m/s² (5.0 g) to depletion | 4.6 g from about 10 s before the predicted depletion | input | medium | Juno MO; AVUG §2.2.1.2 |
| atlasv551 fairingSpec sepTime | absent (nominal 1,135 W/m² placard: T+156.7 s at 105.4 km) | 204.9 | input | low | Juno MO; AVUG §2.2.1.2 |
| ATLASV_JUNO comment, and a GEM-63-era check flight | Juno only (AJ-60A strap-ons, RL10A-4-2), with a comment saying the strap-ons do not depend on the mission | State that Juno flew AJ-60A strap-ons and an RL10A-4-2, which the catalogue 551 does not carry. Add ViaSat-3 F2 (2025-11-14 UTC; GEM 63; RL10C-1-1; max Q 54.5, SRB jettison 106.8, PLF 194.1, BECO 263.5, separation 269.5, MES-1 279.5, MECO-1 695.4 s; payload 'more than 13,000 lb (6 t)') and/or KA-01  | input | medium | ULA ViaSat-3 F2 and KA-01 flight profiles; ULA ViaSat-3 F2 blog |
| ENGINE_PARTS 'rl10c1' source | UNCITED | Aerojet Rocketdyne RL10 data sheet (2021) and ULA NROL-101 booklet (22,900 lbf = 101.9 kN). Note that Juno and KA-01 flew the RL10A-4-2 (99.2 kN / 450.5 s, AVUG; 22,600 lbf, ULA KA-01). | input | high | ULA NROL-101 booklet; AR data sheet (quoted) |

**Disagreements to pin.**

- Hardware: the catalogue Atlas V 551 flies GEM 63 strap-ons and an RL10C-1 (the 2020+ configuration). The Juno reference (2011) flew AJ-60A strap-ons (46,697 kg each, 1,688.4 kN max, 92–95 s) and an RL10A-4-2. Juno's SRB-jettison and BECO rows therefore compare different motors, 13.0 t apart in total at liftoff.
- BECO is early: T+250.2 s against 267.2 s (Juno, −6 %) and 263.1–263.5 s (GEM-era KA-01, ViaSat-3 F2). The burn is a depletion and the load and engine are the published ones. The cause is the throttle history: the model throttles back up at T+62 s (q below 22 kPa) instead of after SRB burnout, and has no 2.5 g hold before PLF jettison and no 4.6 g phase. Measured: 248.7 s with the published data; 268.5–269.2 s with the published structure at the model's uncited 0.6 level.
- The 5.0 g limit begins at T+211.9 s against Juno's 233.0 s (−21 s), for the same cause. This is not a reference row yet; it is a candidate held-out check.
- Fairing jettison: T+156.7 s (point mass) and 151.2 s (six-DOF) against 204.9 s (Juno), 184.8–194.1 s (GEM era). The model applies ULA's 1,135 W/m² to the nominal trajectory; ULA applies it to the 3-sigma heat flux, and its trajectory has the throttle-down and the 2.5 g hold. With the throttle structure the placard alone fires at 179.5–187.7 s.
- Max Q: T+41.8 s against 46.4 s (Juno), 45.6–54.5 s (GEM era). It is inside tolerance today by 0.2 s. With the published GEM 63 burn and the 500-series booster mass it reads 41.7 s, just outside (−10.1 %); that is not a reason to keep the old data.
- Liftoff at T+0.20 s against 1.0–1.1 s: the SRBs light at T+0 instead of T+0.8 s, and the RD-180 at T−2.5 s instead of T−2.7 s. Every model event is about 0.8–0.9 s early relative to the booklets' T-0 (engine ready).
- SRB jettison: all five at burnout + 5 s (T+97.1 s; sepDelay 5 is clock-fitted, audit B24). Published: pairs 1 and 2 at a predetermined q-dependent time, then 3–5 1.5 s later (AVUG; NH 105.0 / 107.0 s).
- Closed-loop hand-over at T+84.7 s (generic q < 4 kPa rule) against 110 s published (6 s after the initial SRB jettison). This is a step-5 item.
- Atlas/Centaur separation at BECO + 3 s against 6.0 s on every 551 timeline found.

**Open questions.**

- The RD-180's throttle level, and its start and end times, during the SRB phase of a 551: not found. The Juno booklet gives only the structure (down after pitch-over, up after max-Q and SRB burnout). AVUG gives 521 times (38/58 s). MSL's 541 commentary gives 76 % from about T+24 to about T+62 s. The model's 0.6 has no recorded origin. Measured: BECO and the 5.0-g onset depend on this one number (0.6 → 268.5 s / 233.0 s; 0.76 → 260.4 s / 224.9 s on Juno hardware), so it must not be chosen from them.
- Does Juno (551) fly the 2.5 g hold before PLF jettison? AVUG says 500 series and MSL (541) did; the Juno booklet is silent. When does the hold begin? The probe assumed the first time 2.5 g is reached after SRB jettison.
- Which reference flight should Atlas V be validated against? Juno has a precise payload (3,625 kg, Wikipedia) but AJ-60A and RL10A-4-2 hardware. ViaSat-3 F2 matches the catalogue hardware (GEM 63; RL10C-1-1 rather than RL10C-1) but its payload is only 'more than 13,000 lb (6 t)'. KA-01 has no published payload mass.
- How much propellant is left at BECO? The low-level sensor stops the engine before depletion; the residual is not published. Each 1 % (2.8 t) is about 2–3 s of BECO at the final throttle.
- GEM 63: the Isp (279 s here, 279.06 s secondary), whether the 370,835 lbf maximum is vacuum or sea level, the sea-level pair (254 s / 1,180 kN, uncited) and the thrust-time curve: not found in a primary source. Does 49,300 kg include the nose cone and attach hardware, as the AJ-60A's 46,697 kg does?
- Does the C-ISA's 2,212 kg ('includes ISA, aft stub adapter & boattail') already include the 285 kg booster cylindrical ISA? AVUG lists the two separately.
- The RD-180 runs at partial thrust on the pad from T−2.7 s to full thrust at T+2.1 s (Juno); the levels are not published. The model is at full thrust from about T−1.5 s.
- Six-DOF effects of the proposals: not measured (forbidden on this machine). The six-DOF fingerprint for atlasv551 and the six-DOF timeline column would change.

## Proton-M / Briz-M (`protonm`)

**Tier.** B

**Cut-off logic.** Stage 1 (6x RD-276) stops at depletion, or close to it. I infer this from two statements: Proton-M's feed system was redesigned 'to reduce propellant residuals in these stages by 50 %' (stages 1, 2 and 3), and a purge system dumps all residuals from the spent first stage (MPG Rev 7 §A.2.1; RSW stage-1 page: 'by the time it finishes firing'). No source found says whether a level sensor or a command gives the signal. Stage 2 lights at 119.0 s at preliminary thrust and goes to full thrust when stage 1 separates at 123.4 s (MPG Table 2.3.1-1). The model burns stage 1 to depletion. With the published engine and load it runs dry at 118.4 s, 0.6 s before MPG's stage-2 ignition, and it then separates and lights stage 2 at once (p2 sepDelay 0, ignitionDelay 0). The hot-staging interval (119.0 to 123.4 s) is not modelled. With the catalogue's data it ran dry at 111.5 s.  Stage 2 is shut down by command (Zvezda/Proton-K: 'a command to cut off the second-stage propulsion system' after the stage-3 verniers lit). The command comes close to depletion. MPG: verniers at 332.1 s, stage-2 shutdown at 334.5 s, separation at 335.2 s. The model burns stage 2 to depletion. With 157 300 kg on 4 x 582 kN it runs dry at 335.0 s. Read as a prediction, the 0.5 s gap to MPG's 334.5 s command is about 360 kg (0.23 %), consistent with minimal residuals. On the 2.4 MN reading the stage would have to run dry before MPG's shutdown.  Stage 3 is cut off by guidance on velocity. The main engine stops first (MPG: 576.4 s), and the four RD-0214 nozzles fire 11.9 s longer to trim the final velocity (vernier shutdown 588.3 s, OU separation 588.4 s; RSW Zvezda: 'fine-tuning the vehicle's speed'). The propellant left is therefore a prediction. With KBKhA's flows on MPG's timeline it is about 0.4 t at vernier shutdown (0.9 %), or 0.5-0.8 t at main-engine shutdown in the model. The model burns the lumped stage to depletion: 5 kg left at 579.0 s with the proposed data. A fixed commanded cut-off at 576.4 s (cutoffAt) was measured. It leaves 0.62-0.83 t (1.3-1.8 %) on T-14R, but it takes the 5.75 t crew-ship row from 418 x 418 km in orbit to failed (or off target). That is because MPG's time belongs to the standard GTO stack, and a guidance cut-off happens at a different time for every orbital-unit mass. So it is not proposed, and the gap is pinned.  Briz-M: 'commanded to shut down either upon achieving a desired state vector or propellant depletion' (MPG §A.3.3). The model plans its burns itself.

**Guidance structure.** The Proton-M flies a 'standard ascent trajectory', which is required to meet the impact-point constraints of the jettisoned stages and fairing. It takes the orbital unit into a sub-orbital trajectory, and the Breeze M's first burn makes a 170-230 km parking orbit at 51.5 deg (MPG §2.3.1; T-14R). The roll starts at T+10 s. A single-fault-tolerant, majority-voting, closed-loop digital avionics system in the third stage guides stages 1-3. It 'enables greater ascent program design flexibility with respect to vehicle pitch profile' (MPG §A.2.4), which describes a pitch profile loaded before flight, flown inside a closed loop. The third stage ends on a guidance velocity cut-off with a vernier trim.  No published pitch-versus-time table was found, so a stored programme cannot enter as an input. The model flies the generic kick and gravity turn (kick 6 deg, 0.3 deg/s, pitchMax 25 deg) with a 150 km loft. These should be labelled generic: the kick values were set by hand for fleet acceptance (PHYSICS.md §5.2), and the loft is a fleet rule borrowed from Angara-A5, not a Proton source.  Material for a later Tier-A treatment exists. MPG Fig. 2.3.1-3 gives altitude, inertial velocity, q and acceleration against time (digitised: 11.0 km at 60 s, 50.4 km and 1 768 m/s at 120 s, 193.7 km and 4 634 m/s at 335 s, about 7 754 m/s at about 215 km at 576-588 s). Its stage-3 acceleration levels and its near-circular end state point to a lighter upper composite (about 21-22 t) than a GTO Breeze M stack, so it is a different mission profile. RSW gives Proton-M separation states (42.4 km, 126.4 km and 149.1 km; speeds with no frame stated). With these, Proton could reach Tier A, with T-14R held out.

**Sources.**

- ILS, Proton Launch System Mission Planner's Guide, LKEB-9812-1990, Revision 7 (July 2009), full PDF — https://www.ilslaunch.com/wp-content/uploads/pdf/Proton-Mission-Planners-Guide-Revision-7-LKEB-9812-1990.pdf (read): input. §A.2.1-A.2.3 and Table A.1-1: stage dry masses and loads, stage thrusts (10.0 MN SL and 11.0 MN vac; 2.4 MN; 583 + 31 kN), lift-off mass 705 t. §A.3 and Table A.3.3-1: Breeze M 2 500 kg dry, 19 800 kg propellant, 14D30 at 19.62 kN. Table 2.3.1-1: standard ascent event times. §2.4.2: fairing jettison at 340-350 s, timed for its impact area. §2.3.1 and §A.2.4: guidance structure. Fig. 2.3.1-3: acceleration, q, altitude and velocity traces, used only as ratio checks (digitised).
- ILS, Telstar 14R / Estrela do Sul 2 Mission Overview (2011) — https://www.ilslaunch.com/wp-content/uploads/2018/09/T-14R-Mission-Overview-final.pdf (read): check (held out; the repo's reference flight). Max Q 1:02; separations at 2:00, 5:27 and 9:42; PLF 5:47. Ignition sequence at T-2.5 s, 40 % at T-1.75 s, 100 % at T-0.9 s. Breeze M burn 1 from 11:46 to 16:13 into a 173 km circular parking orbit at 51.5 deg. About 5 000 kg separated mass.
- ILS web pages: Proton 1st and 2nd Stage, Proton 3rd Stage, Breeze M, Proton Breeze M — https://www.ilslaunch.com/proton-1st-and-2nd-stage/ (read): input: Breeze M inert mass 2 370 kg and 19 800 kg propellant (/breeze-m/). The pages repeat the MPG loads: 30 600 + 428 300 kg, 11 000 + 157 300 kg, 3 500 + 46 562 kg. Thrust 10.0 MN SL and 11.0 MN vac for stage 1, 2.4 MN for stage 2. Gross lift-off mass 705 t.
- en.wikipedia, Comparison of orbital rocket engines (RD-276 row, citing NPO Energomash engine.space/eng/dejatelnost/engines/rd-276/) — https://en.wikipedia.org/wiki/Comparison_of_orbital_rocket_engines (read): input, quoted: RD-276 1 831 882 N vac and 1 671 053 N SL, 315.8 s and 288 s, 1 120 kg. The Energomash page itself could not be opened (403; web.archive.org unreachable from here).
- en.wikipedia, RD-253 (RD-275M / RD-276 column) — https://en.wikipedia.org/wiki/RD-253 (read): cross-check of the RD-276 figures: 1 832 and 1 671 kN, 315.8 and 288 s
- en.wikipedia, RD-0210 and RD-0214 (citing the KBKhA 2015 archive page kbkha.ru/?p=8&cat=8&prod=33) — https://en.wikipedia.org/wiki/RD-0210 (read): input, quoted: RD-0210/0211/0213 at 582 kN vac and 326.5 s; RD-0214 at 30.9 kN and 293 s. The KBKhA archive itself was not opened.
- RussianSpaceWeb (A. Zak): Proton stage 1, stage 2 and stage 3 pages; RD-0210, RD-0212 and RD-253 pages — https://www.russianspaceweb.com/proton_stage1.html (read): Identifies the model's 419 410 kg and 156 113 kg as Proton-K loads. Proton-M figures: 2.4 MN and 157 300 kg on stage 2. RD-0210/0211 at 59.36 t (582 kN; the page's '593.6 kH' is a conversion slip) and 326.5 s. RD-0213 propellant-utilisation throttle. Separation states as checks, frame not stated: sep12 at 119.7-123.3 s, 42.4 km, 1 680-1 796 m/s; sep23 at 327.2 s, 126.4 km, 4 380.8 m/s; sep3 at 585.5 s, 149.1 km, 7 195.3 m/s.
- RussianSpaceWeb, Zvezda launch on Proton-K (2000) — https://www.russianspaceweb.com/iss-sm-launch.html (read): input to the cut-off logic, from another rocket (Proton-K). Stage 2 was cut off by command after the stage-3 verniers lit. The stage-3 main engine was cut off by command, and the four vernier nozzles fired 10 s more to trim the final velocity.
- Eurockot, Rockot User's Guide, Issue 5 Rev 0 (2011) — http://www.eurockot.com/wp-content/uploads/2012/10/UsersGuideIss5Rev0web.pdf (read): check: Breeze-KM main engine 20 kN, 325.5 s (same engine family as the 14D30)
- en.wikipedia, Proton-M and S5.98M — https://en.wikipedia.org/wiki/Proton-M (read): secondary cross-check only. Stage loads as in the MPG; S5.98M at 328.6 s. The infobox's 10 532 kN, 285 s and 108 s for stage 1 are not used.
- NPO Energomash RD-276 page (engine.space) — https://engine.space/dejatelnost/engines/rd-276/ (not opened): would be the primary source for the RD-276; its figures are quoted via en.wikipedia above
- KBKhA RD-0210/0212 page, 2015 archive — https://web.archive.org/web/20150815142815/http://www.kbkha.ru/?p=8&cat=8&prod=33 (not opened): primary source for the RD-0210/0213/0214 figures; its figures are quoted via en.wikipedia and RussianSpaceWeb

**Mass budget.**

| part | published | model | closes |
| --- | --- | --- | --- |
| First stage (p1) | 458 900 kg = 30 600 dry + 428 300 propellant (MPG Rev 7 §A.2.1; ILS web) | 450 000 kg = 30 600 + 419 400 | no |
| Second stage (p2) | 168 300 kg = 11 000 dry + 157 300 propellant (MPG §A.2.2; ILS web; RSW gives 11 400 kg dry for Proton-M) | 167 100 kg = 11 000 + 156 100 | no |
| Third stage (p3) | 50 062 kg = 3 500 dry + 46 562 propellant (MPG §A.2.3; ILS web) | 50 100 kg = 3 500 + 46 600 | yes |
| Briz-M (brizm) | 22 170 kg = 2 370 inert + 19 800 (ILS Breeze M web page); MPG Rev 7 §A.3 gives 2 500 kg dry (22 300 kg) | 22 170 kg = 2 370 + 19 800 | yes |
| Fairing (protonm) | PLF-BR-15255: 15.255 m long, 4.35 m at the spacer (MPG §4.1.3.1, §A.3); no mass published | 2 000 kg, 4.35 x 15 m | no |
| Lift-off stack | 705 t (MPG Table A.1-1; ILS web; T-14R overview) | 696.37 t at T-10 s with the 5 t T-14R payload (688.58 t at lift-off after 7.8 t burned on the pad); with the proposed loads 706.43 t (698.98 t at lift-off) | no |

**Proposals.**

| target | from | to | role | confidence | source |
| --- | --- | --- | --- | --- | --- |
| ENGINE_PARTS rd276.thrustVac | 1915 * kN | 1831.882 * kN | input | high | en.wikipedia 'Comparison of orbital rocket engines' citing engine.space/eng/dejatelnost/engines/rd-276/; https://www.ilslaunch.com/wp-content/uploads/pdf/Proton-Mission-Planners-Guide-Revision-7-LKEB- |
| ENGINE_PARTS rd276.thrustSL | 1745 * kN | 1671.053 * kN | input | high | same as above |
| ENGINE_PARTS rd276.ispVac | 316 | 315.8 | input | medium | en.wikipedia 'Comparison of orbital rocket engines' and 'RD-253' |
| ENGINE_PARTS rd276.source | UNCITED | 'NPO Energomash, RD-276 (engine.space, as quoted by en.wikipedia): 1 831.9 / 1 671.1 kN, 315.8 / 288 s; ILS Proton MPG Rev 7 §A.2.1: 11.0 MN vac, 10.0 MN SL for six' | input | high | as above |
| STAGE_PARTS p1.propellantMass | 419400 | 428300 | input | high | https://www.ilslaunch.com/wp-content/uploads/pdf/Proton-Mission-Planners-Guide-Revision-7-LKEB-9812-1990.pdf; https://www.ilslaunch.com/proton-1st-and-2nd-stage/; https://www.russianspaceweb.com/proto |
| STAGE_PARTS p1.source | `${UNCITED}; diameter: audit item B23` | 'ILS Proton MPG Rev 7 §A.2.1: dry ~30 600 kg, propellant ~428 300 kg; diameter: audit item B23' | input | high | ILS MPG Rev 7 |
| STAGE_PARTS p2.propellantMass | 156100 | 157300 | input | high | ILS MPG Rev 7; https://www.russianspaceweb.com/proton_stage2.html |
| STAGE_PARTS p3.propellantMass | 46600 | 46562 | input | high | ILS MPG Rev 7; https://www.ilslaunch.com/proton-3rd-stage/ |
| STAGE_PARTS p2.source and p3.source | UNCITED | 'ILS Proton MPG Rev 7 §A.2.2 (11 000 + 157 300 kg) / §A.2.3 (3 500 + 46 562 kg)' | input | high | ILS MPG Rev 7 |
| ENGINE_PARTS rd0210.ispVac | 327 | 326.5 | input | medium | en.wikipedia RD-0210 citing KBKhA (2015 archive); https://www.russianspaceweb.com/rd0210.html |
| ENGINE_PARTS rd0210.source and rd0213.source | UNCITED | 'KBKhA (2015 archive, via en.wikipedia/RSW): RD-0210/0211/0213 582 kN (59.36 tf), 326.5 s; RD-0214 30.9 kN, 293 s. ILS gives 2.4 MN for stage 2 (sensitivity), 583 + 31 kN for stage 3. SL figures are placeholders (air-lit)' | input | high | as above |
| ENGINE_PARTS rd0213.thrustSL | 520 * kN | 528.8 * kN | derived | low | arithmetic |
| STAGE_PARTS brizm.source | UNCITED | 'ILS, Breeze M page: inert 2 370 kg, propellant 19 800 kg, 14D30 19.62 kN; ILS MPG Rev 7 §A.3 gives 2 500 kg dry (2009)' | input | high | https://www.ilslaunch.com/breeze-m/ |
| protonm fairing: fairingSpec('protonm', { sepAltitude: 120e3, ... }) | no sepTime (heating placard) | sepTime: 348.2 | input | high | ILS MPG Rev 7 |
| FAIRING_PARTS protonm.length | 15 | 15.255 | input | low | ILS MPG Rev 7 |
| protonm stages[2] (p3) sepDelay / ignitionDelay | sepDelay: 1, ignitionDelay: 1 | sepDelay: 0.7, ignitionDelay: 2.4 | input | low | ILS MPG Rev 7 |
| protonm briz() sepDelay (Proton installation only; Angara-A5 keeps 2 s, RSW 746 to 748 s) | 2 | 0.1 | input | low | ILS MPG Rev 7 |
| comment above dragArea: 25 | 'It is dropped once the first stage separates in the sense that matters' | State that VehicleModel.frontalArea() returns the override for the whole flight; measured effect of dropping it at staging (14.86 m2 after) is ≤1 m/s at sep23 and sep34 | derived | high | src/physics/vehicle.ts:523-526; tests/_probe/protonm-audit.test.ts |
| §1 register (Fitted and derived values): add Proton-M rows | no Proton-M rows | Rows to add. dragArea 25 m2: derived (pi*2.05^2 + 6*pi*0.8^2 = 25.27 m2, RSW 4.1 m core and 1.6 m tanks; applies all flight). loftAltitude 150 km: construction (fleet rule for a hand-over below 0.4 g, figure borrowed from Angara-A5; no Proton source). kick 6 deg / 0.3 deg/s / pitchMax 25 deg: estima | derived | high | docs/FLIGHT-PROFILE-METHOD.md |

**Disagreements to pin.**

- Hot staging 1/2 is not modelled. Proton lights stage 2 at preliminary thrust at 119.0 s and separates at 123.4 s (MPG). The model separates and lights stage 2 at stage-1 depletion (118.5 s with the proposed data): 1.5 s before T-14R's 120 s and 4.9 s before MPG's 123.4 s.
- The stage-3 verniers are lumped with the main engine. The RD-0214 lights 5.5 s before the RD-0213 and runs 11.9 s after it (MPG 332.1 to 588.3 s). The model's stage-3 separation comes at 581.0 s, against MPG's 588.4 s (-7.4 s) and T-14R's 582 s (-1 s).
- Stage 3 is cut off by guidance with about 1 % reserve: prediction 0.4-0.9 t (MPG timeline, KBKhA flows). The model burns it to depletion (5 kg left). A fixed cutoffAt at 576.4 s breaks the 5.75 t crew row (measured), so it is pinned, not set.
- sep23 is 336.0 s against T-14R's 327 s (+2.8 %, inside tolerance), while MPG's table gives 335.2 s. ILS's 2.4 MN for stage 2 would give 329.7 s but cannot close MPG's own timeline. Unresolved, so 582 kN is kept.
- Pad start: the model ignites at T-2.5 s with a 1 s ramp and burns about 7.45 t on the pad (proposed data). The published sequence (40 % from T-1.75 s, 100 % at T-0.15 s in the MPG or T-0.9 s on T-14R) burns 2.8-4.4 t, so stage 1 ends about 1 s early. This is a fleet-wide mechanism, not Proton data.
- Max Q comes at 58.4 s at 37.2 kPa (proposed), against about 33.8 kPa at 65 s (MPG Fig. 2.3.1-3; table 65.5 s) and T-14R's 62 s (-5.8 %, inside tolerance). The generic kick is not fitted (Tier B).
- The ascent is higher than published at every staging (generic kick and 150 km loft, not fitted). sep12 is at 54.8 km against 42.4 km (RSW), sep23 at 156.1 km against 126.4 km, and the stage-3 separation at 202 km against 149.1 km. Speeds are ungraded because RSW does not state the frame.
- The Briz-M's first burn is 829 s and 5.1 t (proposed) or 770 s and 4.7 t (base), against T-14R's 267 s (about 1.6 t). It starts right after separation (581.5 s) instead of at 706 s. The three stages hand the Briz-M about 450 m/s less than the flown ascent.
- The MPG acceleration trace's absolute level is about 5 % below the model on stage 1 and 9-16 % above it on stage 3. Its upper composite is about 21-22 t against the model's 27.2 t T-14R stack, so only ratios are compared.
- dragArea 25 m2 applies through the whole flight, not only to stage 1 as the vehicles.ts comment says. The measured effect is ≤1 m/s.

**Open questions.**

- Proton-M stage-2 thrust: KBKhA's 4 x 59.36 tf = 2.33 MN against ILS's 2.4 MN. RSW lists 2.3 MN for Proton-K and 2.4 MN for Proton-M. Was the RD-0210/0211 uprated for Proton-M? A Khrunichev or KBKhA Proton-M figure would decide it.
- MPG Rev 7's timeline (2009: 123.4, 335.2 and 588.4 s) differs from T-14R (2011: 120, 327 and 582 s) and RSW (327.2 and 585.5 s). Is the MPG table a pre-Phase-III standard?
- What triggers the stage-1 and stage-2 shutdowns: a level sensor or a command? Not found explicitly. The MPG and RSW support near-depletion.
- Briz-M dry mass: 2 370 kg (ILS web, 'inert') against 2 500 kg (MPG 2009, 'dry'). Is the difference the lower spacer, which is jettisoned with stage 3? The auxiliary propellant tank, dropped after its 14.6 t is used, is not modelled.
- No published mass for the PLF-BR-15255 fairing; the 2 000 kg is an estimate.
- No published throttle range for the RD-276; minThrottle 0.6 is uncited (the model never throttles Proton).
- The origin of the catalogue's 1 745 / 1 915 kN RD-276 is not traced. 1 745 kN equals the RD-275's vacuum thrust (178 tf, RSW).
- Is MPG Fig. 2.3.1-3 a Breeze M ascent at all, or a three-stage LEO profile? Its upper composite is about 21-22 t and it ends near circular speed at about 215 km. This decides whether it can be a Tier-A target for GTO missions.
- Six-DOF effect of the proposed data (the heavy validation-timelines disagreement list) is not measured; six-DOF flights were not allowed here.
- Effects on pinned tests: fleet-defaults' Proton crew rows keep their verdicts (5.75 t in orbit, 7.15 t fails), but the margins move (-120 to -80 and -243 to -203 m/s), and insertionLimit(proton, 5750) = 1900 may move. The d01 identity fixture and the protonm fingerprints will change, as will design-warnings 'protonm weakUpperStage 3' and PHYSICS.md §6b payload rows. None was re-run here.

## Ariane 64 (`ariane64`)

**Tier.** A-needs-second-flight / B. A second Ariane 64 flight now exists: the VA268 launch kit (2026-04-30) gives four time/altitude points. Both A64 kits are planned timelines for the same kind of mission (32 Amazon Leo satellites, about 20 t, 465 km), so they are only partly independent. Two Ariane 62 kits (VA263, VA266) and the Vega-C User's Manual add shared-hardware checks. This audit covers steps 1-3 only.

**Cut-off logic.** ESR (P120C): the UM §2.3.1 says separation is "triggered by an acceleration threshold detection"; the A5 UM says the OBC "detects thrust tail-off". Separation is therefore at burn-out, not on a timer. The model uses the depletion sensor (tail-off reserve aboard) plus a 2 s sepDelay. That delay is unsourced and should be registered as an estimate. The mechanism is the same kind, but the times differ: published 143/145 s on A64, 134/138 s on A62, and 142 s burn-out & separation on Vega-C (UM); model 137.3 s.  LLPM (core): it is shut down by command. The UM says "the LLPM pursues its flight alone until reaching the ULPM injection orbit. The separation happens 6 seconds after." The A5 UM is identical, and its Annex 4 adds: "shut down command is sent by the OBC when the launcher has reached a pre-defined orbit or when a critical level of depletion … has been reached". So guidance commands the cut-off and depletion is only the backup. The four kits put main-stage separation at 463-466 s on both A62 and A64 (cut-off 457-460 s), so the commanded time hardly varies between missions. The model instead runs the core dry at 445.1 s.  Is the 15 s early cut-off data or logic? It is data: - 145 t (unsourced) burns at 324.1 kg/s from T-2.5 s. - Lighting at the published H0-7 s alone moves depletion to 440.6 s. - ESA's 154 t with the H0-7 s ignition moves it to 468.6 s. - With the commanded cut-off at 457 s (construction from VA267), the predicted residual is 3.77 t (2.44 %). With ESA's 329 kg/s flow it is 1.48 t (0.96 %). Both are positive, so there is no negative-reserve finding. - CNES's 150 t would run dry at 456.1 s, before VA268's 460 s cut-off: a negative reserve. Once the load is right the logic must change too, or the core runs about 10 s past the published time.  ULPM (Vinci): cut-off by guidance on the target orbit; the A5 UM text for the ESC says the same. The model uses closed-loop guidance, the same kind.  Fairing: the UM says it is released when the aerothermal flux falls below the required value (1,135 W/m² standard), "tuned to cope with Customer requirements". The model's placard uses exactly 1,135 W/m², but Ariane 64 bypasses it with a fixed sepTime of 200 s. The kits show the time depends on the mission: 191 and 194 s (A64), 210 and 270 s (A62). At VA267's 127 km the model atmosphere gives only about 100 W/m², and flying the 1,135 W/m² placard drops the fairing at about 106 km (164-196 s). So VA267 flew a much stricter customer criterion, and the kit time is a mission input.

**Guidance structure.** Nothing published describes how Ariane 6 is steered through the atmosphere. The Ariane 6 UM §2.3 describes only the event logic: ESR separation on an acceleration threshold, fairing on flux, LLPM flown "until reaching the ULPM injection orbit", and ULPM burns by mission. The A5 UM adds only that the upper-stage cut-off happens "when the guidance algorithm detects the final target orbit".  The only stored-programme statement for this hardware is the Vega-C UM's: the P120C stage flies "initial vertical ascent, programmed pitch maneuver and a zero-incidence flight". That is a different vehicle and cannot be borrowed under the method, except perhaps as the shape of the P120C phase if the owner decides the shared motor justifies it.  No Ariane 6 pitch table or tilt programme was found. A stored programme therefore cannot be an input. If a fit is attempted (tier A, now that VA268 exists), the kits supply four time/altitude points per flight. Use VA267 as targets and VA268 as held-out checks. Both are planned profiles for the same mission type, which limits their independence.  The model's guidanceDefaults are generic and set by hand against fleet-matrix outcomes, not against a source: kick 6°, 0.3°/s, pitchMax 35, pitchMin 10, loft 150 km. They are not in the register.  The point-mass agreement at ESR separation (87.1 km against 87 km) and at the fairing (128.5 against 127 km) came from compensating data errors: liftoff thrust 15 % high, core 16 t light, ULPM 2.7 t light. With the published data the same guidance flies 74 km at ESR separation and 156 km at core separation, against 87 km and 265 km. The six-DOF's 14-68 km excess (F9) was measured on the old data and has to be re-measured after step 1 before it can be attributed.

**Sources.**

- Arianespace launch kit VA267 (Amazon Leo LE-01), flight sequence p.5 (times and altitudes), launcher page (P120C 3,700 kN each, Vulcain 2.1 1,370 kN, Vinci 180 kN, liftoff 800 t / 15,000 kN, Vulcain ignition H0-7 s) — https://www.ariane.group/app/uploads/2026/02/LAUNCH-KIT-VA267-EN_FINAL.pdf (read): Timed commands as inputs (Vulcain ignition H0-7 s; fairing 191 s; separation 463 s, which gives the core cut-off construction). Altitudes 87/127/265/269 km are checks. Liftoff mass is not used (rounded).
- Arianespace launch kit VA268 (Amazon Leo LE-02, second Ariane 64, 2026-04-30) — https://www.ariane.group/app/uploads/2026/04/launch-kit-va268-en_final_launch-april-30.pdf (read): Held-out check: ESR separation 143 s / 86 km, fairing 194 s / 130 km, main-stage separation 466 s / 271 km, Vinci ignition 474 s / 275 km. Also an input for the separation-to-ignition gap (8 s).
- Arianespace launch kit VA266 (Ariane 62, Galileo L14), EN and FR — https://ariane.group/app/uploads/2025/12/LAUNCH-KIT-VA266-EN_FINAL.pdf (read): Shared-hardware check: ESR separation 134 s / 60 km, fairing 210 s / 110 km, main-stage separation 465 s / 195 km, Vinci 473 s. A62 liftoff thrust 8,000 kN, used to derive the Vulcain sea-level thrust. Separation-to-ignition gap 8 s (input).
- Arianespace press kit VA263 (Ariane 62, CSO-3) — https://ariane.group/app/uploads/sites/4/2025/03/PRESS_KIT_VA263_EN_FINAL_6_March.pdf (read): Shared-hardware check: ESR separation 138 s, fairing 270 s, main-stage separation 466 s, Vinci 474 s. Liftoff 500 t / 8,000 kN.
- Ariane 6 User's Manual, Issue 2 Revision 0 (March 2021), §2.3.1 ascent profile and Table 3.2.1.a quasi-static loads — https://ariane.group/app/uploads/sites/4/2024/10/Mua-6_Issue-2_Revision-0_March-2021.pdf (read): Input for cut-off and event logic: ESR separation on an acceleration-threshold detection; fairing released when the aerothermal flux falls below the required value (1,135 W/m² standard); LLPM flies until it reaches the ULPM injection orbit; separation 6 s after. Check: static acceleration at ESR end of flight up to 4.6 g, at LLPM cut-off up to 2.9 g. No stage masses are given.
- Ariane 5 User's Manual, Issue 5 Revision 2 (October 2016), §2.3 and Annex 4 — https://courses.edx.org/asset-v1:DelftX%2BAEASM1x%2B1T2022%2Btype%40asset%2Bblock/Ariane5_Users-Manual_October2016_Red.pdf (read): Heritage cross-check of the logic: main stage shut down when the intermediate target orbit is reached, separation 6 s after; EPC shut-down command at a pre-defined orbit or at a critical depletion level. Vulcain 2 pair 960 kN SL / 1,390 kN vac, ~310 s SL / 432 s vac, which is itself 3.9 % inconsistent.
- Vega C User's Manual, Issue 0 Revision 0, Table 2.3.1.a — https://ariane.group/app/uploads/sites/4/2024/10/Vega-C-users-manual-Issue-0-Revision-0.pdf (read): Check for the shared P120C: 'P120C burn-out & separation' at 142 s (60 km). P120C phase flown with 'initial vertical ascent, programmed pitch maneuver and a zero-incidence flight' (Vega-C only).
- ESA, The engines of Ariane 6 — https://www.esa.int/Enabling_Support/Space_Transportation/Ariane/The_engines_of_Ariane_6 (read): Input: P120C 142,000 kg, 130 s, 3,500 kN thrust, 'altitude at shutoff 53 km' (unclear, not used). Vulcain 2.1: 1,371 kN, 154,000 kg consumed, 468 s of operation, 'over 327 kg/s'. Vinci: 30,000 kg consumed, 180 kN, 900 s cumulated.
- ESA, Ariane 6: what's it made of? — https://www.esa.int/Enabling_Support/Space_Transportation/Ariane/Ariane_6_what_s_it_made_of (read): Input: main stage 23,000 kg without propellants, almost 154 t LOX/LH2. P120C about 142 t, about 4,500 kN max, 130 s. Upper stage 30 t. Stack 'almost 900 t'.
- ESA image caption, Closing the fairing for Ariane 6 flight VA267 (Feb 2026) — https://www.esa.int/ESA_Multimedia/Images/2026/02/Closing_the_fairing_for_Ariane_6_flight_VA267 (read): Input: 20 m fairing 2.6 t, 14 m fairing 1.8 t. P120C about 142 t, about 4,500 kN max.
- ESA image caption, Hot firing of Ariane 6's P120C motor (Oct 2020, Ariane 6 configuration) — https://www.esa.int/ESA_Multimedia/Images/2020/10/Hot_firing_of_Ariane_6_s_P120C_motor (read): Input (Ariane 6 configuration): 142 t, burned 130 s, max thrust about 4,500 kN.
- ESA, Hot firing proves solid rocket motor for Ariane 6 and Vega-C (first P120C firing, 2018) — https://www.esa.int/Enabling_Support/Space_Transportation/Hot_firing_proves_solid_rocket_motor_for_Ariane_6_and_Vega-C (read): Shows how burn times are defined: 'the test lasted 140 seconds', max 4,650 kN. ArianeGroup gives a 135 s combustion time for the same firing.
- ArianeGroup press releases on the three P120C firings (16 Jul 2018; 28 Jan 2019, misdated 2018 in the text; 7 Oct 2020, Ariane 6 configuration) — https://ariane.group/app/uploads/2024/07/Success-of-third-P120C-test-firingENG.pdf (read): Input: 142 t propellant, motor dry 11 t (case 8.3 t), Isp 278.5 s. Combustion time 135 s with max 4,650 kN (Vega-C configuration) and 130 s with max 4,500 kN (Ariane 6 configuration). The ESR is the P120C plus Ariane 6 equipment, notably the rear skirt. The 2018 'average thrust 4,500 kN' is physically impossible (the mean is about 2,870 kN) and is not used.
- Avio, Vega C page (P120C main data) — https://www.avio.com/vega-c (read): Manufacturer cross-check: 141.4 t, motor dry 11,200 kg, case 8,200 kg, max 4,780 kN, Isp 280.0 s, combustion 134 s (Vega-C configuration).
- CNES, Ariane 6 'Modèles' — https://cnes.fr/projets/ariane-6/modeles (read): Check: A62 530 t with 800 t of liftoff thrust; A64 860 t with 1,500 t; P120C 142 t, 350 t liftoff thrust, 130 s; LLPM 150 t of propellant (sensitivity); Vulcain 2.1 1,650 kg; ULPM 30 t.
- CNES, 'A64 : qu'est-ce qui change…' (12 Feb 2026) and 'Ariane 6 monte en puissance' (27 Apr 2026) — https://cnes.fr/actualites/a64-quest-change-cette-nouvelle-ariane-6-quatre-boosters (read): Check: A62 540 t / 8,400 kN, A64 870 t / 15,400 kN. Confirms a second A64 flight on 30 April 2026.
- DLR fact sheet, Ariane 6 Oberstufe (2022) — https://www.dlr.de/de/medien/publikationen/sonstige-publikationen/2022/factsheet-ariane-6-oberstufe/@@download/file/factsheet-ariane-6-oberstufe.pdf (read): Input: ULPM about 6 t unfuelled, 28 t LOX + 5 t LH2, Vinci 180 kN.
- eoPortal, Ariane 6 — https://www.eoportal.org/other-space-activities/ariane6 (read): Secondary, quoting the ArianeGroup data sheets: Vulcain 2.1 1,371 kN, 432 s, 118.8 bar, MR 6.03, 326 kg/s, 468 s; LLPM 140 t; Vinci 180 kN, 457.2 s, 34.1 + 5.59 kg/s; ULPM 31 t; P120C 142 t, 11 t dry.
- ArianeGroup Vulcain 2.1 data sheet (VULCAIN2.1_2020_04_PS_EN_Web.pdf, web.archive.org) — https://web.archive.org/web/20240726002959/https://www.ariane.group/wp-content/uploads/2020/06/VULCAIN2.1_2020_04_PS_EN_Web.pdf (not opened): Would be the input for the Vulcain 2.1 vacuum pair. Not opened: web.archive.org refused the connection. Figures are taken from eoPortal's quotation.
- ESA, Europe's next solid propellant rocket motor passes review (22 Apr 2025) — https://www.esa.int/Enabling_Support/Space_Transportation/Europe_s_Spaceport/Europe_s_next_solid_propellant_rocket_motor_passes_review (read): Page opened but the P120C/P160C numbers are in an image. The 153 t gross, 4,780 kN and 134 s are known only through Wikipedia's infobox and are not used.
- Wikipedia raw: Ariane 6, Vega C, Vulcain (rocket engine), Vinci (rocket engine), P120C — https://en.wikipedia.org/w/index.php?title=Vega_C&action=raw (read): Tertiary. It is the origin of the model's 4,323 kN P120C peak and 135.7 s burn time; Wikipedia's Vega C table, with no citation, labels the 4,323 kN as 'Average thrust'. Also LLPM 140 t, ULPM 32 t / 6 t, Vinci 457.2 s.
- NASASpaceflight, LE-01 launch report (51.9° inclination) — https://www.nasaspaceflight.com/2026/02/le-01-launch/ (not opened): Mission input already in reference-data.ts. Not re-opened.

**Mass budget.**

| part | published | model | closes |
| --- | --- | --- | --- |
| ESR (P120C strap-on, each) | Motor: 142 t propellant + 11 t dry (ArianeGroup 2018/2020; ESA; CNES), or 141.4 t + 11.2 t (Avio). The ESR is the motor plus Ariane 6 equipment (rear skirt etc.). No published ESR gross was found. | 13,000 dry + 142,000 propellant = 155,000 kg (body 'p120c' among the strap-ons, UNCITED) | no |
| LLPM (core, Vulcain 2.1) | ESA: 23,000 kg without propellants and almost 154 t LOX/LH2, so about 177 t gross (derived). ESA engines page: 154,000 kg consumed in 468 s. CNES: 150 t. ESA 2017 / eoPortal / Wikipedia: 140 t (older figure). | 15,700 dry + 145,000 propellant = 160,700 kg (UNCITED) | no |
| ULPM (upper stage, Vinci) | DLR: about 6 t unfuelled + 28 t LOX + 5 t LH2 = 39 t. ESA and CNES: 30 t consumed or carried. eoPortal 31 t; Wikipedia 32 t / 6 t. | 5,300 dry + 31,000 propellant = 36,300 kg (UNCITED) | no |
| Fairing, 20 m | 2.6 t (ESA VA267 caption); the 14 m fairing is 1.8 t | 2,900 kg (UNCITED) | no |
| Vehicle at liftoff, VA267 (about 20 t payload) | Launch kits: 800 t (A64) and 500 t (A62). CNES: 860 t / 870 t (A64) and 530 t / 540 t (A62). ESA: 'almost 900 t' with full payload. | 839.9 t (819.9 t stack + 20 t). Proposed data give 858.6 t. | no |
| Liftoff thrust (A64) | Kits: 15,000 kN (A64) and 8,000 kN (A62), which give 3,500 kN per P120C and 1,000 kN for the Vulcain. CNES: 15,400 kN, and 1,500 t / 800 t (14,710 / 7,845 kN). ESA and CNES: P120C 3,500 kN, '350 t' at liftoff. | 17,236 kN (4 × 1.52 × 2,677 + 960). The proposal gives 15,000 kN. | no |

**Proposals.**

| target | from | to | role | confidence | source |
| --- | --- | --- | --- | --- | --- |
| STAGE_PARTS 'llpm'.propellantMass | 145000 (source UNCITED) | 154000 | input | medium | https://www.esa.int/Enabling_Support/Space_Transportation/Ariane/Ariane_6_what_s_it_made_of ; https://www.esa.int/Enabling_Support/Space_Transportation/Ariane/The_engines_of_Ariane_6 |
| STAGE_PARTS 'llpm'.dryMass | 15700 (UNCITED) | 23000 | input | medium | https://www.esa.int/Enabling_Support/Space_Transportation/Ariane/Ariane_6_what_s_it_made_of |
| ariane64 stages[0] (llpm) cutoffAt | absent (core runs to depletion) | 457 | construction | medium | Ariane 6 UM Issue 2 Rev 0 §2.3.1; VA267 launch kit |
| ariane64 padBurnS | absent (Vulcain lit at T−2.5 s, the fleet rule) | 4.5 | derived | medium | VA263/VA266/VA267/VA268 launch kits |
| ariane64 stages[1] (ulpm) sepDelay | 3 | 6 | input | high | Ariane 6 UM Issue 2 Rev 0 §2.3.1 |
| ariane64 stages[1] (ulpm) ignitionDelay | 6 | 8 | input | medium | VA263, VA266, VA268 launch kits |
| ariane64 fairing.sepTime | 200 (construction from an unsourced '~200 s' GTO callout) | 191 | construction | medium | VA267 launch kit; Ariane 6 UM §2.3.1 |
| FAIRING_PARTS 'ariane64'.mass | 2900 (UNCITED) | 2600 | input | high | https://www.esa.int/ESA_Multimedia/Images/2026/02/Closing_the_fairing_for_Ariane_6_flight_VA267 |
| STAGE_PARTS 'ulpm'.dryMass | 5300 (UNCITED) | 6000 | input | medium | DLR fact sheet Ariane 6 Oberstufe (2022) |
| STAGE_PARTS 'ulpm'.propellantMass | 31000 (UNCITED) | 33000 | input | low | DLR fact sheet; ESA engines page (30,000 kg consumed) |
| ENGINE_PARTS 'vulcain21'.thrustSL | 960 kN (the Ariane 5 Vulcain 2's figure, UNCITED here) | 1000 kN | derived | low | VA263/VA266/VA267/VA268 kits; ESA engines page; CNES Modèles |
| ENGINE_PARTS 'vulcain21'.ispSL | 318 (no source found) | 314.6 (315.1 if the 1,371 kN / 432 s vacuum pair is taken) | derived | medium | derived from the two rows above |
| ENGINE_PARTS 'vulcain21'.thrustVac / ispVac | 1370 kN / 431 s (UNCITED) | 1371 kN / 432 s | input | medium | https://www.eoportal.org/other-space-activities/ariane6 ; ESA engines page |
| ENGINE_PARTS P120C as flown on Ariane 6: new variant (e.g. 'p120c-a6' on the Ariane 6 strap-on body) .peakFactor | 1.52 (4,323 kN, Wikipedia Vega C, uncited and labelled 'Average thrust' there, ÷ 2,845.6 kN) | 1.307 | derived | medium | ESA The engines of Ariane 6; CNES Modèles; launch kits VA266/VA267 |
| ENGINE_PARTS 'p120c' source/note (and the 'P120C 4 323 kN' line of the solid-motor table) | '${W}P120C ; ${W}Vega_C (peak 4 323 kN)'; mean thrust from 141.4 t / 135.7 s | Cite ArianeGroup (142 t, 11 t dry, 278.5 s; 135 s / 4,650 kN Vega-C configuration; 130 s / 4,500 kN Ariane 6 configuration), Avio (141.4 t, 11.2 t, 4,780 kN, 280.0 s, 134 s) and the Vega-C UM (burn-out & separation 142 s). Mark 4,323 kN and 135.7 s as Wikipedia, uncited. thrustVac is not changed unt | input | high | ArianeGroup P120C releases (2018, 2019, 2020); https://www.avio.com/vega-c ; Vega C UM Table 2.3.1.a |
| §1 'Fitted and derived values' register | no Ariane 64 rows | Rows for: - fairing.sepTime 191 s (construction, VA267 kit) - LLPM cutoffAt 457 s (construction: kit 463 s − UM 6 s) - padBurnS 4.5 s (derived estimate, kits H0−7 s) - P120C A6 head 1.307 (derived, 3,500 kN liftoff) - Vulcain 2.1 thrustSL 1,000 kN and ispSL 314.6 s (derived) - ESR dry 13,000 kg (est | construction | high | this audit |
| new TimelineReference ARIANE64_VA268 (held-out check) | absent | VA268, 2026-04-30, Kourou, 32 Amazon Leo, about 20 t, about 465 km. Milestones: boosterSep 143 s / 86 km; fairing 194 s / 130 km; coreSep 466 s / 271 km; Vinci ignition 474 s / 275 km. | input | high | https://www.ariane.group/app/uploads/2026/04/launch-kit-va268-en_final_launch-april-30.pdf |

**Disagreements to pin.**

- P120C thrust curve: published liftoff thrust 3,500 kN at sea level (about 3,720 kN vacuum) is below the published maximum of 4,500 kN (Ariane 6 configuration), so the real curve rises after ignition. The model's monotone regressive ramp cannot fly both. Today it starts at 4,069 kN sea level (+16 %); with the proposed head it never reaches 4,500 kN.
- P120C end of thrust: published combustion times are 130 s (A6 configuration), 134 s (Avio) and 135 s (Vega-C configuration). The end of thrust is later: ESA's test 'lasted 140 s' and the Vega-C UM has burn-out & separation at 142 s. ESR separation is 143/145 s on A64 kits and 134/138 s on A62 kits, the same motor with a 134-145 s spread. The model separates at 137.3 s (depletion + 2 s).
- Vulcain 2.1 flow: 1,371 kN / 432 s gives 323.6 kg/s. ESA states 'over 327 kg/s', and 154 t / 468 s is 329.1 kg/s; eoPortal gives 326 kg/s. The 1.7 % spread moves the predicted residual at 457 s between 3.8 t and 1.5 t.
- LLPM load across sources: 140 t (ESA 2017, eoPortal, Wikipedia), 150 t (CNES), 154 t (ESA 2024, engines page). The dry 23 t comes from one source.
- ULPM: DLR 6 t + 33 t loaded, against 30 t consumed by the Vinci (ESA, CNES).
- Liftoff mass: kits 800 t (A64) and 500 t (A62) against CNES 860-870 t and 530-540 t. Build-ups from published parts agree with CNES, not the kits.
- Fairing: the UM criterion is 1,135 W/m² (standard). The kits' 127/130 km on A64 correspond to about 100 W/m² in the model atmosphere, and the placard would drop the fairing at about 106 km. VA267 flew a customer-specific criterion, and the time depends on the mission (191/194/210/270 s).
- With the published data and the generic guidance, point-mass altitudes fall well below the kits: ESR separation 74 km against 87 km; core separation 156 km against 265 km. The current 87.1 / 128.5 km agreement comes from compensating data errors (liftoff thrust +15 %, core 16 t light, ULPM 2.7 t light), not from the guidance.
- Separation to Vinci ignition: 8 s on VA263, VA266 and VA268, 9 s on VA267.
- Core cut-off by construction at 457 s (VA267). VA268's derived 460 s is 3 s later: the variation between missions in a guidance-commanded cut-off.

**Open questions.**

- Is there a published thrust-time (or pressure-time) curve for the P120C in the Ariane 6 configuration? Not found. It would settle the head (3.5 MN sea level), the maximum (4.5 MN), and the tail to about 140-145 s, and would justify a progressive-regressive solid profile (new mechanism, off by default) in place of the monotone ramp.
- Which published P120C burn time matches the model's 'burn to tail-off' definition (130/134/135 s combustion time, or 140-142 s end of thrust)? A third source is needed, such as a published acceleration trace or the definition of 'combustion time', before thrustVac is changed. Today's 2,845.6 kN comes from Wikipedia's 141.4 t / 135.7 s.
- Why does the same motor separate at 134/138 s on A62 and 143/145 s on A64? Is the acceleration threshold set per configuration or per mission? Not found.
- How much do the Ariane 6 ESR's own parts (rear skirt, nose cone, attachments) weigh on top of the 11 t motor? Not found; 13 t stays an estimate.
- Is there a second source for the LLPM dry mass of 23 t, and does it include the interstage and booster attachment structure? Not found.
- What are the Vulcain 2.1's sea-level thrust and Isp? No Vulcain 2.1 source found; 1,000 kN is derived from rounded kit totals and 981 kN from CNES t-force.
- The ArianeGroup Vulcain 2.1 and Vinci data sheets (web.archive.org) could not be opened. Their figures are taken from eoPortal's quotation.
- ULPM: of DLR's 33 t loaded and ESA's 30 t consumed by the Vinci, how much does the APU use and how much is residual?
- What flux or criterion was specified for VA267's fairing (127 km at 191 s)? Should the model take a per-mission fairing time rather than a vehicle default?
- Ariane 6 atmospheric guidance (stored attitude programme or closed loop, and from when): not found in the Ariane 6 or Ariane 5 user's manuals. The Vega-C UM's 'programmed pitch maneuver and zero-incidence flight' is another vehicle's statement.
- The PHYSICS §6a / fleet-defaults callouts for the Ariane 64 GTO flight ('130-140 s', '~200 s', '~460 s') carry no source in the repo. Where are they from?
- VA267 and VA268 are planned timelines for the same mission type. Are they independent enough to serve as fit target and held-out check, or should the A62 kits and the Vega-C UM provide the independent checks?
- Ariane 64 Block 2 (P160C boosters) has flown since 17 June 2026. Should the catalogue's 'ariane64' stay Block 1 (P120C, as on VA267 and VA268) and be labelled so?

## Electron (`electron`)

**Tier.** B (steps 1-3 only: data, propulsion and cut-off logic, events; no trajectory fit)

**Cut-off logic.** STAGE 1. Published: not found whether MECO is commanded or at depletion. Rocket Lab calls it 'MECO'; there is no propulsive recovery, so no recovery reserve. Model: depletion (no cutoffAt), 16 kg left at T+138.3 s; the uncited maxAccel 60 m/s^2 (6.1 g) throttles the last ~1-2 s. With the published Rutherford pair, MECO is at T+130.0-130.6 s with ~11 kg left. Keep depletion until a source says otherwise.  STAGE 2. Published: a guidance cut-off into a transfer orbit, not depletion. The PUG (p.15) says 'Electron's second stage inserts the Kick Stage into a low elliptical orbit, before the Kick Stage initiates a burn of the Curie engine to circularize', and the published SECO varies by mission (535 s PUG example, 538 s NTT; ~572 s TROPICS per an unverified summary). So the propellant left at SECO is a prediction and should be near zero but non-negative. The batteries end two of the three HVBs' work at the hot swap (T+379 s NTT, L+388 s PUG), not the burn. Model (catalogue): the stage burns to 2.3 s of depletion and is cut off on a 165 x 200 km parking orbit at T+439.2 s. The Curie then flies an apogee-raising burn (T+471-803 s) that no published sequence has, before circularising at T+3252-3569 s. With the published 2,000 kg the stage depletes at T+398-403 s on a suborbital -340 x 200 km arc and the Curie has to make orbit. With a smaller Curie load (20 kg, a probe only) the model reproduces the published structure: S2 cut off by guidance on 200 x 588-592 km with 75-119 kg left, the Curie lit once at T+3163-3198 s for 203-214 s (NTT: T+3125 s for 160 s). The gate that decides the S2 cut-off therefore depends on an unsourced estimate, the 150 kg Curie load.  F7 candidates by role. (a) S2 load raised to ~3,000 kg so a full-flow burn lasts 387 s: construction, and it contradicts both the PUG's ~2,000 kg and the 13,000 kg lift-off mass (+700-1,000 kg). Rejected. (b) A constant S2 level of 67-70 % with 2,000 kg: construction, with no published throttle. At S2 ignition the stack is ~2,604 kg and full thrust gives T/W ~1.04, so a constant 0.67-0.70 cannot hold the stack up; flown, it ends suborbital (probes pub_s2lvl067, pub_s2lvl070). Rejected. (c) A profiled throttle (full early, reduced late, e.g. after the hot swap): the only shape physically compatible with the published figures, but no source gives it. Full thrust to the NTT hot swap would leave 251 kg for 159 s, 21 % of rated flow, below the model's 0.5 minimum, so even this profile needs reduced thrust before the swap. Not proposed; open. (d) S2 load 2,300 -> 2,000 kg: input (PUG). Proposed; F7 then reads 261 s against 373/387 s and is pinned as a disagreement among published figures. (e) A battery-jettison mass at T+379 s: the time is an input, the mass is not found. Not proposed. (f) cutoffAt: not applicable, because a commanded cut-off cannot lengthen a depletion burn.  KICK STAGE. Burns are commanded by mission guidance (NTT: circularisation, an 8 s argument-of-perigee trim, a perigee-lowering burn). Model: planner burns; no trim or deorbit burn.

**Guidance structure.** Nothing is published about how Electron is steered. The PUG v8.0 and the NTT press kit give no pitch programme, tilt table, kick angle or closed-loop start; 'GNC' appears only as an acronym and 'trajectory analysis' only as a mission-integration deliverable. The only structural statements are about the end of the ascent: S2 'inserts the Kick Stage into a low elliptical orbit' and the Curie circularises (PUG p.15), and the SECO time varies by mission, which points to closed-loop guidance on S2. No stored programme exists to serve as an input. Under tier B the model keeps the generic kick and gravity turn (kickAngle 6 deg, maxTurnRate 0.45 deg/s, pitchMax 35 deg, loftAltitude 0; uncited) and must stay labelled generic. Nothing is fitted and no other vehicle's programme is borrowed.

**Sources.**

- Rocket Lab, Electron Payload User Guide, Version 8.0 (Sept 2025; page footers still read V 7.0) — https://rocketlabcorp.com/assets/Rocket-Lab-Electron-Payload-User-Guide-8.0.pdf (read): input: 13,000 kg lift-off mass (p.12); stage 1 9x Rutherford at 5600 lbf sea level per engine, 311 s (p.12 table; the p.13 prose says '5,600 lbf (24 kN)'); stage 2 5800 lbf vacuum, 343 s, 'approximately 2,000 kg of propellant', 'burn time of approximately five minutes', two HVBs then a third, the first two jettisoned (p.13); Kick Stage dry 40 kg, Curie 120 N (p.18); fairing 44 kg (fairing page). Check: the example flight profile (p.15: MECO and stage 1 separation L+155 s at ~78 km, S2 ignition L+162 s at ~82 km, fairing L+184 s at ~126 km, battery jettison L+388 s, SECO L+535 s, S2 separation L+539 s), the performance curves (p.35: ~198 kg to 500 km SSO, ~193 kg to 600 km) and the 7.5 g axial MPE (p.42)
- Rocket Lab, Electron Payload User's Guide, Version 7.0 (1 Nov 2022) — https://rocketlabcorp.com/assets/Electron-Payload-User-Guide-7.0-v6.pdf (read): corroboration only: the same figures as v8.0 (13,000 kg, 5600/5800 lbf, 311/343 s, ~2,000 kg, five minutes, L+155/162/184/388/535/539 s, 40 kg, 120 N, 44 kg)
- Rocket Lab, 'No Time Toulouse' press kit (Electron, 20 June 2024) — https://rocketlabcorp.com/assets/Uploads/No-Time-Toulouse-Press-Kit.pdf (read): input: event intervals (engines ignite T-2 s; MECO 2:24, separation 2:28, S2 ignition 2:31; SECO 8:58, kick-stage separation 9:02). The absolute times are the reference flight's planned clock, used as checks: fairing 3:07, battery hot-swap 6:19, SECO 8:58, Curie burns 52:05-54:45 and 1:03:57-1:04:05, deployment done 1:06:35. Also lift-off mass 13,000 kg and the same engine table as the PUG
- Wikipedia, Rutherford (rocket engine), raw wikitext — https://en.wikipedia.org/w/index.php?title=Rutherford_(rocket_engine)&action=raw (read): secondary corroboration. Prose: 'The sea-level version produces 24.9 kN ... 311 s, while the vacuum optimized-version produces 25.8 kN ... 343 s'. The family infobox lists 'Updated' thrust(SL) 5600 lbf and thrust(Vac) 5800 lbf. The vacuum figure belongs to the vacuum version, which is the source of the model's mixed pair
- Wikipedia, Rocket Lab Electron, raw wikitext — https://en.wikipedia.org/w/index.php?title=Rocket_Lab_Electron&action=raw (read): secondary: stage 1 224.3 kN SL (= 9 x 24.9) and 234 kN vacuum (no reference on the vacuum figure, so not usable); three hot-swapped batteries, two jettisoned (citing Spaceflight101, 2017); fairing 44 kg; no stage masses
- Wikipedia, Curie (rocket engine), raw wikitext — https://en.wikipedia.org/w/index.php?title=Curie_(rocket_engine)&action=raw (read): secondary: 120 N and Isp 'approximately 320 seconds', citing Rocket Lab's 23 Jan 2018 release; propellant undisclosed
- Rocket Lab, 'Rocket Lab successfully circularizes orbit with new Electron kick stage' (23 Jan 2018) — https://rocketlabcorp.com/updates/rocket-lab-successfully-circularizes-orbit-with-new-electron-kick-stage/ (not opened): would be the primary for the Curie Isp (~320 s). Returned HTTP 403; the figure is taken from Wikipedia's Curie article
- Kineis, 'Nanosatellites: size doesn't matter' (150 kg payload per launch) — https://kineis.com/en/nanosatellites-kineis-size-doesnt-matter/ (not opened): input: the reference flight's payload, 150 kg. Taken from tests/validation/reference-data.ts; not re-opened
- NASA Small Satellite blog, TROPICS on Electron (May 2023) — https://www.nasa.gov/blogs/smallsatellites/2023/05/25/electrons-second-stage-separates (not opened): would show that SECO and the hot swap vary by mission (hot swap T+6:43, SECO T+9:32 per a search-result summary). The pages I opened carried no times, so this is unverified and not used
- Spaceflight101, 'Launch Week Arrives for Rocket Lab's Electron' (23 May 2017) — http://spaceflight101.com/launch-week-arrives-for-rocket-labs-electron/ (not opened): cited by Wikipedia for the three hot-swapped batteries. The archive could not be reached; not used for any number

**Mass budget.**

| part | published | model | closes |
| --- | --- | --- | --- |
| whole vehicle at lift-off | 13,000 kg (PUG v8.0 p.12; NTT press kit p.14); whether payload is included is not stated | 13,300 kg before payload (10,550 + 2,520 + 180 + 50); 13,450 kg with NTT's 150 kg; 13,305 kg at release after the T-3 s pre-liftoff burn | no |
| stage 1 (e1) | no dry or propellant mass published (PUG, press kit, Wikipedia) | dry 850 + propellant 9,700 = 10,550 kg (UNCITED; present since before the repo's history) | yes |
| stage 2 (e2) | propellant 'approximately 2,000 kg' (PUG v8.0 p.13); dry not published | dry 220 + propellant 2,300 = 2,520 kg (UNCITED) | no |
| stage-2 batteries (two HVBs jettisoned at the hot swap) | the event (NTT T+6:19 'Battery hot-swap'; PUG 'battery jettison' L+388 s, two of three HVBs jettisoned 'upon depletion'); mass not published | not modelled (implicitly inside e2's 220 kg dry mass for the whole burn) | no |
| Kick Stage (curie) | dry 40 kg (PUG v8.0 p.18); propellant not published ('tanks which can be scaled to meet mission-specific needs', p.17) | dry 30 + propellant 150 = 180 kg (UNCITED) | no |
| fairing | 44 kg (PUG v8.0 fairing page; Wikipedia) | 50 kg (UNCITED) | no |
| payload (reference flight) | 150 kg (Kineis, via reference-data.ts) | 150 kg | yes |

**Proposals.**

| target | from | to | role | confidence | source |
| --- | --- | --- | --- | --- | --- |
| ENGINE_PARTS 'rutherford'.thrustSL | 24 * kN | 24.91 * kN (5 600 lbf x 4.44822 N/lbf) | input | high | Rocket Lab Electron PUG v8.0 p.12 (also v7.0); NTT press kit p.14 |
| ENGINE_PARTS 'rutherford'.thrustVac (ispVac 343 kept, relabelled as an estimate) | 25.8 * kN (the Rutherford Vacuum's thrust), ispVac 343 'as published' | 27.47 * kN, derived as mdot x g0 x ispVac, with mdot = 24.91 kN / (g0 x 311 s) = 8.168 kg/s and ispVac 343 s as an ESTIMATE (the vacuum version's Isp, an upper bound for the sea-level nozzle) | derived | medium | PUG v8.0 pp.12-13; Wikipedia Rutherford (prose separates the two versions) |
| 'rutherford' source string and the comment above it | source `${W}Rutherford_(rocket_engine)`; comment argues the 24 / 25.8 kN pair against the published MECO near T+152 s | source: Rocket Lab Electron PUG v8.0 p.12 (5 600 lbf SL, 311 s); comment: the pair is the published sea-level operating point, the vacuum figure derived with an estimated 343 s, and the MECO gap pinned rather than argued from | input | high | PUG v8.0 |
| STAGE_BODIES 'e2'.propellantMass (and its source) | 2300 (source UNCITED) | 2000 (source: PUG v8.0 p.13, 'approximately 2,000 kg of propellant on board') | input | high | Rocket Lab Electron PUG v8.0 p.13 (also v7.0) |
| STAGE_BODIES 'curie'.dryMass | 30 | 40 | input | high | Rocket Lab Electron PUG v8.0 p.18 |
| FAIRINGS 'electron'.mass (and source) | 50 (source UNCITED) | 44 (source: PUG v8.0 fairing specification, 'MASS 44 kg') | input | high | Rocket Lab Electron PUG v8.0 (fairing page); Wikipedia Electron agrees |
| electron stages[1] stageSpec('e2') sepDelay / ignitionDelay | sepDelay: 1, ignitionDelay: 2 | sepDelay: 4, ignitionDelay: 3 | input | medium | NTT press kit p.13; PUG v8.0 p.15 (check on the sum) |
| electron stages[2] stageSpec('curie') sepDelay | 2 | 4 | input | high | NTT press kit p.13; PUG v8.0 p.15 |
| electron fairingSpec sepTime | (absent: heating placard, sepAltitude floor 105 km) | sepTime: 184 (PUG example profile), with NTT's 187 s left as the check | input | low | PUG v8.0 p.15 (L+184 s, ~126 km); NTT press kit (T+187 s) |
| §1 register ('Fitted and derived values'): new Electron rows | (no Electron rows) | Estimates: S1 propellant 9,700 kg (by difference from 13,000 kg, within 2 %); S1 dry 850 kg; S2 dry 220 kg; Curie propellant 150 kg (unsourced; decides the S2 cut-off structure and moves the LEO rating ~100 kg); Rutherford sea-level ispVac 343 s; maxAccel 60 m/s^2; maxQ 50 kPa; minThrottle 0.5; guid | estimate | high | this audit |
| §3 finding F7 text | '...unlike F1 no published stage mass exists to correct it (Rocket Lab does not publish them), so it is not applied.' | The PUG's ~2,000 kg is applied. At the published 25.8 kN / 343 s it lasts 261 s, against the PUG's own 373 s example and 'five minutes' and NTT's 387 s. Only a mean flow of ~67-70 % reconciles them, and no source gives a schedule; a constant level is excluded (T/W ~1.04 at S2 ignition at full thrust | input | high | PUG v8.0 pp.13, 15; NTT press kit |

**Disagreements to pin.**

- F7, Electron stage 2 burns short: published load 2,000 kg at the published 25.8 kN / 343 s lasts 261 s, against 373 s (PUG example), 387 s (NTT) and 'approximately five minutes' (PUG prose). With the proposed data SECO is T+398.5 s against 538 s (-26 %); on catalogue data it is 439.2 s (-18 %). Cause: the published figures disagree with one another unless the stage runs at ~67-70 % mean flow, and no throttle schedule is published. Not tuned.
- Electron stage 1 burns short: at the published sea-level pair (73.5 kg/s), any load the 13 t gross allows burns in <= ~133 s. MECO is T+130.6 s against 144 s (NTT) and 155 s (PUG example), which need 84-90 % mean flow. Cause unknown (unpublished throttling, or the 5,600 lbf rating is not the flown level). On catalogue data the 138.3 s MECO hides about 6 % of this behind the vacuum engine's flow.
- Electron event structure: the model's S2 ends on a parking orbit (catalogue) or by depletion on a suborbital arc (published data), and the Curie flies an apogee-raising burn right after SECO that no published sequence has. The real S2 is cut off by guidance into a transfer orbit and the Curie circularises once at ~T+3125 s for 160 s. Cause: S2's short burn plus the unsourced 150 kg Curie load, which makes the planner treat the Curie as a finishing stage.
- Electron payload checks on published data: computed LEO rating 262 kg (0.87 of 300, met), but 200 kg does not reach 500 km SSO (PUG ~198 kg) or the 600 km preset (PUG ~193 kg), and 180 kg reaches neither once the 7 s separation coast is added. Cause: the uncited 150 kg Curie load is carried as dead mass (with 20 kg the same data rate 370 kg LEO, 1.23x). Not to be tuned by choosing the Curie load.
- Electron fairing: on the heating placard it drops at T+161 s / 112 km with the published propulsion, against 187 s (NTT) and 184 s at ~126 km (PUG). The jettison criterion is not published.
- Electron max Q: T+47-51 s against the 60-70 s callout; generic guidance and the drag model, no published programme.
- Electron battery hot swap (T+379 s NTT, L+388 s PUG) is not modelled; the jettisoned HVB mass is not published.
- Electron engines are lit at T-3 s (fleet hold-down convention) against NTT's T-2 s.

**Open questions.**

- What are the sea-level Rutherford's vacuum thrust and Isp? Not published; 343 s is the vacuum version's, and Wikipedia's 234 kN stage-1 vacuum figure has no reference.
- How is the S2 throttled? A schedule is needed to reconcile 2,000 kg, 5,800 lbf, 343 s and a 373-387 s burn. Rocket Lab webcast telemetry (speed and altitude against time) could give S2 acceleration and settle it; not opened here.
- What mass do the two HVBs jettisoned at the hot swap have? Not found.
- What propellant load does the Kick Stage (Curie) carry? Not published ('scaled to meet mission-specific needs'). NTT's published burns use ~6.4 kg; the model carries 150 kg.
- Does the published 13,000 kg lift-off mass include the payload (and a nominal Curie load)? Not stated.
- What are the stage dry masses (S1 850 kg, S2 220 kg in the model)? Not found.
- Does stage 1 cut off on command or at depletion? Not found.
- Is the fairing released at a set time or on a heating or altitude criterion? Not found.
- What are the sources for maxAccel 60 m/s^2, maxQ 50 kPa and Rutherford minThrottle 0.5? Only a 7.5 g axial MPE envelope (PUG p.42) was found.
- Should NTT's Curie first ignition (T+3125 s) be added to ELECTRON_NTT as a held-out check of the event structure? The catalogue model lights the Curie at T+471 s.

## H-IIA 202 (`h2a202`)

**Tier.** B

**Cut-off logic.** SRB-A3: the motors burn out (solid). Separation is a command after burnout. JAXA's F40 sheet defines burnout as chamber pressure falling to 10 % of maximum and separation as aft-brace separation (F40: 111 s and 127 s). MHI Table 2.1-2 gives 99 s and 106 s for the 202 on GTO with the high-pressure motor. F15 (plan) gives 116 s and 126 s with a long-burn motor. The model ends the burn when the grain is gone (99.2 s) and separates 8 s later (`sepDelay: 8`, a construction from audit B24: ~100 to ~108 s). With the high-pressure motor that gives 105.1 s on GTO against MHI's 106 s. With the long-burn motor it gives 123.1 s on F50 against 124 s flown.  LE-7A first stage: the published burn time is 390 s. MECO comes at X+392 to 400 s on four sources, and on F15 and F50 it came 4-5 s after the prediction. A depletion cut-off is consistent with that. The only explicit statement found ('burn to depletion') is in a secondary guide that I could not open, so the basis is weak. The model also cuts off at depletion (no `cutoffAt`), at T+390.6 s with 20 kg left. Since this is depletion, no reserve is predicted.  LE-5B second stage: commanded by guidance. MHI §2.1.1.2: 'Just after the second stage (including the payload) is injected to the parking orbit, the engine shuts down once (SECO1) ... when the second stage reaches the planned transfer orbit, the engine cutoff occurs again (SECO2)'. On F50 there was a single burn from SELI at 417 s to SECO at 916 s (499 s) straight into the 666 km SSO. At 31.3 kg/s and full thrust that uses about 15.6 t of the 16.6 t usable. The predicted propellant left is therefore about 1.0 t; this is derived and assumes full thrust (LE-5B-2 can throttle, and no source says whether it did). The model also commands SECO by guidance, but it flies a different profile. SECO-1 comes at T+760.4 s into 200 x 652 km with 5.4 t left, it circularises at T+3551 s, and it ends with 5.1 t left. F15 (412 to 911 s) and F40 (409 to 919 s) also used one direct burn.

**Guidance structure.** Published: JAXA lists the guidance method as 'Inertial Guidance Method'. MHI Table 1.3-1 lists a Guidance Control Computer on the first stage, and on the second stage a Guidance Control Computer and an IMU for 'Guidance, Navigation, Control and Vehicle Sequencing'. 'Guidance flight mode on' is at X-18 s. I found no published pitch programme, tilt table or closed-loop start time, so a stored programme cannot be an input.  What does exist could serve as checks or later fit targets: - MHI's typical GTO figures for the 202: acceleration and relative velocity (Fig. 2.3-7), altitude (2.3-8), altitude against range (2.3-9). - JAXA's F15 plan, which gives altitude and inertial velocity at nine events of the same 666 km SSO: SRB-A burnout 47 km / 1.6 km/s, fairing 147 km / 2.0 km/s, MECO 298 km / 3.2 km/s, SECO 671 km / 7.5 km/s.  Those numbers show a lofted SSO ascent. Against them, the model on F50 reaches MECO at 191 km and 5.11 km/s inertial, and SRB burnout at 1.17-1.21 km/s.  The model flies the generic kick and gravity turn (kickAngle 4, maxTurnRate 0.3, pitchMax 35, loftAltitude 0). vehicles.ts says these were chosen by hand against the fleet acceptance cases ('A 4° kick was measured at 11 of the 12 fleet cases'). That is a hand-set value, and it is not in the VALIDATION §1 register. Under tier B the profile stays generic and should be labelled as such.

**Sources.**

- MHI, H-IIA User's Manual Ver. 4.0 (Feb 2015, YET04001) — https://www.mhi.com/jp/products/pdf/manual.pdf (read): input: Table 1.3-1 (289 t without payload incl. adapter; S1 100 t usable, LE-7A 1098 kN / 440 s / 390 s; SRB-A for H2A202 65 t, 2520 kN max (vac), 283 s, 100 s; SRB-A for H2A204 66 t, 2300 kN max, 120 s, 'can be also used for H2A202 (option)'; S2 16.6 t usable, LE-5B 137 kN / 448 s); Table 2.1-2 standard GTO H2A202 sequence (LE-7A ignition X-4.7, SRB-A ignition X-0.6, SRB-A burnout 99, sep 106, fairing 245, MECO 396, stage sep 404, SEIG1 410, SECO1 753, SEIG2 1463, SECO2 1659, S/C sep 1706); section 2.1.1.1 (fairing separated after free-molecular heat flux < 1135 W/m2, timing differs per mission); section 2.1.1.2 (SECO commanded at orbit). Fig. 2.3-7 (acceleration and relative velocity, standard GTO, H2A202): derived/check, digitized
- JAXA, SRB-A3 page (high-pressure and long-burn motors) — https://www.rocket.jaxa.jp/rocket/engine/srba/ (read): input: high-pressure motor 75.5 t gross / 64.9 t propellant / 98 s total burn / 283.6 s vac; long-burn motor 76.6 t / 66.0 t / 116 s / 283.6 s; a 202 picks either motor by required performance; 4-SRB configurations use the long-burn motor
- JAXA, LE-7A page — https://www.rocket.jaxa.jp/rocket/engine/le7/ (read): input: long nozzle 1098 kN vac, MR 5.9, ~1.8 t (H-IIA F8, F9, F11 onwards); short nozzle 1074 kN; long nozzle +28 kN and +11 s Isp over the short one
- JAXA, LE-5B page — https://www.rocket.jaxa.jp/rocket/engine/le5b/ (read): input: LE-5B 137 kN, MR 5, 448 s; LE-5B-2 (H-IIA F14 onwards) 446.6 s and 534 s operating time
- JAXA, H-IIA launch vehicle specifications (English) — https://global.jaxa.jp/projects/rockets/h2a/index.html (read): input: liftoff 289 t without payload; S1 114 t / 101.1 t propellant / 390 s / 440 s; SRB-A 151 t and 130 t (2 units), 5040 kN (2 units), 100 s, 283 s; S2 20 t / 16.9 t / 137 kN / 530 s / 448 s; payload fairing 1.4 t, 4.07 m x 12 m; inertial guidance
- JAXA/MHI, H-IIA F50 launch results to MEXT (2025-07-04) — https://www.mext.go.jp/content/20250703-mxt_uchukai01-000043486_000002.pdf (read): check (the reference flight, as flown, with predictions): SRB-A sep 124 (122), fairing 266 (259), MECO 400 (395), stage sep 408 (403), SELI 417 (412), SECO 916 (915), GOSAT-GW sep 967 (966)
- JAXA, H-IIA F15 (GOSAT, 2009) launch sequence, planned, with altitude and inertial velocity — https://global.jaxa.jp/countdown/f15/overview/sequence_e.html (read): check / evidence: same 666 km SSO; SRB-A burnout 116 s (47 km, 1.6 km/s), jettison 126 s (54 km, 1.7 km/s), fairing 270 s (147 km, 2.0 km/s), MECO 396 s (298 km, 3.2 km/s), SEIG 410 s, SECO 911 s (671 km, 7.5 km/s): long-burn motor, lofted ascent, single second burn
- JAXA/MHI, H-IIA F15 launch results (SAC, 2009-01-28) — https://www.jaxa.jp/press/2009/01/20090128_sac_h2a-f15.pdf (read): check: planned/flown SRB sep 125/128, fairing 270/275, MECO 394/398, stage sep 402/406, SEIG 408/412, SECO 903/911 s
- JAXA, H-IIA F40 (GOSAT-2, 2018) flight sequence (quick look) — https://www.jaxa.jp/press/2018/10/files/H-IIA_F40_Flight_Sequence_jp.pdf (read): input (definitions): SRB-A burnout = chamber pressure at 10 % of maximum (111 s), SRB-A separation = aft brace separation (127 s); MECO 392, stage sep 400, SELI 409, SECO 919 s
- MHI, LE-7A product page — https://www.mhi.com/business/products-services/space-defense/rocket-engines-testing/h2a-h2b-first-stage-engine-le-7a (read): input: 112 t (1098 kN) vac, 440 s vac, 1780 kg
- JAXA, H-IIA F11 press guide (English) — https://www.jaxa.jp/countdown/f11/presskit/h2a-f11_guide_e.pdf (read): context: SRB-A thrust pattern optimized to equalize dynamic pressure and acceleration (H2A204)
- Wikipedia, H-IIA (raw wikitext) — https://en.wikipedia.org/w/index.php?title=H-IIA&action=raw (read): secondary, superseded: SRB-A 2260 kN and 120 s (the model's peakFactor basis), 285 t liftoff for 202
- Encyclopedia Astronautica H-2A-1 / H-2A-2 — http://www.astronautix.com/h/h-2a-1.html (not opened): secondary: S1 113.6 / 13.6 / 100 t, S2 19.6 / 3.0 / 16.6 t (quoted in src/data/parts.ts; not opened in this audit)
- AIAA vehicle guide, H-IIA/H-IIB vehicle design (Isakowitz-type) — https://aiaa.org/vehicle-guide/vehicles/h-iia-h-iib/vehicle-design (not opened): secondary: 'burn to depletion' for the stages, seen only in a search-result summary (page returned 403/404)

**Mass budget.**

| part | published | model | closes |
| --- | --- | --- | --- |
| first stage (LE-7A core) | 114 t gross, 101.1 t propellant loaded (JAXA); 100 t usable (MHI Table 1.3-1) | 13 600 dry + 100 000 propellant = 113 600 kg | yes |
| SRB-A3 strap-on (each) | high-pressure motor 75.5 t gross = 64.9 t propellant + 10.6 t inert; long-burn motor 76.6 t = 66.0 + 10.6 (JAXA). MHI gives 65 t (202 column) and 66 t (204 column / 202 option) | 8 700 dry + 66 800 propellant = 75 500 kg | no |
| second stage (LE-5B) | 20 t gross, 16.9 t propellant loaded (JAXA); 16.6 t usable (MHI) | 3 000 dry + 16 600 propellant = 19 600 kg | yes |
| payload fairing (4S) | 1.4 t, 4.07 m x 12 m (JAXA) | 1 400 kg, 4.07 x 12 m (source UNCITED in parts.ts) | yes |
| whole vehicle without payload | 289 t including payload adapter (MHI Table 1.3-1; JAXA) | 285.6 t (no adapter modelled) | no |

**Proposals.**

| target | from | to | role | confidence | source |
| --- | --- | --- | --- | --- | --- |
| STAGE body 'srba' (SRB-A3 solid boosters): propellantMass, dryMass | dryMass: 8700, propellantMass: 66800 | dryMass: 10600, propellantMass: 64900 (the high-pressure motor of MHI's H2A202 column) | input | high | https://www.rocket.jaxa.jp/rocket/engine/srba/ ; https://www.mhi.com/jp/products/pdf/manual.pdf (Table 1.3-1) |
| ENGINE 'srba3': thrustVac, thrustSL, peakFactor | thrustSL: 1736 * kN, thrustVac: 1857.9 * kN, ispSL: 265, ispVac: 283.6, peakFactor: 1.22 | thrustVac: 1841.8 * kN (64 900 kg x 9.80665 x 283.6 s / 98 s); thrustSL: 1721.0 * kN (same 265/283.6 ratio, still an estimate); peakFactor: 1.368 (2520 / 1841.8), by the fleet's peak/mean convention | derived | medium | JAXA SRB-A3 page; MHI H-IIA User's Manual Table 1.3-1; JAXA H-IIA page (5040 kN for 2 units) |
| SRB-A3 thrust-time shape: a new, optional tabulated vacuum thrust for a solid motor, off by default for every other motor | linear regressive ramp from peakFactor (solidProfile) | per motor, vac kN at t = 0/5/10/15/20/25/30/35/40/45/50/55/60/65/70/75/80/85/90/95/98 s: about 2180/2170/2330/2400/2370/2410/2420/2320/2140/2010/2010/2020/2030/2070/2090/1870/1180/680/330/90/0. Inverted from MHI Fig. 2.3-7 (m0 = 293 t) and scaled by 1.0245 so the impulse closes on JAXA's 64.9 t at 2 | derived | low | https://www.mhi.com/jp/products/pdf/manual.pdf (Fig. 2.3-7) |
| new long-burn SRB-A3 (engine 'srba3lb' + body 'srbalb'), flown by the F50 reference mission | no long-burn motor in the catalogue; F50 flown on the 100 s motor | body: dryMass 10600, propellantMass 66000. Engine: thrustVac 1582.4 * kN (66 000 x 9.80665 x 283.6 / 116), thrustSL 1478.6 * kN (same SL ratio, estimate), ispVac 283.6, ispSL 265, solid, peakFactor 1.453 (2300 / 1582.4, by convention). Keep sepDelay 8. The F50 mission selects it (needs a vehicle ove | input | medium | https://www.rocket.jaxa.jp/rocket/engine/srba/ ; MHI Table 1.3-1 (H2A204 column, 'Can be also used for H2A202 (option)'); MEXT F50; JAXA F15, F40 |
| h2a202 stages[1] stageSpec('h2a2') sepDelay (MECO to stage separation) | sepDelay: 6 | sepDelay: 8 | input | high | MHI H-IIA User's Manual Table 2.1-2; MEXT F50; JAXA F15 and F40 sheets |
| h2a202 fairing sepTime and the comment above it | fairingSpec('h2a202', { sepAltitude: 150e3, sepTime: 250, ... }); comment: 'jettisons it at about T+4:05 near 150 km. As elsewhere this is only the fallback ceiling: the heating placard fires first, at T+164-172 s on these trajectories.' | sepTime: 245, citing MHI Table 2.1-2 (standard GTO, H2A202). Comment: per MHI §2.1.1.1 the fairing goes after free-molecular heating < 1135 W/m2, at a time set per mission (245 s standard GTO, 205 s long-coast GTO, 259 s planned for F50). With sepTime set, the placard is not consulted; on F50 the pl | input | medium | MHI H-IIA User's Manual §2.1.1.1 and Table 2.1-2 |
| ENGINE 'le5b' ispVac | ispVac: 447 | ispVac: 446.6 | input | medium | https://www.rocket.jaxa.jp/rocket/engine/le5b/ |
| source strings of 'le7a', 'le5b', 'srba3', the 'h2a1', 'h2a2' and 'srba' bodies, and the 'h2a202' fairing | source: `${W}H-IIA` (engines); `http://www.astronautix.com/h/h-2a-1.html ; ${W}H-IIA`; 'http://www.astronautix.com/h/h-2a-2.html'; `docs/history/AUDIT-2026-09-16.md ; ${W}H-IIA`; fairing source: UNCITED | MHI H-IIA User's Manual Ver. 4.0 (YET04001) Table 1.3-1; JAXA engine pages (le7, le5b, srba); JAXA H-IIA specifications page (stage masses 114/20 t, fairing 1.4 t, 4.07 x 12 m). Keep Astronautix as the secondary for the stage split. | input | high | https://www.mhi.com/jp/products/pdf/manual.pdf ; https://global.jaxa.jp/projects/rockets/h2a/index.html |
| PUBLISHED_BURN_TIME 'h2a202/h2a1/srba' | 'h2a202/h2a1/srba': 100,  // Wikipedia plus the audited SRB-A figures | 'h2a202/h2a1/srba': 98,  // JAXA SRB-A3 high-pressure motor, total burn time | input | high | https://www.rocket.jaxa.jp/rocket/engine/srba/ |
| §6a 'H-IIA 202, 4.1 t to GTO' published column (and the fleet-defaults milestone labels) | SRB-A burnout ~100 s, separation ~108 s, fairing ~250 s, MECO ~396 s | 99 s, 106 s, 245 s, 396 s (MHI Table 2.1-2, standard GTO, H2A202, 4.0 t rating) | input | high | MHI H-IIA User's Manual Table 2.1-2 |
| §1 register 'Fitted and derived values': add the H-IIA rows | no H-IIA rows | h2a202 SRB sepDelay 8 s: construction (B24, burnout ~100 to separation ~108; MHI 99/106). guidanceDefaults kick 4°, maxTurnRate 0.3, pitchMax 35, loft 0: set by hand against the fleet acceptance cases. LE-7A SL pair 843 kN / 337.8 s: derived from Wikipedia's 338 s. SRB-A3 SL 265 s: estimate. Fairing | construction | high | docs/FLIGHT-PROFILE-METHOD.md, rules |

**Disagreements to pin.**

- srbSep/time (F50 124 s flown against 107.1 s): F50 flew the long-burn SRB-A3 (66.0 t, 116 s total burn, by its timing and F15's and F40's), while the model flies a 100 s motor close to the high-pressure one. With the long-burn motor the model separates at 123.1 s with sepDelay unchanged. Pin until the reference mission flies that motor; do not tune sepDelay.
- seco/time (F50 916 s flown against 760.4 s): the cause is the mission profile and guidance, not propulsion. The real 202 lofts on SSO (F15 plan: MECO at 298 km, 3.2 km/s inertial) and inserts directly with one ~499 s LE-5B burn (F15 412 to 911 s, F40 409 to 919 s, F50 417 to 916 s). The model's generic turn reaches MECO at 191 km and 5.11 km/s, inserts into 200 x 652 km with 5.4 t left, and circularises at T+3551 s. The data variants move SECO by only +9 to +29 s (769.6-789.0 s).
- Second-stage ignition definition: F50's SELI (417 s) is thrust rise, 9 s after separation (F40 the same). The model's evt.ignition is ignition, separation + 6 s, as MHI's SEIG1. That is a 3 s definition gap on top of the 2 s MECO-to-separation gap (6 s against 8 s).
- Fairing row is not independent: the time is a mission-set input (MHI §2.1.1.1: after 1135 W/m2, different each mission; 245 s GTO, 205 s long-coast GTO, F50 259 s planned and 266 s flown). The model flies a fixed 250 s; on the placard alone it would go at T+163 s (catalogue) or T+215 s (long-burn data), because its trajectory is lower than the real one.
- SRB-A thrust shape: MHI Fig. 2.3-7 shows the acceleration peaking at about 31 m/s2 at T+73 s and tailing off from 74 to 96 s. The model's linear ramp runs to an abrupt burnout at 97-99 s with its acceleration still rising, and its relative velocity on the GTO typical is 0.80-0.88 of the trace at 50-80 s, catching up to 0.89-0.96 by separation.
- Core-phase acceleration trace: 1/a in Fig. 2.3-7 is linear (rms 0.02-0.03 m/s2) and gives F/mdot = 4149-4188 m/s (Isp 423-427 s) against 440 s published. The fairing step in the same trace (about 0.26 m/s2 for 1.4 t) gives F of about 1098 kN. The figure's own MECO is at about 387 s against its table's 396 s. This fits the short-nozzle LE-7A (1074 kN / 429 s, JAXA), so the figure probably predates F8. Flown MECO times (392-400 s) favour 440 s. Recorded as a losing reading; not used.
- Liftoff mass: 289 t without payload published (MHI, JAXA) against 285.6 t modelled. JAXA's own element masses sum to 286.4 t, so 2.6 t of the published total is not itemised in the source.
- First-stage burn length: the flown burns, from X-4.7 s ignition to MECO at X+392-400 s, last 397-405 s against 393 s for 100 t at the published 254.5 kg/s. The model's MECO is 2.3 % early on F50 and 1.4 % early on MHI GTO. Not tuned.

**Open questions.**

- Which SRB-A3 motor should h2a202 carry by default? The MHI 202 column, the GTO typical and the PHYSICS §6a windows point to the high-pressure motor; the late SSO flights (F15, F40, F50) flew the long-burn one. And how should the F50 reference select it: SimMission has no vehicleSpec override today. If the default became the long-burn motor, the fleet-defaults GTO windows (burnout 96-106 s, separation 104-114 s) would fail at 115/123 s.
- Is the LE-7A cut-off depletion or command? No primary source was found. The only explicit statement ('burn to depletion', AIAA/Isakowitz-type guide) could not be opened. F15 and F50 MECO came 4-5 s after prediction.
- Why does the flown first-stage burn (397-405 s from ignition) exceed 100 t at 254.5 kg/s (393 s)? JAXA's 101.1 t loaded against MHI's 100 t usable accounts for about 4 s. The start transient and in-flight thrust are not published. Ignition at X-4.7 s (MHI) against the model's fleet-wide T-2.5 s is the same question.
- No primary sea-level figures were found for the LE-7A (model 843 kN / 337.8 s) or the SRB-A3 (265 s). Wikipedia's LE-7A pair (870 kN, 338 s) is internally inconsistent.
- Did the F50 LE-5B-2 burn at full thrust throughout (it has 60 % throttling)? This affects the predicted ~1.0 t left at SECO. The F50 payload is 'about 2.6 t' (press kit); the exact mass was not found in an opened source.
- A published SRB-A3 thrust-time curve (high-pressure and long-burn, e.g. a JAXA/IHI paper) would replace the inversion from MHI Fig. 2.3-7, which depends on the model's own drag and pressure history.
- No source was found for the vehicle maxQ limit of 40 kPa (structural failure at 46 kPa).
- SSO rating: MHI gives 3.3 t at 800 km and 5.1 t at 500 km (Table 2.1-1, Fig. 2.4-1), and JAXA's English page about 4 t / 3.8 t at 800 km. vehicles.ts carries payloadSSO 3600 (source not stated). The model rates > 4.1 t at 600 km (PHYSICS §6b). Not examined here.
- For a later tier-A pass: F15's planned altitude and inertial velocity at nine events (same orbit, but a 2009 vehicle with SRB-A2) and MHI's GTO typical altitude/velocity figures are the only state points found. No H-IIA pitch programme was found.


## The critic's verdict

One skeptic over all eight reports, re-checking the arithmetic and opening the most consequential sources. Its implementation order is the order the changes were made in.

**Status.** The core Saturn V proposals are already in HEAD as commit `1890d7d`. The Vostok lesson-text fix is in as `49769e8`. Nothing was edited during this review.

**Sources I opened myself:**
- NG GEM 63 datasheet (text extracted)
- AVUG Rev 11, Fig. 1.4.1-4 and §3.2.7.5.2
- ILS Proton MPG Rev 7: Table 2.3.1-1 and §A.2
- Falcon User's Guide 2025: stage table and Tables 10-3/10-4
- Electron PUG v8.0, pp. 12–15
- ESA, "Ariane 6: what's it made of"
- JAXA SRB-A3 page
- FAI Gagarin records file, p. 7 (scanned; read as an image)
- FER AS-506 Table 20-9 (OCR)

**Working files** are in `(the session scratchpad) `:
- `arith.py`: all mass-closure and F/(g0·Isp) checks
- `solid.py`: the solid-motor profile analysis
- `*.txt`: extracted source text

---

### 1. Saturn V (saturnv506)

Applied in `1890d7d`: the F-1, the S-IC and S-II loads and dry masses, the S-II ignition delay, the re-referenced events, the EMR role, the pitch programme, the register, PHYSICS.md and the test pin.

**Accepted**
- **F-1 at 6,886.2 / 7,914.6 kN (derived).**
  - 2,071,295 kg ÷ 780.22 engine-s = 2,654.76 kg/s, giving 6,886.1 / 7,914.4 kN. The 0.1–0.2 kN difference is only the rounding of the flow.
  - Independent support: Table 20-9 (which I read) gives S-IC mainstage propellant of 2,069,957 kg, plus 598 kg of inboard tail-off and expended propellant. That is 2,070,555 kg, 0.04 % from the Table 5-2 reconstruction.
- **S-IC dry 164,995 kg.** 164,381 + 614. Table 20-9 confirms the 164,381 kg at separation.
- **S-IC load 2,102,829 kg (derived).** It closes against the published ignition mass less the 39.3 t build-up, to 11.4 t, which is the difference in pad burn.
- **S-II 439,005 / 49,179 kg** and **ignition delay 3.42 s**: accepted with the caveats under "Revised".
- **Events and jettisons re-referenced.** The applied mixture shift is at t = 332.32 s, not 332.28 s, because it came from 498.04 s. That is 0.04 s and doesn't matter.
- **EMR shift at 427 s, role changed to input.**
- **Pitch programme (input).**
  - I re-derived the Earth-rotation term: 0.004178 × sin 72.058° × cos 28.608° = 0.003490 °/s, against the auditor's 0.003495. The 0.1 % difference is immaterial.
- **PHYSICS.md §13.8 and the T+200 s test pin.**

**Revised (register wording; the data stay)**
- **S-IC LOX depletion is not a prediction.**
  - The flow is consumption ÷ engine-seconds up to the flown OECO, and the load is that same consumption. So the model empties at 161.63 s less the 0.3 s release offset by arithmetic identity.
  - The commit message and the register row both say "OECO T+161.40 s against 161.63 (a prediction)". Drop OECO time as a result.
  - The real checks are the OECO state, max Q, S-IVB cut-off and the orbit.
- **S-II cut-off time is near-identity as well.** Table 6-2 (consumption) and Table 6-1/Fig. 6-3 (flow) are one flowmeter reconstruction. The register's "S-II cut-off +0.1 / −0.2 s" should not be listed as a result.
- **The S-II dry mass mixes two readings.**
  - Its gross comes from Table 20-9 (443,236 kg loaded), but its load and residual come from Table 6-2.
  - The 807 kg between 49,179 kg and the itemised 48,372 kg (36,158 + 572 + 3,663 + 3,982 + 609 + 3,388) belongs to neither reading.
  - Table 20-9's own S-II at separation (43,436 kg, stage only) implies about 7.0 t left over, against the model's about 4.2 t.
  - Record this as the two-readings sensitivity. Don't correct it.
- **The pad term depends on the start rule.** The 27.9 t is the model's own burn from T−2.5 s (`simulation.ts`, `ignT = -2.5`). If that fleet rule changes, the liftoff mass moves silently. Say so in the register.
- **The 3.42 s ignores the model's start ramp.** The 1 s ramp (`LIQUID_STARTUP_S`, which scales flow too) means full flow effectively starts about 0.5 s after 165.72 s. This doesn't matter given the point above about S-II cut-off.
- **The S-IVB 1,795 kg unusable estimate** was proposed as a register row and the commit leaves it out. Add it.
- **Minor role overlap.** D5-15560-6 Table B-III supplies both the range angle used in the frame conversion and the FPA/altitude checks. The angle is at most about 1.7° by T+204 s, so the overlap is weak. Record it.
- **Ring jettison 4,591 → 3,982 kg.** Don't move the 609 kg into dry mass: that would carry it to S-II cut-off, which is worse than now. If it's done at all, add a separate 609 kg `interstage` jettison at about t = 0.38 s (166.1 − 165.72). Table 20-9 shows the ullage propellant gone by mainstage. The effect is about 1 m/s.

**Optional / deferred**
- J-2 sea-level placeholders 420.4 / 361.0 kN: the arithmetic is right, there is no flight effect, and they are vacuum-only. Lowest priority.
- S-IVB 107,095 / 13,963 kg: defer until the TLI leftover is measured against the 2,559 kg.

**Shared parts:** none. saturnv506 uses inline specs (F1_AS506, J2_SII, J2_SIVB) and literal stages. The fleet `saturnv` (parts f1/j2/sic/sii/sivb) is untouched.

---

### 2. Vostok-K (fleet `vostok8k72k` and historical `vostokk`)

**Accepted**
- **Blok E propellant 7,780 → 6,335 kg** (high). The 7.78 t was the gross mass entered as propellant. Also fix the comments in `parts.ts` above `blokE` and in the `vehicles.ts` Vostok header.
- **Strap-ons 3,710 / 39,590 kg** (medium-high).
- **Core 93,600 kg.**
- **RD107_1959 and RD108_1959 to Energomash** (high).
  - 102 tf = 1,000.28 kN and 83 tf = 813.95 kN; 96 tf = 941.44 kN and 76 tf = 745.31 kN.
  - The published pairs are 0.5–0.6 % inconsistent (326.1 vs 324.5 kg/s; 305.0 vs 306.7 kg/s) because the tf figures are integers. That is inside the 2 % pair rule. Record that thrust-SL derived from the vacuum flow would be 817.9 / 741.1 kN.
- **Rename and re-value the fleet parts** rd107-8d74k and rd108-8d75k. No side table keys on these names; grep finds them only in `parts.ts`.
- **Fairing diameter 2.7 m.**
- **Watch-mission SECO and payload-separation events** (low).
- **Register rows.**
- **Lesson brief and PHYSICS.md §13.6 attribution**: already applied in `49769e8`.

**Revised**
- **Lesson datum, 181 × 327 → 168 × 314 km.** Accepted, but on a corrected basis.
  - The FAI page says "a period of revolution of 89:34 minutes". Read as 89 min 34 s, that fits 181 × 327 km on the model's 6,378 km sphere (89.59 min Keplerian). So the auditor's argument alone doesn't settle it.
  - The deciding third source is TASS's preliminary 175 × 302 km at 89.1 min. That pair fits only a reference radius of about 6,368 km (nodal period 89.17 min at 6,371 km, 89.05 at 6,365 km, 89.31 at 6,378 km). So the Soviet heights were measured above the local surface, 10–13 km below the 6,378 km sphere.
  - That is consistent with GCAT's 168 × 314 km and with reading "89,34" as decimal minutes (89.36 nodal at 6,365 km).
  - Record "89 min 34 s / 181 × 327" as the losing reading.
  - Change the criteria and the brief together. The lesson's period answer is graded against the model's own orbit.

**Shared parts**
- blokE, blokBVGD-8k72k, blokA-8k72k, rd107-8d74k, rd108-8d75k and the vostok8k72k fairing are used only by the fleet `vostok8k72k`. What moves with them: lesson adv-vostok, the fleet matrix, `tests/design-build-tour.test.ts`, the d01 fixture, and the fleet and six-DOF fingerprints.
- The two -8k72k bodies are `variantOf` the Soyuz-2 bodies but carry their own numbers, so Soyuz is unaffected.
- RD107_1959 and RD108_1959 are used only by `vostokk`.

---

### 3. Falcon 9 (shares s2, mvac, merlin1d and `f9Stage2()` with Falcon Heavy)

**Accepted**
- **Second stage 4,000 / 107,500 kg, with its source** (medium). Falcon Heavy moves with it.
- **`f9Stage2` ignition delay 4 → 8** (medium). I checked the guide: LEO sample MECO 145, separation 148, SES-1 156 s; GTO 147, 151, 158 s. Falcon Heavy moves with it.
- **fleet-defaults label "MECO + 11 s"** (high). The old "MECO + 7 s" is at `tests/fleet-defaults.test.ts:762` and `docs/PHYSICS.md:1680`, with no source.
- **Minimum throttle 0.570 / 0.638** (medium). The guide says "190,000 lbf to 108,300 lbf sea level" and "220,500 to 140,679". First measure Falcon Heavy's side-booster landings at LZ-1 and LZ-2 and the six-DOF landing burn: a 57 % floor against 40 % changes the landing thrust-to-weight.
- **Source strings.**
- **Register rows** (bucket fitted by selection, maxAccel, reserves, droneShipReserve constants, fairing). High confidence.
- **"33 kPa" text fixes.** Verified at `docs/PHYSICS.md:1686`, `1691` and `vehicles.ts:305`.

**Revised**
- **Merlin 1D sea-level Isp 287.5 s.** Keep 282 s and record the 1.95 % inconsistency instead. 287.5 s mixes a 2013 Isp with 2016–18 thrust, and only `droneShipReserve` reads it.
- **Stage-1 acceleration hold at 37 m/s².** Defer. The value comes from the check set (the webcast trace) and needs a new mechanism. If adopted, label it "derived from the check set" and demote the GPS III SV01 and Bangabandhu-1 MECO rows to dependent. Until then, keep 45 m/s² registered as an estimate.

---

### 4. Atlas V 551 (every part here is used by Atlas V only)

**Accepted**
- **CCB dry 21,054 → 23,848 kg, with its source** (high). Verified in Fig. 1.4.1-4:
  - booster inert 21,351 kg
  - C-ISA 2,212 kg "(Includes ISA, Aft Stub Adapter & Boattail)"
  - cylindrical ISA 285 kg
  - §3.2.7.5.2 says the frangible joint sits inside the boattail, which stays with the booster.
  - The "ISA" inside the C-ISA is the Centaur conical ISA, so the 285 kg is not double-counted.
- **RD-180 and RL10C-1 sources.**
- **GEM 63 peak factor 1.331**, and the source moved to NG DS-26. Verified: 49,300 / 44,200 kg, 97.6 s, 370,835 lbf.
- **Burn-time pins 94 → 97.6 s** in `tests/data-consistency.test.ts`, the design-budget test and VALIDATION.md §8 (high). 94 s is the AJ-60A's burn time.
- **Centaur separation delay 3 → 6 s** (high).
- **Centaur dry 2,247 kg** (verified).
- **Fairing 3,799 kg**: the PLF's 3,524 kg plus the CFLR's 275 kg (verified).
- **Add a GEM-63-era check flight** (ViaSat-3 F2 or KA-01) and note Juno's hardware, before any structure work (medium).
- **The 2.5 g hold before PLF jettison** and **the 4.6 g phase before BECO**, as new mechanisms off by default (medium, published).
- **The timed core throttle-down held to SRB burnout** (low).
  - The 0.6 level goes back to the initial commit `de6ae33` with no source, the same origin as Falcon 9's bucket.
  - BECO and the 5.0 g onset depend on it, so they must stay checks.
- **GEM jettison construction** (low): only after choosing the reference flight, and registered. Note that `sepDelay` counts from the model's own burnout, so it goes stale whenever the GEM data change.

**Revised**
- **GEM 63 thrust.** Use 1,239.1 kN vacuum (44,200 / 97.6 × g0 × 279 = 1,239.07) and 1,124.7 kN at sea level. The report's 1,239.3 / 1,124.9 are slightly off.

**Rejected**
- **Fairing time 204.9 s on the catalogue vehicle.**
  - Juno is an AJ-60A flight; the catalogue vehicle flies GEM 63s.
  - The PLF time ends the 2.5 g hold, so it directly sets BECO.
  - Use the adopted GEM-era reference flight's time (184.8–194.1 s), or keep the placard and pin it.

**Shared parts:** ccb, rd180, centaur3, rl10c1, gem63 (engine and body) and the atlasv551 fairing. gem63xl and rl10c11 are Vulcan's own variants with their own numbers and are unaffected.

---

### 5. Proton-M

**Accepted**
- **RD-276 at 1,831.882 / 1,671.053 kN and 315.8 s, with its source** (high).
  - The MPG gives 10.0 MN at sea level and 11.0 MN in vacuum for six engines. Six of the proposed engine gives 10,026 / 10,991 kN.
  - The old 1,745 kN equals 178 tf, the RD-275's vacuum thrust.
- **Loads 428,300 / 157,300 / 46,562 kg, with sources** (high). Verified in MPG §A.2.1–A.2.3.
- **RD-0210 at 326.5 s, keeping 582 kN.**
- **RD-0210 and RD-0213 source strings.**
- **Briz-M source**: keep 2,370 kg. The MPG gives 2,500 kg, which I verified.
- **Fairing time 348.2 s** (high). Verified: Table 2.3.1-1, and "340 to 350 s … 121 to 125 km or more".
- **Stage-3 separation 0.7 s / ignition 2.4 s** (low).
- **Briz separation 0.1 s on Proton only** (low). Write it as an inline `stageSpec('brizm', …)` and leave `briz()` alone.
- **The dragArea comment.**
- **Register rows.**
- **RD-0213 sea-level 528.8 kN** (optional). It has no flight effect; only the identity fixture moves.

**Rejected**
- **Fairing length 15.255 m.** The `protonm` fairing part is shared with Angara-A5, whose fairing is not the PLF-BR-15255. The change is geometry only and would move Angara's six-DOF. Split the part first if it's wanted.

**Shared parts:** rd276, rd0210, rd0213 and p1–p3 are Proton only. The brizm body, `briz()` and the protonm fairing are shared with Angara-A5; only the rejected length change would have touched Angara.

---

### 6. Ariane 64

**Accepted**
- **Add the VA268 reference flight first** (high).
- **Fairing 2,600 kg** (high).
- **Upper-stage separation delay 6 s** (high) and **ignition delay 8 s** (medium).
- **Fairing time 191 s as a construction**, registered. VA268's 194 s stays a check.
- **LLPM propellant 154,000 kg.** ESA confirms "almost 154 tonnes".
- **LLPM dry 23,000 kg** (medium). ESA confirms "23000kg without propellants". It is surprising against Ariane 5's EPC (about 14.7 t dry for 170 t) and has one source; the CNES totals give it some support.
- **padBurnS 4.5 s.** It only takes from the liquid core, so the solids are unaffected: 4.5 × 324.1 = 1,458 kg.
- **Vulcain 2.1 at 1,371 kN / 432 s** (medium).
- **Vulcain sea-level pair 1,000 kN / 314.6 s** (low). The arithmetic is right. ESA's own "138 tonnes of thrust" (1,353 kN in vacuum) is another reading.
- **P120C source note.**
- **Register rows**, without the P120C head row.

**Revised**
- **LLPM cut-off at 457 s.** Keep it, but reword the basis.
  - The kits put main-stage separation at 463–466 s on A62 and A64 alike, across CSO-3, Galileo and Amazon Leo.
  - A cut-off time that doesn't depend on the mission, on an unthrottled stage, means the stop is at a fixed propellant level. So `cutoffAt` is effectively the usable load built from the clock.
  - The residual it leaves (3.77 t at the data-sheet flow, 1.48 t at ESA's 329 kg/s) depends on the flow reading. ESA's own "154 t consumed in 468 s" implies close to zero.
  - Pin the residual as a disagreement, not a prediction. Land it only together with the load and padBurnS.

**Rejected**
- **Upper-stage propellant 33,000 kg.** ESA says the upper stage holds "30 tonnes" (verified), eoPortal 31 t, DLR 33 t, and there is no third source. Keep 31,000 kg, cite eoPortal, and record 30 / 33 t as sensitivities. The 6,000 kg dry mass goes in only with that decision.
- **New P120C variant with peak factor 1.307.**
  - The model's solid profile is thrust = mean · pf · exp(−pf·c·t/T).
  - Over 0–40 s, pf 1.52 gives a mean of 3,796 kN in vacuum and pf 1.307 gives 3,428 kN. The real motor starts at about 3,720 kN and rises to 4,500 kN, so it averages more than either.
  - So the change fixes one instant (liftoff) and makes the first minute's impulse about 10 % worse. That matches the probe's −9 km at booster separation (77.7 against 87.1 km).
  - 1.52 also has a basis: ArianeGroup's Ariane 6 maximum over its mean, 4,500 / 2,983 kN = 1.51.
  - Keep 1.52 with that basis, and pin the +16 % liftoff thrust as a structural gap.

**Shared parts:** the **p120c engine is shared with Vega-C** (stage body p120c; burn-time pin `vegac/p120c` 135.7 s). The auditor's variant approach would have protected Vega-C, and with the head change rejected nothing touches it. vulcain21, vinci, llpm, ulpm and the ariane64 fairing are Ariane only.

**Not yet measured:** the fleet matrix (`ariane64/iss/90` already fails), the computed ratings, the GTO reference mission with its core cut-off pin, and six-DOF.

---

### 7. Electron (every part here is used by Electron only; rutherford-vac is a variant with its own numbers)

**Accepted**
- **Rutherford 24.91 kN at sea level** (high). The PUG says "5600 LBF Sea Level (Per Engine)".
- **Rutherford 27.47 kN in vacuum (derived)** (medium), with 343 s labelled an estimate. The physics-core list drops "Rutherford 2.6 %".
- **Rutherford source and comment.**
- **Kick Stage dry 40 kg** and **fairing 44 kg** (high, verified).
- **Second-stage separation 4 s / ignition 3 s** (medium) and **Kick Stage separation 4 s** (high).
- **Fairing time 184 s** (low).
- **Register rows and the F7 text.**
- **Second stage 2,000 kg** (input; the PUG says "approximately 2,000 kg"). Land it only with:
  - the 150 kg Curie-load estimate in the register, and
  - the fleet-defaults "Electron, 200 kg to SSO" reference and the rating re-flown, with the failure pinned as a finding. It must not be hidden.

---

### 8. H-IIA 202

**Accepted**
- **SRB-A body 10,600 / 64,900 kg** (high). JAXA confirms 64.9 / 66.0 t and 98 / 116 s.
- **SRB-A3 thrust 1,841.8 kN vacuum / 1,721.0 kN sea level** (derived).
- **SRB-A3 peak factor 1.368** (medium).
  - It is 15 % strong at liftoff.
  - Over 0–40 s it gives a mean of 2,207 kN, against 2,322 kN from inverting MHI Fig. 2.3-7. pf 1.22 gives only 2,068 kN, so 1.368 is the closer of the two.
  - Pin the liftoff overshoot.
- **Second-stage separation delay 8 s** (high).
- **Fairing time 245 s, and fix the comment.** In `staging.ts` the published time returns before the placard is ever checked, so the comment's claim that the placard fires first is wrong. Also fix the `vehicles.ts` header ("H-IIA 202 250 s").
- **LE-5B-2 at 446.6 s.**
- **Source strings.**
- **Burn-time pin 100 → 98 s.**
- **PHYSICS.md §6a published column.**
- **Register rows.**
- **Long-burn motor for F50** (medium). Make it a separate vehicle or configuration so the fleet `h2a202` keeps the high-pressure motor; the fleet-defaults GTO windows would fail at 115 / 123 s otherwise.

**Deferred**
- **Tabulated SRB-A3 thrust.** It needs a new mechanism and uses up the trace as an input. The arithmetic checks: the table's impulse is 180,060 kN·s, about 64,743 kg.

**Shared parts:** srba3 and srba are H-IIA only. H3's `srb3` engine and body carry their own numbers. However, the `srb3` body's note ("the SRB-A3 casing's masses") becomes false; per the auditor, 8,700 / 66,800 kg are SRB-3 figures. Fix the note.

---

### Implementation order

1. **Proton-M**: RD-276, the three loads, RD-0210 at 326.5 s, fairing at 348.2 s, sources, register.
2. **Vostok-K**: Blok E 6,335 kg, the strap-ons and core, fairing 2.7 m, Energomash engines on `vostokk`, fleet engine renames. Then the lesson datum, on the TASS basis above.
3. **Atlas V data**: CCB 23,848 kg, GEM 63 at 97.6 s (1,239.1 kN, pf 1.331), Centaur 2,247 kg, separation 6 s, CFLR, burn-time pins, sources. Then the GEM-era check flight.
4. **H-IIA**: high-pressure SRB-A3 body and engine, separation 8 s, fairing 245 s and comment, LE-5B-2, pins, sources, the srb3 note.
5. **Documentation and register only**, with no flight effect:
   - Falcon 9 register, sources, "MECO + 11 s" label, the 33 kPa text
   - Saturn V register corrections (prediction vs identity, the S-IVB 1,795 kg row, the pad-term note)
   - Proton dragArea comment
6. **Electron**: the published data, landed with the moved performance pins and the Curie-load register row.
7. **Falcon 9 and Falcon Heavy**: second-stage masses, ignition delay 8 s, minimum throttles. Only after Falcon Heavy and the six-DOF landings are measured.
8. **Ariane 64**:
   - VA268 first
   - fairing 2.6 t and the upper-stage delays
   - core 23 / 154 t together with the 457 s cut-off and padBurnS 4.5
   - the Vulcain pair
   - not the P120C head.

   Do this only after the fleet matrix, ratings, GTO reference and six-DOF are measured. The altitude shortfall (74 vs 87 km at booster separation; 156 vs 265 km at core separation) belongs to a Tier-A guidance fit, with VA268 held out.
9. **Low-value leftovers**:
   - Saturn V: the S-IVB load against the TLI leftover, the 609 kg ullage propellant as a jettison, the J-2 placeholders
   - Proton: stage-3 delays, Briz 0.1 s, RD-0213 sea-level thrust
   - Vostok watch-mission events
10. **New mechanisms, off by default, each measured on its own**:
    - H-IIA long-burn configuration for F50
    - Atlas timed throttle, 2.5 g hold and 4.6 g phase
    - GEM jettison time and two jettison groups
    - SRB-A3 thrust table
    - Falcon 9 stage-1 acceleration hold
    - Proton verniers and hot staging
    - a solid profile that rises then falls, fed from a published curve

---

### What the auditors missed

1. **Saturn V register.** OECO time and S-II cut-off time are recorded as predictions but are near-identities. The S-IVB estimate row is missing. The S-II dry mass mixes two readings. The pad term depends on the T−2.5 s start rule.
2. **Ariane's P120C head change makes the early impulse worse**, as argued above. The Ariane fleet matrix and ratings were not measured.
3. **Vostok's datum needs a third source.** "89:34 minutes" has two readings, and TASS's 175 × 302 km at 89.1 min decides between them.
4. **Vulcan's GEM 63XL, on the same NG datasheet**: 53,400 / 48,000 kg and 87.3 s (mean about 1,504 kN in vacuum). The model has 5,177 + 47,853 kg and burns 89.7 s at 1,460 kN.
5. **`R7_TRIM_SHARE_VEHICLES` in `src/physics/rigid/runtime.ts:130`.** Its comment says it covers the historical C01 8K71PS and 8K72K, but the set lists the fleet ids (`sputnik8k71ps`, `vostok8k72k`). So `vostokk` and `r7sputnik` fly on the 35 % trim share.
6. **The H3 `srb3` note** becomes false once SRB-A3 changes.
7. **`src/data/vehicles.ts` header** still says "Soyuz-2.1a and 2.1b 157 s" and "H-IIA 202 250 s". Soyuz-2.1a now flies 153.3 s.
8. **Every parts change moves the shared fixtures**: `tests/fixtures/vehicles-pre-d01.json`, the d01 fleet fingerprint and the heavy six-DOF fingerprints. No auditor flew six-DOF, so plan a heavy-suite run for each vehicle.
9. **Older documents behind current figures.**
   - Atlas: AVUG Rev 11 (2010) predates the GEM 63 and RL10C-1 era, so the 500-series booster inert mass is from the AJ-60A configuration.
   - Electron: the PUG v8.0 text dates from 2020 ("130 Rutherfords flown as of July 2020").
   - Both are minor provenance caveats.
