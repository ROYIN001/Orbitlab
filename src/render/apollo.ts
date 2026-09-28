/**
 * The Apollo spacecraft on the Saturn V (roadmap C01): the spacecraft/LM
 * adapter (SLA) with the lunar module folded inside it, the command and
 * service module (CSM) on top under the boost protective cover and the launch
 * escape tower — and, after the translunar injection, the transposition: the
 * SLA's four panels opening, the CSM backing off, turning round and docking
 * with the LM, and the two pulled out of the S-IVB together.
 *
 * Proportions from the Saturn V Flight Manual SA-506 and the Apollo 11 press
 * kit (the SLA 8.53 m, 6.60 m across at the S-IVB and 3.91 m at the service
 * module; the SM 3.9 m across; the CM 3.23 m tall); the LM's folded shape and
 * the colours from photographs, approximate. Y is along the rocket axis, the
 * group centred on the middle of its height like every payload view.
 */
import * as THREE from 'three';
import type { SatelliteView } from './satellite';
import { APOLLO_OUT, type ApolloState } from '../physics/sim/apollo';
import { clamp01, smoothstep } from './noise';

/** Height of the stack on the S-IVB with its tower, m (Saturn V 110.6 m less its stages). */
export const APOLLO_HEIGHT = 24.93;
const SLA_H = 8.53;
/** the SLA's fixed lower section, which stays on the S-IVB; the four panels above it */
const SLA_FIXED = 2.13;
const SLA_R0 = 3.302;
const SLA_R1 = 1.956;
const SM_H = 3.94;
const CM_H = 3.23;
const SPS_BELL = 2.8;
/** the CSM's docking probe past the CM's apex, m */
const PROBE = 0.35;
/** the LM folded in the SLA: its base and height, m (its docking hatch is its top) */
const LM_BASE = 0.4;
const LM_H = 5.1;

/**
 * The transposition's own timeline, s: the SLA's panels open (6 s) and fly
 * off, at their own time; from its separation the CSM backs away to 30 m (to
 * 100 s), turns round (to 200 s) and closes to dock at the flown time.
 */
const PANEL_OPEN_S = 6;
const BACK_OFF_S = 100;
const TURN_S = 200;
const BACK_OFF_M = 30;

/** Radius of the SLA's cone at height y above its base. */
const slaRadius = (y: number) => SLA_R0 + (SLA_R1 - SLA_R0) * (y / SLA_H);

export function buildApollo(): SatelliteView & { setApollo(state: ApolloState | undefined, t: number, separated: boolean): void } {
  const g = new THREE.Group();
  const h = APOLLO_HEIGHT, base = -h / 2;
  const white = new THREE.MeshStandardMaterial({ color: 0xf2f2ef, roughness: 0.55, metalness: 0.05 });
  const panel = new THREE.MeshStandardMaterial({ color: 0xdcdcd8, roughness: 0.55, metalness: 0.25, side: THREE.DoubleSide });
  const silver = new THREE.MeshStandardMaterial({ color: 0xc9ccd1, roughness: 0.3, metalness: 0.8 });
  const mylar = new THREE.MeshStandardMaterial({ color: 0xd8dbe0, roughness: 0.15, metalness: 0.95 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a2b2e, roughness: 0.6 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xc9a13b, roughness: 0.35, metalness: 0.8 });
  const grey = new THREE.MeshStandardMaterial({ color: 0x8d9096, roughness: 0.5, metalness: 0.4 });

  // --- the SLA: its fixed lower ring, and four panels hinged at their foot
  const fixed = new THREE.Mesh(new THREE.CylinderGeometry(slaRadius(SLA_FIXED), SLA_R0, SLA_FIXED, 40, 1, true), panel);
  fixed.position.y = base + SLA_FIXED / 2;
  g.add(fixed);
  const panels: THREE.Group[] = [];
  for (let i = 0; i < 4; i++) {
    const a0 = (i * Math.PI) / 2;
    const pivot = new THREE.Group();
    pivot.position.y = base + SLA_FIXED;
    const len = SLA_H - SLA_FIXED;
    const geo = new THREE.CylinderGeometry(SLA_R1, slaRadius(SLA_FIXED), len, 12, 1, true, a0, Math.PI / 2);
    geo.translate(0, len / 2, 0);
    const m = new THREE.Mesh(geo, panel);
    pivot.add(m);
    g.add(pivot);
    panels.push(pivot);
  }

  // --- the LM in the adapter: gold-foiled descent stage with its legs folded,
  // the ascent stage, the docking tunnel on top
  const lm = new THREE.Group();
  const descentH = 1.7, ascentH = 2.9;
  const descent = new THREE.Mesh(new THREE.CylinderGeometry(2.05, 2.05, descentH, 8), gold);
  descent.position.y = descentH / 2;
  lm.add(descent);
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.4, 6), silver);
    leg.position.set(Math.cos(a) * 2.25, 1.9, Math.sin(a) * 2.25);
    lm.add(leg);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.12, 12), silver);
    pad.position.set(Math.cos(a) * 2.25, 3.6, Math.sin(a) * 2.25);
    lm.add(pad);
  }
  const ascent = new THREE.Mesh(new THREE.BoxGeometry(3.0, ascentH, 2.6), grey);
  ascent.position.y = descentH + ascentH / 2;
  lm.add(ascent);
  const windows = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.05), dark);
  windows.position.set(0, descentH + ascentH * 0.7, 1.31);
  lm.add(windows);
  const tunnel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, LM_H - descentH - ascentH, 16), silver);
  tunnel.position.y = descentH + ascentH + (LM_H - descentH - ascentH) / 2;
  lm.add(tunnel);
  lm.position.y = base + LM_BASE;
  g.add(lm);

  // --- the CSM, its origin at the SM's aft face: the SPS bell below, the SM,
  // the CM, the docking probe
  const csm = new THREE.Group();
  const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 1.25, SPS_BELL, 24, 1, true), dark);
  bell.position.y = -SPS_BELL / 2;
  const sm = new THREE.Mesh(new THREE.CylinderGeometry(SLA_R1, SLA_R1, SM_H, 40), silver);
  sm.position.y = SM_H / 2;
  const radiators = new THREE.Mesh(new THREE.CylinderGeometry(SLA_R1 + 0.006, SLA_R1 + 0.006, 0.9, 40, 1, true), dark);
  radiators.position.y = SM_H - 0.6;
  const cm = new THREE.Mesh(new THREE.CylinderGeometry(0.42, SLA_R1, CM_H, 40), mylar);
  cm.position.y = SM_H + CM_H / 2;
  const probe = new THREE.Mesh(new THREE.ConeGeometry(0.12, PROBE, 10), silver);
  probe.position.y = SM_H + CM_H + PROBE / 2;
  csm.add(bell, sm, radiators, cm, probe);
  const csmHome = base + SLA_H;
  csm.position.y = csmHome;
  g.add(csm);
  /** the CSM's centre, from its origin, m: what it turns about */
  const csmCentre = (SM_H + CM_H) / 2;

  // --- the escape tower with the boost protective cover over the CM, dropped together
  const tower = new THREE.Group();
  const bpc = new THREE.Mesh(new THREE.CylinderGeometry(0.44, SLA_R1 + 0.03, CM_H + 0.05, 40), white);
  bpc.position.y = csmHome + SM_H + CM_H / 2;
  tower.add(bpc);
  const t0 = csmHome + SM_H + CM_H, legs = 3.0, rBot = 0.95, rTop = 0.33;
  const red = new THREE.MeshStandardMaterial({ color: 0xb8371f, roughness: 0.6 });
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    const x0 = Math.cos(a) * rBot, z0 = Math.sin(a) * rBot, x1 = Math.cos(a) * rTop, z1 = Math.sin(a) * rTop;
    const len = Math.hypot(x1 - x0, legs, z1 - z0);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, len, 6), red);
    leg.position.set((x0 + x1) / 2, t0 - 0.2 + legs / 2, (z0 + z1) / 2);
    leg.lookAt(x1, t0 - 0.2 + legs, z1);
    leg.rotateX(Math.PI / 2);
    tower.add(leg);
  }
  const motorH = 4.7, motorY = t0 - 0.2 + legs + motorH / 2;
  const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, motorH, 20), white);
  motor.position.y = motorY;
  const canard = new THREE.Mesh(new THREE.ConeGeometry(0.33, h / 2 - (motorY + motorH / 2), 20), white);
  canard.position.y = (motorY + motorH / 2 + h / 2) / 2;
  tower.add(motor, canard);
  g.add(tower);

  const lmTop = base + LM_BASE + LM_H;
  const tip = SM_H + CM_H + PROBE;
  /** the CSM's centre where it docks with the LM, turned round */
  const dockedCentre = lmTop + tip - csmCentre;
  const placeCsm = (centreY: number, turn: number) => {
    csm.rotation.x = turn;
    csm.position.set(0, centreY - Math.cos(turn) * csmCentre, -Math.sin(turn) * csmCentre);
  };

  const setApollo = (state: ApolloState | undefined, t: number, separated: boolean): void => {
    const q = state?.sequence;
    const phase = state?.phase;
    const after = phase === 'translunar' || phase === 'transposition' || phase === 'docked' || (!!phase && APOLLO_OUT.includes(phase));
    const u = q && after && phase !== 'translunar' ? t - q.separation : -1;
    // the panels, at their own time before the CSM backs away: open to 45° on their hinges,
    // then away on their springs, tumbling
    const up = q && after && t >= q.panels ? t - q.panels : -1;
    panels.forEach((p, i) => {
      const a0 = (i * Math.PI) / 2 + Math.PI / 4;
      const open = up < 0 ? 0 : smoothstep(0, PANEL_OPEN_S, up);
      const away = Math.max(0, up - PANEL_OPEN_S) * 0.4;
      const dirX = Math.sin(a0), dirZ = Math.cos(a0);
      p.position.set(dirX * away, base + SLA_FIXED + away * 0.2, dirZ * away);
      p.rotation.set(0, 0, 0);
      p.rotateOnWorldAxis(new THREE.Vector3(dirZ, 0, -dirX), open * (Math.PI / 4) + Math.max(0, up - PANEL_OPEN_S) * 0.01);
      p.visible = up < 400;
    });
    fixed.visible = !separated;
    if (u < 0) { placeCsm(csmHome + csmCentre, 0); return; }
    const home = csmHome + csmCentre, out = home + BACK_OFF_M;
    const dockAt = q!.docking - q!.separation;
    if (u < BACK_OFF_S) placeCsm(home + (out - home) * smoothstep(2, BACK_OFF_S, u), 0);
    else if (u < TURN_S) placeCsm(out, Math.PI * smoothstep(BACK_OFF_S, TURN_S, u));
    else placeCsm(out + (dockedCentre - out) * clamp01((u - TURN_S) / Math.max(1, dockAt - TURN_S)), Math.PI);
  };

  const setDeploy = (_p: number): void => { /* the transposition is timed on the flight, not on a deploy ramp */ };
  const setJettisoned = (j: { tower: boolean } | undefined): void => { tower.visible = !j?.tower; };
  setApollo(undefined, 0, false);
  return { group: g, height: h, setDeploy, setJettisoned, setApollo };
}
