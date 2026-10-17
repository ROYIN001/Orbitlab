/**
 * D-51 (the owner's "ทำพร้อมกัน", 2026-10-17; plan R4.2 + R4.5): the launch
 * sites on the WGS-84 ellipsoid and J2 in the point-mass flight, from the pad
 * through every coast, as one model.
 *
 * Every expected number here is computed by this file from the published
 * constants, independently of src/physics/geodesy.ts: the WGS-84 ellipsoid
 * (NIMA TR8350.2: a = 6,378,137 m, 1/f = 298.257223563) and Somigliana's
 * normal gravity on it (TR8350.2 eq. 4-1: γe = 9.7803253359 m/s²,
 * k = 0.00193185265241, e² = 0.00669437999013, with the second-order height
 * correction of eq. 4-3).
 */
import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { SITES, siteById } from '../src/data/sites';
import { vehicleById } from '../src/data/vehicles';
import { orbitById } from '../src/data/orbits';
import { Simulation } from '../src/physics/simulation';
import { DEFAULT_FAILURE, DEFAULT_GUIDANCE, guidanceForVehicle } from '../src/physics/defaults';
import { DEG, MU_EARTH, OMEGA_EARTH, R_EARTH } from '../src/physics/constants';
import { geodeticHeight, geodeticFast, geodetic } from '../src/physics/geodesy';
import { effectiveGravityJ2, gravityJ2 } from '../src/physics/gravity';
import { groundPositionEci, eciToLatLon } from '../src/physics/orbital';
import { padPlaneLatitude } from '../src/physics/mission';
import { dot, norm, normalize, sub } from '../src/physics/vec3';
import { ellipsoidGeometry, ellipsoidRadius } from '../src/render/earth-shape';
import { LaunchPadView } from '../src/render/launchpad';
import type { SceneManager } from '../src/render/scene';
import type { VisualFrame } from '../src/physics/frame';
import type { MissionConfig } from '../src/types';
import { LAUNCH_TIME } from './fleet-harness';

const A = 6378137, F = 1 / 298.257223563, E2 = F * (2 - F), B = A * (1 - F);
/** A point at geodetic latitude `lat`, longitude `lon` (rad) and height `h` (m) on WGS-84, Earth-fixed, m. */
const wgs84 = (lat: number, lon: number, h: number) => {
  const n = A / Math.sqrt(1 - E2 * Math.sin(lat) ** 2);
  return { x: (n + h) * Math.cos(lat) * Math.cos(lon), y: (n + h) * Math.cos(lat) * Math.sin(lon), z: (n * (1 - E2) + h) * Math.sin(lat) };
};
/** Somigliana's normal gravity at geodetic latitude `lat` and height `h`, m/s². */
const somigliana = (lat: number, h: number) => {
  const s2 = Math.sin(lat) ** 2, m = (OMEGA_EARTH ** 2 * A * A * B) / MU_EARTH;
  const g0 = (9.7803253359 * (1 + 0.00193185265241 * s2)) / Math.sqrt(1 - 0.00669437999013 * s2);
  return g0 * (1 - (2 / A) * (1 + F + m - 2 * F * s2) * h + (3 * h * h) / (A * A));
};

function flight(siteId: string, vehicleId = 'soyuz21b', orbit = 'leo', model: 'pointMass' | 'sixDof' = 'pointMass', padId?: string): Simulation {
  const cfg: MissionConfig = {
    vehicleId, satelliteId: 'cubesats', siteId, ...(padId ? { padId } : {}), orbit: orbitById(orbit), launchTime: LAUNCH_TIME,
    guidance: guidanceForVehicle(vehicleById(vehicleId), DEFAULT_GUIDANCE, model), guidanceResolved: true,
    failure: { ...DEFAULT_FAILURE }, boosterRecovery: false, payloadMassOverride: 1000,
    ...(model === 'sixDof' ? { dynamics: { model: 'sixDof', wind: 'calm', seed: 1 } } : {}),
  } as MissionConfig;
  return new Simulation(cfg, { headless: true });
}

describe('the sites stand on WGS-84 (R4.5)', () => {
  it('places every site and pad at the WGS-84 radius of its geodetic latitude and altitude, to a metre', () => {
    let n = 0;
    for (const site of SITES) {
      for (const p of [site, ...(site.pads ?? [])]) {
        const lat = p.latitude * DEG, lon = p.longitude * DEG;
        const want = wgs84(lat, lon + 1.234, site.altitude);
        const got = groundPositionEci(lat, lon, site.altitude, 1.234);
        expect(norm(sub(got, want))).toBeLessThan(1);
        expect(Math.abs(norm(got) - Math.hypot(want.x, want.y, want.z))).toBeLessThan(1);
        // and reads back its own latitude, longitude and height
        const ll = eciToLatLon(got, 1.234);
        expect(Math.abs(ll.lat - lat)).toBeLessThan(1e-8);
        expect(Math.abs(Math.atan2(Math.sin(ll.lon - lon), Math.cos(ll.lon - lon)))).toBeLessThan(1e-12);
        expect(Math.abs(ll.alt - site.altitude)).toBeLessThan(1e-3);
        n++;
      }
    }
    expect(n).toBeGreaterThan(SITES.length);
  });

  it('puts the pads as far under the old sphere as the ellipsoid lies there', () => {
    // R_EARTH less the WGS-84 radius at the site's latitude, at sea level, km (the review's figures)
    const gap = (id: string) => (R_EARTH - norm(groundPositionEci(siteById(id).latitude * DEG, 0, 0, 0))) / 1000;
    expect(gap('baikonur')).toBeCloseTo(11.01, 2);
    expect(gap('plesetsk')).toBeCloseTo(16.92, 2);
    expect(gap('vostochny')).toBeCloseTo(13.19, 2);
    expect(gap('cape')).toBeCloseTo(4.86, 2);
  });

  it('reads the site altitude as the height at the pad, and no height above the ground', () => {
    for (const id of ['baikonur', 'plesetsk', 'cape', 'xichang', 'kourou']) {
      const site = siteById(id);
      const vehicle = id === 'cape' ? 'falcon9' : id === 'kourou' ? 'ariane64' : id === 'xichang' ? 'longmarch3be' : 'soyuz21b';
      const sim = flight(id, vehicle);
      expect(Math.abs(geodeticHeight(sim.state.r) - site.altitude)).toBeLessThan(1);
      sim.step(0.1);
      expect(sim.state.status).toBe('prelaunch');
      expect(Math.abs(sim.state.altitude - site.altitude)).toBeLessThan(1);
      expect(Math.abs(sim.state.altitudeAGL)).toBeLessThan(1);
      expect(Math.abs(sim.state.lat - site.latitude)).toBeLessThan(1e-6);
    }
  });

  it('weighs the stack on the pad with the normal gravity: J2 and the Earth\'s turn, Somigliana to 0.01 %', () => {
    let worst = 0;
    for (const site of SITES) {
      const lat = site.latitude * DEG;
      const r = groundPositionEci(lat, site.longitude * DEG, site.altitude, 0.7);
      const g = effectiveGravityJ2(r);
      worst = Math.max(worst, Math.abs(norm(g) / somigliana(lat, site.altitude) - 1));
      // and it points down the ellipsoid's normal, as the plumb line does
      const normal = { x: Math.cos(lat) * Math.cos(site.longitude * DEG + 0.7), y: Math.cos(lat) * Math.sin(site.longitude * DEG + 0.7), z: Math.sin(lat) };
      expect(-dot(normalize(g), normal)).toBeGreaterThan(Math.cos(0.001 * DEG));
    }
    expect(worst).toBeLessThan(1e-4);
    // J2 alone on the old sphere's pads was worse than the point mass above ~35° (why the two came together)
    const plesetsk = siteById('plesetsk'), lat = plesetsk.latitude * DEG;
    const onSphere = { x: (R_EARTH + plesetsk.altitude) * Math.cos(lat), y: 0, z: (R_EARTH + plesetsk.altitude) * Math.sin(lat) };
    const old = Math.abs(norm(effectiveGravityJ2(onSphere)) / somigliana(lat, plesetsk.altitude) - 1);
    expect(old).toBeGreaterThan(0.005);
  });

  it('gives the planner the pad\'s geocentric latitude for the plane through it', () => {
    const site = siteById('baikonur');
    const pad = groundPositionEci(site.latitude * DEG, site.longitude * DEG, site.altitude, 0);
    expect(Math.abs(padPlaneLatitude(site) - Math.atan2(pad.z, Math.hypot(pad.x, pad.y)))).toBeLessThan(1e-12);
    expect(padPlaneLatitude(site) / DEG).toBeCloseTo(45.773, 3);
  });

  it('computes the fast geodetic height as the two-pass one, to a micrometre, from the pad to the Moon', () => {
    for (let k = 0; k < 2000; k++) {
      const lat = (k % 179 - 89) * DEG * 1.003, lon = k * 0.37, h = -20e3 + (k * 7919) % 400e6 * (k % 3 === 0 ? 1 : 0.001);
      const p = wgs84(lat, lon, h);
      expect(Math.abs(geodeticHeight(p) - h)).toBeLessThan(1e-6);
      expect(Math.abs(geodeticFast(p.x, p.y, p.z).lat - lat)).toBeLessThan(1e-7);
      if (h < 2000e3) expect(Math.abs(geodetic(p.x, p.y, p.z).h - geodeticHeight(p))).toBeLessThan(1e-3);
    }
  });
});

describe('J2 in the point mass, from the pad through every coast (R4.2)', () => {
  it('records the J2 field as the gravity of every point-mass step, powered and coasting', { timeout: 120_000 }, () => {
    const sim = flight('cape', 'falcon9', 'gto');
    const seen = new Set<string>();
    let worst = 0;
    while (sim.state.t < 3000 && !sim.done) {
      sim.step(sim.suggestedDt());
      const e = sim.state.eom;
      if (!e) continue;
      seen.add(e.integrator);
      worst = Math.max(worst, norm(sub(e.gravityAccel, gravityJ2(e.r))) / norm(e.gravityAccel));
    }
    expect(seen.has('pointMass')).toBe(true);
    expect(seen.has('coast')).toBe(true);
    expect(seen.has('kepler' as never)).toBe(false);
    expect(worst).toBe(0);
  });

  it('closes the Δv budget on the J2 field: thrust Δv less the losses is the speed gained, to 1 %', { timeout: 120_000 }, () => {
    for (const [vehicle, site] of [['soyuz21b', 'plesetsk'], ['falcon9', 'cape'], ['h3', 'tanegashima']] as const) {
      const sim = flight(site, vehicle, vehicle === 'soyuz21b' ? 'sso' : 'leo');
      const v0 = norm(sim.state.v);
      while (sim.state.status !== 'orbit' && sim.state.status !== 'failed' && sim.state.t < 2000) {
        sim.step(sim.suggestedDt());
        if (sim.events.some((e) => e.key === 'evt.seco' || e.key === 'evt.parkingOrbit')) break;
      }
      const l = sim.state.losses, gained = norm(sim.state.v) - v0;
      const residual = l.dvThrust - l.gravity - l.drag - l.steering - gained;
      expect(Math.abs(residual), `${vehicle}: ${l.dvThrust.toFixed(1)} − ${l.gravity.toFixed(1)} − ${l.drag.toFixed(1)} − ${l.steering.toFixed(1)} vs ${gained.toFixed(1)}`)
        .toBeLessThan(0.01 * l.dvThrust);
    }
  });

  it('judges a point-mass orbit on its physical apsides, as six-DOF (M-LAUNCH-031)', { timeout: 120_000 }, () => {
    const sim = flight('cape', 'falcon9', 'leo');
    while (!sim.done && sim.state.t < 20000) sim.step(sim.suggestedDt());
    const verdict = sim.events.find((e) => e.key === 'evt.targetOrbit');
    expect(verdict).toBeDefined();
    // the physical apsides are recorded beside the rounded ones when they are what was judged
    expect(typeof verdict!.params?.apAltM).toBe('number');
    expect(typeof verdict!.params?.peAltM).toBe('number');
  });
});

describe('the drawn Earth is the WGS-84 ellipsoid, and the pads sit on it', () => {
  it('builds a globe whose every vertex lies on WGS-84 once its pole is turned to +z', () => {
    const geo = ellipsoidGeometry(R_EARTH, 128, 96);
    const turn = new THREE.Matrix4().makeRotationX(Math.PI / 2);
    const p = new THREE.Vector3();
    const pos = geo.attributes.position as THREE.BufferAttribute;
    let worst = 0;
    for (let i = 0; i < pos.count; i++) {
      p.fromBufferAttribute(pos, i).applyMatrix4(turn);
      worst = Math.max(worst, Math.abs(geodeticHeight(p)), Math.abs(p.length() - ellipsoidRadius(R_EARTH, p.x / p.length(), p.y / p.length(), p.z / p.length())));
    }
    // float32 vertices: their unit in the last place at 6 400 km is half a metre
    expect(worst).toBeLessThan(1);
    geo.dispose();
  });

  it('draws every pad on the flattened globe, where the physics puts it, to a metre', () => {
    // the pads' canvases are textures, which nothing here draws
    const context = new Proxy({}, { get: () => () => ({ addColorStop: () => undefined }) });
    vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => context }) });
    try {
      for (const id of ['baikonur', 'plesetsk', 'cape', 'kourou', 'starbase']) {
        const sim = flight(id, id === 'starbase' ? 'starship' : id === 'cape' ? 'falcon9' : id === 'kourou' ? 'ariane64' : 'soyuz21b');
        const camera = new THREE.PerspectiveCamera();
        const manager = { scene: new THREE.Scene(), camera, toScene: (q: { x: number; y: number; z: number }, out: THREE.Vector3) => out.set(q.x, q.y, q.z) } as unknown as SceneManager;
        const view = new LaunchPadView(sim.site, sim.vehicleSpec, { azimuth: sim.plan.azimuthRotating });
        const theta = sim.state.theta;
        camera.position.copy(view.group.position);
        view.update(manager, { t: sim.state.t, theta, debris: [], stages: [], altitudeAGL: 0, thrust: 0, throttle: 0, r: sim.state.r } as unknown as VisualFrame, 0);
        const drawn = view.group.position;
        // where the physics stands the vehicle on the pad
        expect(drawn.distanceTo(new THREE.Vector3(sim.state.r.x, sim.state.r.y, sim.state.r.z))).toBeLessThan(1);
        // on the drawn globe's surface plus the site's altitude
        const n = drawn.length();
        expect(Math.abs(n - ellipsoidRadius(R_EARTH, drawn.x / n, drawn.y / n, drawn.z / n) - sim.site.altitude)).toBeLessThan(1);
        view.dispose();
      }
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
