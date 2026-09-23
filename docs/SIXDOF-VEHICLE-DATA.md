# Six-degree-of-freedom vehicle data dossier

Research snapshot: 2026-09-19. Scope: Falcon 9 Block 5 and Soyuz-2.1a, attached stack, powered/coasting upper stages, and Falcon first-stage recovery. Soyuz stages may be propagated as ballistic rigid bodies; powered Soyuz recovery is not a supported vehicle capability. This is an educational engineering model, **not a digital twin or a flight qualification model**.

This document records the data and assumptions for the approved 6DOF scope. `src/data/vehicles.ts` remains the calibrated point-mass data set; the additional rigid-body geometry and actuator estimates are identified separately.

Update 2026-09-20: the owner selected orbital acceptance for Falcon 9 and Soyuz-2.1a while retaining Falcon first-stage recovery as **experimental**. The dated [acceptance checkpoint](SIXDOF-ACCEPTANCE.md#resume-checkpoint--2026-09-20) records completed provenance/event checks and the derivative/restart studies. It does not claim that the complete mission, regression or browser gates have passed.

## Provenance and confidence

- **P**: numerical/architectural statement in a primary manufacturer/operator source. Its edition/configuration still matters.
- **L**: value in the existing Orbitlab model, not independently established here as manufacturer data.
- **E**: explicit engineering estimate for this simulation. A nominal value is a reproducible input, not a measured value.
- **D**: arithmetic derived from identified inputs; inherits their uncertainty.

No public mass-property schedule, tank contour drawing, gimbal servo specification, complete RCS installation, or aerodynamic derivative database for either reference vehicle was established in this research. These remain E, including when an illustration suggests a plausible placement.

## Primary sources actually inspected

| ID | Source and relevant location | Retrieval/interpretation |
|---|---|---|
| S1 | [SpaceX Falcon 9 manufacturer page](https://new.spacex.com/vehicles/falcon-9) | Manufacturer overview, current retrieved listing. Rounded public dimensions/thrust, not stage mass breakdown. |
| S2 | [SpaceX Falcon User's Guide, April 2020](https://spacex.relayto.com/e/spacex-falcon-user-s-guide-oc92qkoxzo1jf), sections 1.5, 2, Table 2-1 | SpaceX-authored manual on its Relayto mirror; text inspected. The currently indexed SpaceX 2021 PDF URL could not be downloaded, so it is not evidence for unseen contents. |
| S3 | [Arianespace Soyuz CSG User's Manual, issue 2 revision 1, May 2018](https://sky-brokers.com/wp-content/uploads/2025/04/Soyuz-Users-Manual-2018-1.pdf), printed 1-6, A5-3/A5-4 | Operator-authored PDF retrieved from a mirror after original URL failed. PDF pages 20, 237, 238 inspected, including diagrams. Its third-stage table is RD-0124/2.1b, not a license to replace the 2.1a stage. |
| S4 | [Arianespace Soyuz CSG User's Manual, June 2006, issue 1](https://www.yumpu.com/en/document/view/8552991/soyuz-csg-users-manual-arianespace/21), printed 1-6/1-7 | Operator-authored historical manual, indexed mirror text inspected; includes separate RD-0110 and RD-0124 columns. Numerical edition differences must remain visible. |
| S5 | [KBKhA RD0110 manufacturer entry](https://kbkha.ru/deyatel-nost/raketnye-dvigateli-dlya-kosmicheskoy-otrasli/raketnye-dvigateli-ao-kbha/rd0110/) | Vacuum thrust 30.38 tonne-force, Isp 326 s. `30.38 × 9.80665 = 297.926627 kN`. |
| S6 | [NASA, Meet the Octaweb](https://www.nasa.gov/blogs/commercialresupply/2014/04/18/meet-the-octaweb/) | NASA mission account of the eight-around-one engine arrangement, with SpaceX attribution. No ring radius supplied. |
| S7 | [F. O. Eke, Dynamics of Variable Mass Systems, NASA/CR-1998-208246](https://ntrs.nasa.gov/api/citations/19980210404/downloads/19980210404.pdf), chapter 3, especially printed 35–38, equation 3.18 | Full PDF inspected; equation on PDF page 42 rendered and read. Inertia variation and outflow angular momentum must be considered together. |
| S8 | [NASA/CR-2012-217475, Missile Aerodynamics for Ascent and Re-entry](https://ntrs.nasa.gov/search.jsp?R=20130003336) | Primary research description supports separating static coefficients and damping derivatives; it does **not** supply Falcon/Soyuz coefficients. |
| S9 | [A. A. Ganin, B. I. Katorgin, I. Yu. Fatuev, V. K. Chvanov, Refinement of the ignition system of the engines RD-107, RD-108, 2004](https://vestniksamgu.ssau.ru/est/2004web2/vsys/200422201.pdf), printed 188–196, especially 191 | Original university-hosted research paper by NPO Energomash engineers (affiliations printed 188). It describes a modified fuel-feed assembly accommodating 45° steering-chamber travel, tested in the engine. It does not explicitly resolve ±45° versus 45° total travel, or publish the operational flight-command limit. |

Downloaded research evidence is outside the worktree (the owner's local folder, not part of this repository) in `../audit-2026-09-19/sixdof-sources/`: Soyuz 2018 PDF/text and inspected page images; NASA variable-mass PDF/text and equation image; Energomash 2004 paper/text and visually checked printed-page-191 image. Do not bundle these copyrighted manuals in the app.

## Existing dimensions and mass budgets

All numbers in the following table are **L**, copied from `src/data/vehicles.ts`; kg and m. Keep these totals in the initial compatibility profile so a dynamics change is not mixed with an unannounced vehicle retuning.

| Vehicle/body id | Count | Dry kg each | Propellant kg each | Body length m | Diameter m |
|---|---:|---:|---:|---:|---:|
| Falcon `s1` | 1 | 25,600 | 395,700 | 42 | 3.66 |
| Falcon `s2` | 1 | 4,300 | 108,000 | 15 | 3.66 |
| Falcon fairing | 1 | 1,900 | 0 | 13.1 | 5.2 |
| Soyuz `blokA` | 1 | 6,545 | 87,000 | 27.8 | 2.95 |
| Soyuz `blokBVGD` | 4 | 3,784 | 39,600 | 19.6 | 2.68 |
| Soyuz `blokI` | 1 | 2,410 | 22,900 | 6.7 | 2.66 |
| Soyuz fairing | 1 | 1,000 | 0 | 10.1 | 3.7 |

For a 1,000 kg inert payload, these sum to Falcon 536,500 kg and Soyuz 294,391 kg before any propellant consumption (D). A spacecraft propulsion stage is already part of payload mass in `VehicleModel`; do not add that payload a second time.

Published comparison, **P**, not replacement instructions:

| Source | Relevant published quantities |
|---|---|
| S1 | Falcon height 70 m; rounded diameter 3.7 m; advertised total mass 549,054 kg; fairing 13.1 × 5.2 m. |
| S3, booster each | Length 19.60 m; diameter 2.68 m; gross/dry 44,413/3,784 kg; LOX/kerosene 27,900/11,260 kg. |
| S3, core | Length 27.10 m; diameter 2.95 m; gross/dry 99,765/6,545 kg; LOX/kerosene 63,800/26,300 kg. |

Do not force totals to agree: S3 gross minus dry minus listed main propellants leaves 1,469 kg per booster and 3,120 kg in the core (D). Pump working fluid, pressurization consumables, residuals and table conventions need reconciliation; this dossier does not assign that entire difference to one fluid without evidence. Its core load also differs from the deliberately calibrated 87,000 kg L load. The S3 ST fairing/upper stage are different configurations from the current crew/direct-insertion Soyuz-2.1a preset. Falcon advertised mass is not a proven dry/propellant/payload closure for our mission configuration.

## Datum, stage attachment and mesh agreement

Use SI internally. Body +X is noseward; +Y/+Z complete a right-handed frame. Structural datum O is the first-stage engine-mount/base plane, **not** current CG. Every component position, CP and engine lever arm uses this same datum. Runtime `rI` locates CG; convert a datum point by `rPointI = rI + R(attitudeQ) × (pointBody − cgBody)`.

The current mesh is +Y noseward. One proper mapping is `(xRender,yRender,zRender) → (yRender,−xRender,zRender)` with determinant +1; map transverse patterns consistently too. Never just exchange two axes, which reflects the frame.

The legacy `stackLayout` adds heuristic diameter adapters: Falcon total drawn envelope is 72.394 m, Soyuz 47.263 m, whereas advertised `VehicleSpec.height` is 70/46.3 m (D). A new physics profile and its renderer must consume one explicit attachment map. Do not combine lever arms derived from one layout with geometry from the other.

Implemented compatibility geometry **E**, shared with the existing displayed layout. This deliberately retains the discrepancy from the manufacturer's rounded height; replacing it with a more accurate attachment drawing would be a separate data revision:

| Vehicle | First/core base X | Upper-stage base X | Fairing base X | Nose X | Explanation |
|---|---:|---:|---:|---:|---|
| Falcon | 0 | 42.0 | 59.294 | 72.394 | Existing 2.294 m upper adapter; no extra adapter mass. |
| Soyuz | 0 | 28.719 | 37.163 | 47.263 | Existing 0.919 m and 1.744 m adapters; no extra adapter mass. |

Soyuz booster bases have X=0 and four centerline placements on radius `2.95/2 + 2.68/2 = 2.815 m` (E). In body (Y,Z) order they are (0,+r), (−r,0), (0,−r), (+r,0), matching the existing mesh and its local rotations. No manufacturer dimensional placement drawing was obtained. Vary transverse radius ±10% and base X ±0.5 m. Treat any adapter mass as a redistribution **inside** a dry budget, not an additional mass. Attached payload equivalent-body base is 0.5 m above the fairing base, matching the mesh's payload attachment gap. A spacecraft's actual size can exceed this approximation; do not silently clip its inertia or lose its mass.

For a separated body, translate its mass components and actuator points into a local datum, retaining the same orientation. The active upper stack may retain the original full-stack datum internally if `cg` and all offsets remain in that same datum. Stage/base identifiers must survive separation and replay.

## Component mass model and explicit estimates

The first implementation can use equivalent cylinders, not a claim about actual tank wall locations. For each stage of body length L, radius R, dry budget Md and propellant Mp:

1. Dry shell: 75% of Md, thin cylinder over X=[0,L]. Engine/equipment package: 25% of Md, solid cylinder radius 0.85R, length 0.08L, centre X=0.06L. These percentages include engines; **do not add engine masses again**.
2. Represent fuel and oxidizer separately. Nominal full equivalent aft tank X=[0.10L,0.42L], fore tank X=[0.42L,0.92L], both radius 0.90R. These distributions do not assert actual geometric liquid volume/density. They are low-order mass-distribution surrogates, particularly crude for the tapered Soyuz boosters.
3. Nominal LOX fraction: Falcon `2.56/3.56` (E); Soyuz booster `27900/39160`, core `63800/90100` (D ratios from S3, rescaled to L total); Blok I `2.5/3.5` (E; do not borrow a 2.1b propellant total). LOX is assigned the fore equivalent cylinder. Lower-stage ordering is consistent with S2/S3 diagrams; upper-stage tank boundaries/order remain E and must include a swapped-distribution sensitivity case.
4. With remaining fraction f, each equivalent liquid cylinder fills from its aft end to `xAft + f × fullLength`; its centre is `xAft + f × fullLength/2`, mass f times initial tank mass. This assumes axial settling under +X acceleration. In coast it retains the prescribed distribution; it does not simulate slosh, ullage settling transients, or free-surface response to a flip.
5. Fairing: thin cylindrical shell of its mass/diameter/length; payload: solid cylinder using supplied dimensions, otherwise explicitly estimated 2 m diameter × 3 m long. The fairing taper approximation gets its own inertia sensitivity.

Cylinder tensors about their own centres, in kg·m²:

```text
solid: Ixx = m R²/2; Iyy = Izz = m(3R² + L²)/12
thin cylindrical shell: Ixx = m R²; Iyy = Izz = m(R²/2 + L²/12)
cg = Σ(mi ci)/Σmi
Icg = Σ[Ri Ii Riᵀ + mi ((di·di) Id − di diᵀ)], di = ci − cg
```

Retain the full symmetric tensor, including off-diagonal terms for asymmetric booster loss/placement. Validate positive definiteness, triangle inequalities, finite values, zero propellant and dry-mass floors. A degenerate empty body is inactive, not an arbitrary finite inertia.

Optional RCS gas budgets: Falcon first stage 100 kg; upper stage 30 kg (E). These begin **inside** the quoted dry budgets, with their mass at the RCS installation; subtract consumed gas thereafter. Otherwise adding 100/30 kg would break the mass closure. No Soyuz launcher cold-gas inventory is established here. Any synthetic spacecraft RCS needs a separately declared inventory included within its payload mass.

Sensitivity minimum: dry distribution fraction 60/75/90% shell; tank locations producing CG shifts ±1% of current body length; positive physical inertia scale 0.75/1/1.25; uniform-through-tank versus settled liquid; unknown upper-tank ordering swapped. Preserve total mass during geometry/inertia sweeps. Recompute tensors from components when moving CG; do not move the CG alone while leaving inconsistent parallel-axis terms.

Derived reference estimates from this recipe, **E/D**, per detached body with unconsumed RCS gas still included in dry mass. CG X is metres above its own base. Both transverse moments are equal for these symmetric individual fixtures; an assembled/asymmetric stack must use its computed full tensor. Rounded values are for review, not golden flight truth:

| Body | Main propellant remaining | Mass kg | CG X m | Ixx kg·m² | Iyy=Izz kg·m² |
|---|---:|---:|---:|---:|---:|
| Falcon s1 | 100% | 421,300 | 22.8868 | 6.085e5 | 4.175e7 |
| Falcon s1 | 50% | 223,450 | 18.3400 | 3.401e5 | 1.567e7 |
| Falcon s1 | 0% | 25,600 | 16.4555 | 7.177e4 | 4.523e6 |
| Falcon s2 | 100% | 112,300 | 8.2296 | 1.585e5 | 1.447e6 |
| Falcon s2 | 50% | 58,300 | 6.5826 | 8.526e4 | 5.210e5 |
| Falcon s2 | 0% | 4,300 | 5.8981 | 1.202e4 | 1.025e5 |
| Soyuz core | 100% | 93,545 | 14.9871 | 8.862e4 | 4.161e6 |
| Soyuz core | 50% | 50,045 | 12.0129 | 5.029e4 | 1.607e6 |
| Soyuz core | 0% | 6,545 | 10.8420 | 1.197e4 | 5.064e5 |
| Soyuz booster | 100% | 43,384 | 10.5442 | 3.451e4 | 9.829e5 |
| Soyuz booster | 50% | 23,584 | 8.4676 | 2.011e4 | 3.974e5 |
| Soyuz booster | 0% | 3,784 | 7.6440 | 5.710e3 | 1.467e5 |
| Soyuz Blok I | 100% | 25,310 | 3.6002 | 1.999e4 | 7.636e4 |
| Soyuz Blok I | 50% | 13,860 | 2.8937 | 1.179e4 | 3.303e4 |
| Soyuz Blok I | 0% | 2,410 | 2.6130 | 3.582e3 | 1.249e4 |

These arithmetic results were also generated in an independent Python component calculation saved with the research evidence. They do not validate the estimated physical distribution.

## Engine counts, points and budgets

Existing engine values **L**, per `EngineSpec` engine/cluster. Use `engineThrust()` and `engineMassFlow()` for pressure and flow consistency.

| Engine | SL/vacuum kN | Vacuum Isp s | L minimum throttle | Cluster count |
|---|---:|---:|---:|---:|
| Merlin 1D | 845/914 | 311 | 0.4 | 9 independent engines on `s1` |
| Merlin Vacuum | vacuum only/981 | 348 | 0.4 | 1 on `s2` |
| RD-107A | 839.5/1019.9 | 320.2 | 0.5 | 1 per booster, 4 boosters |
| RD-108A | 792.4/921.9 | 320.6 | 0.5 | 1 on core |
| RD-0110 | vacuum only/298 | 326 | 0.5 | 1 on Blok I |

Source conflicts: S3 lists RD-108A vacuum 990.2 kN, and S4/S5 RD-0110 is approximately 297.9 kN. S2 publishes first-stage throttle 108,300–190,000 lbf and upper-stage 140,679–220,500 lbf, implying minimum fractions 0.570 and 0.638 (D); these do not establish current Block 5 landing minima. S2's 854 kN Merlin value also differs from S1's 845 kN. Keep editions distinct. Soyuz continuously variable 0.5–1 throttle is an L educational simplification, not proven by the discrete operating modes in S3/S4.

Actuator ids and geometry **E** unless the count/control architecture is P. All mount points below use local body X=0. To match the existing mesh under the proper mapping above, `ring(n,r,phase)` means `(0,−r cosθ,r sinθ)`, with θ the existing mesh angle. This definition is an index convention, not a left-handed body frame. The chosen radii match existing visual estimates, but they are not manufacturer measurements.

| Body | IDs and point pattern | Force budget/control |
|---|---|---|
| Falcon `s1` | `s1.engine.0…7`: ring(8,1.281 m,π/8); `s1.engine.8`: centre | Each 1/9 stage thrust; independently gimbaled, 8-around-1 count P (S2/S6). Default off-axis fault targets id0. Single-centre landing mode id8 cannot produce roll by TVC. |
| Falcon `s2` | `s2.engine.0`: centre | Entire upper-stage thrust, pitch/yaw TVC; roll needs RCS (S2). |
| Soyuz each booster j | `blokBVGD.j.main.0…3`: ring(4,0.5628 m,π/4); `vernier.0…1`: (0,±1.139,0) | Four fixed main chambers; two movable verniers P (S3/S4). Add the booster placement and rotate local transverse axes consistently. |
| Soyuz core | `blokA.main.0…3`: ring(4,0.590 m,π/4); `vernier.0…3`: ring(4,1.239 m,0) | Four fixed main chambers, four verniers P (S3/S4). |
| Soyuz upper | `blokI.main.0…3`: ring(4,0.5586 m,π/4); `vernier.0…3`: ring(4,1.0906 m,0) | Four fixed main chambers, four verniers P (S4). This is RD-0110, not RD-0124. |

S3/S4 give vernier thrust 35 kN each for the lower stages; S4 gives 6 kN each for RD-0110. For a compatibility profile interpret these as nominal vacuum shares **E** and partition, rather than add to, L cluster thrust:

```text
vernierFraction = nominalVernierVacuum / legacyClusterVacuum
mainFraction = (1 − numberOfVerniers × vernierFraction) / 4
chamberForce(p,throttle) = legacyClusterForce(p,throttle) × chamberFraction
```

The fractions sum exactly to one. Pressure dependence and Isp are inherited uniformly from the cluster; this is an approximation, especially for gas-generator-fed RD-0110 verniers. A later detailed flow split needs independent chamber/working-fluid data.

Soyuz has 5 shared-feed engine clusters burning at liftoff: 20 main chambers plus 12 verniers, **not 32 independent restartable engines**. Upper stage adds one cluster with 4 main +4 verniers after staging. An engine-out event should name the cluster and stop its associated main/vernier thrust. An isolated chamber fault is a separate, explicitly synthetic failure experiment; do not imply proven safe chamber isolation. A scalar `engineFraction` alone cannot encode both failure location and shared-feed behavior. Preserve fractional thrust for legacy compatibility, but record the selected new failure unit and its real spatial allocation.

TVC baseline **E**: Merlin and RD-0110 limit 5° (0.08726646 rad); RD-107/108 verniers use a conservative estimated ±20° (0.34906585 rad) operational limit, informed by S9's 45° travel statement but **not** a claim of certified ±45° travel. The initial blanket 5° estimate underpredicted Soyuz ascent steering authority and was replaced; no main-chamber TVC or aerodynamic coefficient was added to compensate. RD-0110 remains separate because S9 does not cover it. Sweep RD-107/108 limits 10/20/45° and other limits 3/5/8°. Common estimated slew 20°/s (0.34906585 rad/s), first-order time constant 0.10 s; sweep 10/20/40°/s and 0.05/0.10/0.20 s. Use single-axis tangential vernier steering as the minimal Soyuz allocation model: rotation around a vernier's transverse radial unit n changes thrust toward `n × eX`; opposed units provide roll/pitch/yaw combinations. Exact hardware steering planes and operational stops remain unverified, so include axis-orientation uncertainty and rank/authority tests. Main Soyuz chambers remain fixed.

A gimbal cone consumes axial thrust as `Fx = F cosδ`; vector forces must affect translation too. `moment = (mount − cg) × force`. Record commanded/actual angles, saturation and failed ids. `VehicleModel.thrust().coreThrottle` excludes `engineFraction`; apply it exactly once. The sum of ungimbaled engine budgets must equal existing thrust to floating-point tolerance.

## RCS, fins and aerodynamics

S2 establishes nitrogen attitude-control systems and the separation of upper-stage roll from main-engine TVC. The following numerical capacities/placements are **E**, not specifications of flown thrusters.

Use opposed physical force pairs, never an unlimited torque actuator. Reference RCS authority: per-nozzle force 200 N on Falcon first stage, 50 N on upper stage; Isp 60 s; proposed minimum pulse 0.02 s. The implemented geometry has 12 virtual nozzles: positive/negative pairs per axis. Roll pairs sit at (0.85L,±R,0), with ±Z forces; pitch pairs at X=0.2L/0.8L with opposite ±Z forces; yaw pairs at X=0.8L/0.2L with opposite ±Y forces. Every individual force contributes to translation. Gas consumption is `Σ|F| dt/(Isp g0)`, including counteracting pulses. Authority sweeps 0.5/1/2, inventory 0.5/1/2; empty gas means zero RCS force. This virtual installation is not a reconstruction of SpaceX's pod/nozzle count.

No independent continuous coast-control RCS is assumed on the Soyuz launcher stages. RD-0110 verniers cease with their engine flow. Propagate coast attitude rather than snapping it to guidance. The existing synthetic spacecraft propulsion is a separate body/configuration and does not confer control on a detached launcher. Its explicitly synthetic RCS uses 20 N virtual nozzles, Isp 60 s, and a 10 kg gas budget included within spacecraft dry mass (limited to 10% of that dry mass for a tiny payload). This is not a Soyuz MS or Crew Dragon control specification.

Aero definitions **E** (S8 motivates the decomposition, not these coefficients). Since roadmap item P03 (2026-09-23) each configuration carries its own table, built by `src/physics/rigid/aero-tables.ts` from the vehicle's layout; the single-slope model below it is kept only for a body without a table.

| Parameter | Estimate | Sensitivity/limits |
|---|---|---|
| Reference area S | Existing frontal-area sum for attached geometry; single detached body πR² | Retain explicit area in telemetry; do not mix body and fin reference conventions. |
| Axial force C_A(Mach) | Nose first: the existing drag curve, along the body, × cos²α. Base first (engines into the flow): the blunt-body curve, Cd 1.0 on the reference area. Detached bodies: their blunt-body Cd both ways. | Multiply 0.5/1/1.5 (nose-first curve). |
| Small-angle normal force | Slender-body theory: 2α × (cross-section gained) / S at each transition going down from the nose — the fairing's ogive (lift at 45 % of its length from its base), a boat-tail under a wider fairing (negative lift at the joint), each strap-on's nose cone (at 2/3 of the cone from its tip), a blunt top when the fairing has gone. Above Mach 0.8 the cylinder behind the nose adds lift of its own (0 → 0.5 per rad of the nose base area at Mach 1.5, easing to 0.3 at Mach 25), acting three diameters behind the nose. | The scale `normalSlopePerRad`/2 multiplies this term (sweeps 0.5/1/1.5). |
| Crossflow normal force | η C_dc(M sin α) (A_p/S) sin²α on the planform A_p at its centroid: C_dc 1.2 subsonic, 1.75 at crossflow Mach 1, 1.25 at Mach 10 (Jorgensen, NASA TR R-474); η from the length/diameter ratio (0.55 at 1, 0.7 at 10, 0.9 at 100; Allen & Perkins, NACA TR 1048). Strap-ons count 60 % of their side area (partly hidden by the core); a fairing half counts half its planform. | Not scaled by the slope sweep. |
| Centre of pressure | The force-weighted mix of the two terms' centres, so it moves aft as the crossflow grows with α, and with Mach as the carry-over appears. As built: Falcon 9 lift-off stack 71 m at Mach 0.5 and 62 m at Mach 1.5 of 72 m (all its lift is at the fairing); Soyuz-2.1a 21.5 m of 47 m (the strap-on noses). `cpBody.x` minus the table's own low-Mach value shifts the whole curve. | ±0.05L; broader exploratory 0.55–0.75L as a shift; E for every configuration. |
| Dimensionless pitch/yaw rate damping | Negative derivative −10 with `ω L/(2 V)` convention | −5/−10/−15; rate term smoothly suppressed near V=0. |
| Dimensionless roll damping | Negative derivative −0.2 with `ω diameter/(2 V)` convention | −0.1/−0.2/−0.3. |
| Falcon grid fins | Passive only: a returning first stage with grid fins carries four lattice fins of about 0.33 d × 0.4 d, the pair in the crossflow plane giving 3 per rad per m² of fin, 0.5 m below the stage top. Flying engines first that moves its centre of pressure towards the top — aft — by about a third of its length. No fin deflection or fin control. | Current return tests do not validate grid-fin forces or control. |

Without a table (a test fixture): CP at 0.65 of the active body length from its base, normal slope 2.0 per rad, drag along the airflow.

The CP cross product already supplies the static normal-force moment; do not add an identical static Cm term again. The table covers every angle from nose first to base first, continuous through broadside (both the axial and the slender-body terms vanish there and the crossflow is common), but its coefficients are still low-order estimates and the 15° small-angle confidence flag is unchanged. Test positive and negative rates to ensure damping removes rotational energy.

Wind scenarios are deterministic ENU inputs, not forecasts: calm; 5 and 10 m/s crosswind; a recorded shear profile and seeded gust process. Save seed, PRNG version, altitude/time profile, fixed sample interval and interpolation. Run all at the same physics time steps independently of render FPS/warp.

The implemented wind is evaluated analytically at simulation time rather than from a sampled random stream: the seed fixes per-axis sinusoidal phases. Each rigid recording now deep-copies the actual `WindScenario`, including sensitivity overrides, ENU vectors, altitude bounds/reference, gust period/amplitudes and seed. Its interpretation belongs to `modelVersion`; sampled `windECI` is stored separately. The normal crosswind/shear UI profile remains east 8 m/s, gust amplitudes (2,1,0) m/s and 12 s period; shear additionally uses (0.001,0.0005,0) m/s per metre over 0–12 km. Explicit 5/10 m/s scenarios are sensitivity inputs, not those UI defaults.

### Recording and CSV provenance

Runtime telemetry always supplies model `sixdof-1` and the snapshot's data revision (currently `estimated-components-2026-09-19-v1`). These are distinct identifiers. CSV **schema 3** adds `rigid_data_revision`, `rigid_wind_profile_json`, `rigid_wind_seed`, `rigid_integration_max_step_s`, `rigid_flow_derivative_max_step_s`, and `wind_eci_x_ms`/`y_ms`/`z_ms`. Export uses each recorded sample, never the current live configuration. Older records with absent metadata leave those fields blank; clone/interpolation deep-copy all nested weather values. A data revision change breaks both visual-frame and attitude-track continuity.

`integrationMaxStepS` is the effective RK ceiling `min(requestedStep,0.01)`; event-shortened substeps can be smaller. `flowDerivativeMaxStepS` is the configured inertia-derivative offset ceiling, default 0.001 s, additionally bounded by `outerDt/4`. Both numerical options propagate to detached bodies. No constant actual substep or arbitrary control-clock convergence is implied by these metadata fields.

## Variable-mass model contract

The implementation must name its approximation. A **quasi-steady rigid body with evolving mass properties** is allowed by the approved proposal; it is not an exact arbitrary internal-flow solver.

At every RK substep, derive m, CG and full I from instantaneous component masses. Integrate `rI,vI,attitudeQ,omegaBody`, where q is Hamilton scalar-first Body→ECI and angular rate is relative to ECI in Body axes. Thrust is already a net exhaust/pressure force; never add an extra `−mdot × exhaustVelocity` acceleration.

```text
m dvI/dt = m gI + R Fbody
I domega/dt = Mbody − omega × (I omega) + MmassFlow
dq/dt = 0.5 q ⊗ [0,omega]
```

Baseline: `MmassFlow=0`, explicitly recorded as `quasi-steady`. Do **not** add `−Idot omega` alone or require closed-system angular momentum conservation during a burn. S7 equation 3.18 contains inertia change together with a boundary flux integral; internal-flow terms can matter. Engine moment from the net thrust is already in Mbody.

Required sensitivity model under declared negligible/symmetric internal relative motion: compute `−Idot omega − Σ(mdotOut × Jexit × omega)`, where `Jexit = (rExit·rExit)Id − rExit rExitᵀ` for a point exit measured from current CG. A finite circular exit adds the average disk second-moment tensor. `mdotOut` is positive outward. This is a reduced flux model, **not** a universal correction for off-axis fluid motion. Exit locations/radii and consistent tensor time derivatives must be specified. Pair it with the corresponding translation/CG-flow approximation or restrict reported confidence to small angular rates; the translational Coriolis/outflow terms discussed in S7 must not be claimed implemented merely because the rotational comparison exists. Verify this reduced case against an independent fixture before drawing stability conclusions. If it materially changes success/stability, promote the validated flow model or restrict the supported envelope.

CG bookkeeping must distinguish the moving centre of mass from a fixed structural point. Output structural datum pose/velocity derived from CG, mass-property change and angular motion; do not reset the body attitude or teleport the mesh as propellant drains. Preserve consistent state conventions in staging and rendering.

Separation is a discrete change of ownership of existing components: partition all residual tanks, dry material, fairing and payload exactly once. Child CG positions and velocities initially follow rigid kinematics; any impulse is paired equal/opposite at a common interface. Verify both total linear momentum and total angular momentum (orbital plus spin) about one inertial origin. Do not demand equal rotational energy after an energetic separation impulse. Hot staging and a separated body's force/torque integration need their own explicit event timing.

Payload release uses an **estimated 0.5 m/s additional relative axial speed**, not a manufacturer spring/adapter model. With detached stage mass `ms` and retained payload/spacecraft mass `mp` from the current component ledger, the paired impulse is `J = 0.5 * ms * mp / (ms + mp)` N·s. This preserves linear/angular momentum while bounding either body's extra axial speed below 0.5 m/s; spin-induced `omega × offset` velocities are retained separately. Consumed RCS gas is included in the actual mass ledger. Ordinary ascent-stage impulse settings are unchanged. The former generic stage impulse could give a light payload tens of metres per second and was rejected by a complete post-deployment orbit check.

## Proposed TypeScript data boundary

This schema is a proposal; the module implementation may use equivalent names. Keep the catalogue/profile separate from time-varying actuator state. Existing ids and `VehicleModel` fuel ownership remain usable.

```ts
type Basis = 'primary' | 'legacy' | 'estimate' | 'derived';
interface Datum { basis: Basis; sourceIds: string[]; note: string }
interface MassComponent {
  id: string; ownerId: string; mass: number; centerBody: Vec3;
  inertiaAtCenter: Mat3; bodyToComponentQ?: Quat; provenance: Datum;
}
interface ChamberGeometry {
  id: string; clusterId: string; kind: 'main' | 'vernier';
  positionBody: Vec3; directionBody: Vec3; thrustFraction: number;
  steering: 'fixed' | 'two-axis' | 'tangential';
  maxAngleRad: number; maxRateRadS: number; timeConstantS: number;
  provenance: Datum;
}
interface RigidVehicleSnapshot {
  mass: number; cg: Vec3; inertia: Mat3; components: MassComponent[];
  engines: (ChamberGeometry & { thrustBudgetN: number; massFlowKgS: number })[];
  geometry: { stageBases: Vec3[]; fairingBase: Vec3; payloadBase: Vec3 };
  // Finite RCS inventory/actuator states are owned by the simulation, not this factory.
  modelId: string; dataRevision: string; assumptions: string[];
}
```

`Mat3` is row-major symmetric 3×3. Catalogue positions use the structural datum; an actuator evaluator must subtract `snapshot.cg` exactly once. A factory can accept `{pressure,coreThrottle,boosterThrottle,time}` and return current budgets; it must not consume fuel a second time. An explicit body-selection argument or separate factory supports detached first stage/booster states without accidentally retaining the upper-stage mass.

The implemented factory additionally accepts `propellantOffsetSeconds` for pure RK trial mass-property evaluation and `rcsConsumedKgByStage` for finite gas consumption. Trial main-propellant mass uses the held throttle and failure budget, bounded by the ascent recovery reserve (or zero); detached recovery consumes down to zero. The underlying `VehicleModel` is unchanged until the accepted integration step. Engine budgets remain held to the beginning-of-step operating state; the caller must split time steps at burnout/separation events.

Implementation boundary checks on 2026-09-19 include 19 mass/data tests, 7 component-partition tests, 17 detached-body tests, 10 actual-Simulation staging/relight tests and 1 fixed-control-clock test. They cover independently calculated asymmetric inertia, finite gas bookkeeping, RK trial fuel, thrust/flow parity, spatial failures retained during recovery, entry-reserve clipping, sensitivity settings retained by detached bodies, and conservative stage/booster/fairing/payload separation. The Simulation boundary tests also check real payload drag, no pre-creation propagation, active side contact above ground, non-restartable shutdown, delayed upper-stage relight and propagation of integration refinement into detached bodies. These bounded event fixtures are not an end-to-end flight or full sensitivity-sweep claim. Three additional complete returning-stage trajectories pass the fixed-control numerical recovery gate; their exact limits and upper-mission exclusion are recorded in the acceptance document.

The terminal Falcon recovery restart uses explicit timing estimates in `recovery-guidance.ts`: 0.5 s ignition delay and a 0.3 s linear ramp multiplier toward the requested thrust; these are not manufacturer data. Suggested timing stress inputs are delay 0.2/0.5/1.0 s and rise 0.1/0.3/0.5 s; that full timing sweep is not yet established by the nominal tests. The longitudinal stopping predictor includes changing mass, axial drag and the finite startup, then a single continuous feasible minimum-or-higher burn. Startup thrust may be below minimum steady throttle during the declared transient. At most one terminal restart is permitted, avoiding unsupported repeated short ignition pulses. Main/RCS fuel remains finite, and actual contact determines the outcome. The quasi-steady/reduced-flux full return cases have the same landed classification but materially different trajectories and propellant use; see the acceptance document before making any confidence claim.

The earlier pending-sweep statement is superseded by the 2026-09-20 bounded study: all nine delay/rise combinations were executed for two descent fixtures, producing 14 landings and four fuel-exhaustion impacts. The failures at 0.2 s delay are retained rather than reclassified as success. Passing finite-engine/contact checks establishes honest outcomes, **not** a robust recovery timing envelope. The same log records derivative refinement at 0.001/0.0005/0.00025 s with unchanged control and RK clocks; its independent nonlinear-inertia fixture verifies the reduced-flow derivative only. See the dated acceptance section for numeric errors, exact failure cases and [raw evidence](../../audit-2026-09-19/validation/resume-timing-and-derivative.log).

Acceptance gates before claiming a supported 6DOF vehicle: mass closure across staging and RCS consumption; hand-calculated cylinder/composite fixtures; engine budget conservation and failure-location torque; control rank/saturation and no roll from a centred TVC; fixed-step convergence; seeded-repeatability; baseline versus flux sensitivity; controlled recovery with finite actuators; complete metadata in replay/export. Passing equation fixtures verifies implementation; it does not validate these estimated parameters against real flights.
