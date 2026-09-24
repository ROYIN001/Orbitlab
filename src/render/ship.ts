/**
 * Starship's ship as the aerodynamics model sees it: a nose that closes the
 * stack (it carries its payload inside, there is no fairing), a heat-shielded
 * belly, and four flaps that fold and unfold on the deflections the six-DOF
 * model records.
 *
 * The flaps are laid out from `shipFlapSurfaces`, the same list the physics
 * pushes on, so a flap is drawn where its force acts and moves on its own
 * recorded deflection. Body axes to model axes: body x = model y (the thrust
 * axis), body y = -model x, body z = model z — the belly, heat shield side, is
 * model +z, which is also u = 0 of the stage's wrapped texture.
 */
import * as THREE from 'three';
import type { StageSpec } from '../types';
import type { RigidTelemetry } from '../physics/rigid/telemetry';
import { shipFlapSurfaces } from '../physics/rigid/surfaces';

/** Share of the ship's length taken by its nose. */
export const SHIP_NOSE_FRACTION = 0.34;
/** How far a flap swings back into the lee at the folded end of its travel. */
export const FLAP_FOLD = 75 * Math.PI / 180;

/**
 * Radius of a tangent-ogive nose `y` metres above its base: the ship's nose is
 * fuller than the Von Kármán shape a fairing gets, which is what lets the
 * forward flaps sit on it with most of the hull's width still under them.
 */
export function tangentOgiveRadius(radius: number, noseHeight: number, y: number): number {
  // The ogive's arc has radius rho and is tangent to the hull at the base
  // (y = 0), where its centre is level with it; it closes on the axis at the tip.
  const rho = (radius * radius + noseHeight * noseHeight) / (2 * radius);
  const h = Math.min(noseHeight, Math.max(0, y));
  return Math.max(0, Math.sqrt(rho * rho - h * h) + radius - rho);
}

export function tangentOgiveProfile(radius: number, y0: number, noseHeight: number, segments = 24): THREE.Vector2[] {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= segments; i++) {
    const y = (i / segments) * noseHeight;
    pts.push(new THREE.Vector2(i === segments ? 0 : Math.max(1e-3, tangentOgiveRadius(radius, noseHeight, y)), y0 + y));
  }
  return pts;
}

export interface FlapVisual {
  /** physics surface id, the key into `RigidTelemetry.surfaceDeflections` */
  id: string;
  /** turns about the hinge line: 0 = standing straight out, FLAP_FOLD = folded */
  hinge: THREE.Group;
  /** sign of `hinge.rotation.y` that folds this flap back, away from the belly */
  sense: 1 | -1;
  /** half the physical travel, rad; deflection -travel is folded, +travel out */
  travel: number;
}

/**
 * Build the four flaps onto a stage group whose y = 0 is the stage base.
 *
 * @param noseHeight height of the tapering nose at the top of the stage, m
 *        (0 = the hull is a plain cylinder to the top)
 */
export function buildShipFlaps(stage: StageSpec, noseHeight: number, mat: THREE.Material): { group: THREE.Group; flaps: FlapVisual[] } {
  const group = new THREE.Group();
  const flaps: FlapVisual[] = [];
  const R = stage.diameter / 2, L = stage.length, barrel = L - noseHeight;
  const hull = (y: number) => y <= barrel || noseHeight <= 0 ? R : tangentOgiveRadius(R, noseHeight, y - barrel);
  for (const s of shipFlapSurfaces(stage.id, L, stage.diameter)) {
    const p = s.positionBody;
    const mx = -p.y, mz = p.z;
    const theta = Math.atan2(mz, mx);
    // The physics puts the centre of pressure half a span out from the hull.
    const span = 2 * (Math.hypot(mx, mz) - R);
    const area = s.forceSlopeM2 * 2 * s.maxDeflectionRad / 1.2;
    const chord = area / span;
    const y = p.x, r = hull(y);
    // Hinge line along the hull, leaning in with the nose where it tapers.
    const slope = (hull(y + 0.5) - hull(y - 0.5)) / 1;
    const az = new THREE.Group();
    az.position.set(Math.cos(theta) * r, y, Math.sin(theta) * r);
    az.rotation.y = -theta;                  // local +X points radially out
    const lean = new THREE.Group();
    lean.rotation.z = Math.atan(-slope);
    const hinge = new THREE.Group();
    const plate = new THREE.Mesh(new THREE.BoxGeometry(span, chord, Math.max(0.15, R * 0.05)), mat);
    plate.position.x = span / 2;
    plate.castShadow = true;
    hinge.add(plate);
    lean.add(hinge);
    az.add(lean);
    group.add(az);
    // Local -Z of the azimuth frame is the hull tangent toward model -z (the
    // lee) for a flap on the +x side; on the -x side it is local +Z.
    flaps.push({ id: s.id, hinge, sense: mx >= 0 ? 1 : -1, travel: s.maxDeflectionRad });
  }
  return { group, flaps };
}

/**
 * Fold each flap on its recorded deflection. Without six-DOF telemetry the
 * flaps sit at the half-open trim the control law holds them at.
 */
export function foldShipFlaps(flaps: FlapVisual[], rigid: RigidTelemetry | undefined): void {
  for (const f of flaps) {
    const d = rigid?.surfaceDeflections?.[f.id] ?? 0;
    const open = Math.min(1, Math.max(0, (d + f.travel) / (2 * f.travel)));
    f.hinge.rotation.y = f.sense * (1 - open) * FLAP_FOLD;
  }
}
