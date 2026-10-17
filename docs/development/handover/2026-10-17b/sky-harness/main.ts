// The sky harness: the app's SceneManager (and, near a pad, its LaunchPadView)
// with the app's Earth textures, posed at fixed views, rendered on demand.
// window.shoot(name) -> PNG data URL; window.time(name, n) -> ms per frame.
import * as THREE from 'three';
import { SceneManager, loadEarthTextures } from '@src/render/scene';
import { LaunchPadView } from '@src/render/launchpad';
import { siteById } from '@src/data/sites';
import { VEHICLES } from '@src/data/vehicles';
import { R_EARTH } from '@src/physics/constants';

type V = [number, number, number];
/** a cost probe (NOAERIAL=1 at build): the globe and the clouds drawn without the haze, the sky pass as it is */
declare const __NOAERIAL__: boolean;
const D = Math.PI / 180;

/** local east/north/up at (lat, lon), the Earth turned to theta = 0 (longitude 0 on +X) */
function enu(lat: number, lon: number): { e: V; n: V; u: V } {
  const a = lat * D, b = lon * D;
  return {
    u: [Math.cos(a) * Math.cos(b), Math.cos(a) * Math.sin(b), Math.sin(a)],
    e: [-Math.sin(b), Math.cos(b), 0],
    n: [-Math.sin(a) * Math.cos(b), -Math.sin(a) * Math.sin(b), Math.cos(a)],
  };
}
/** azimuth from north towards east, elevation above the local horizontal */
function towards(f: { e: V; n: V; u: V }, az: number, el: number): V {
  const ca = Math.cos(el * D), x = ca * Math.sin(az * D), y = ca * Math.cos(az * D), z = Math.sin(el * D);
  return [0, 1, 2].map((k) => x * f.e[k] + y * f.n[k] + z * f.u[k]) as V;
}

interface View {
  lat: number; lon: number; alt: number;
  lookAz: number; lookEl: number;
  /** the sun over the camera's local horizon */
  sunAz: number; sunEl: number;
  gradient?: boolean;
  /** the scattering sky's and the aerial perspective's illuminance, forced (a probe, not an app state) */
  illum?: number;
  /** the same, for the sky pass alone or for the haze over the globe and the clouds alone (probes of the owner's options) */
  skyIllum?: number;
  hazeIllum?: number;
  /** a pad in view: the site, and the camera's offset from it (east, north, up, m) */
  pad?: { site: string; off: V };
}

export const VIEWS: Record<string, View> = {
  // 400 km over the tropical Atlantic, looking west at the limb, the sun high to the left behind
  'limb-day': { lat: 12, lon: -35, alt: 400e3, lookAz: 270, lookEl: -16, sunAz: 160, sunEl: 40 },
  // 400 km over the Arabian Sea at sunset below: looking north along the terminator, day to the west (left), night to the east
  'limb-terminator': { lat: 12, lon: 66, alt: 400e3, lookAz: 0, lookEl: -14, sunAz: 270, sunEl: 2 },
  // the same, looking east from over the day side into the night: the reddened band, then city lights
  'limb-into-night': { lat: 14, lon: 62, alt: 400e3, lookAz: 80, lookEl: -18, sunAz: 250, sunEl: 7 },
  // 400 km straight down on the Bahamas banks, mid-morning sun
  nadir: { lat: 24.5, lon: -77.5, alt: 400e3, lookAz: 0, lookEl: -90, sunAz: 120, sunEl: 50 },
  // 30 km over the Atlantic off the Cape, looking back west at Florida
  'alt-30km': { lat: 28.5, lon: -80.25, alt: 30e3, lookAz: 265, lookEl: -6, sunAz: 150, sunEl: 35, pad: { site: 'cape', off: [0, 0, 0] } },
  // 30 km at sunset (an evening ascent): the sun 1 deg below the camera's horizon, still up for it, set for the ground below
  'alt-30km-dusk': { lat: 28.5, lon: -80.25, alt: 30e3, lookAz: 262, lookEl: -5, sunAz: 262, sunEl: -1, pad: { site: 'cape', off: [0, 0, 0] } },
  // 12 km over the Cape, looking east over the ocean
  'alt-12km': { lat: 28.56, lon: -80.5, alt: 12e3, lookAz: 95, lookEl: -3.5, sunAz: 200, sunEl: 30, pad: { site: 'cape', off: [0, 0, 0] } },
  // the pad at dusk, the sun just set: looking west into the afterglow, then east at the Earth's shadow
  'pad-dusk-west': { lat: 0, lon: 0, alt: 0, lookAz: 268, lookEl: 4, sunAz: 262, sunEl: -1.5, pad: { site: 'cape', off: [320, -60, 45] } },
  'pad-dusk-east': { lat: 0, lon: 0, alt: 0, lookAz: 82, lookEl: 6, sunAz: 262, sunEl: -1.5, pad: { site: 'cape', off: [-320, 60, 45] } },
  // open Pacific 40 deg off the nadir of 400 km, the sun 50 deg up behind the camera (a probe of the haze's strength)
  'ocean-40': { lat: 0, lon: -150, alt: 400e3, lookAz: 90, lookEl: -50, sunAz: 270, sunEl: 50 },
  'ocean-40-illum8': { lat: 0, lon: -150, alt: 400e3, lookAz: 90, lookEl: -50, sunAz: 270, sunEl: 50, illum: 8 },
  // option (b): the sky pass brighter in space than the haze; option (c): the haze at half the model's
  'limb-day-sky8': { lat: 12, lon: -35, alt: 400e3, lookAz: 270, lookEl: -16, sunAz: 160, sunEl: 40, skyIllum: 8 },
  'limb-day-haze-half': { lat: 12, lon: -35, alt: 400e3, lookAz: 270, lookEl: -16, sunAz: 160, sunEl: 40, hazeIllum: 1.65 },
  'nadir-haze-half': { lat: 24.5, lon: -77.5, alt: 400e3, lookAz: 0, lookEl: -90, sunAz: 120, sunEl: 50, hazeIllum: 1.65 },
  // the sun from orbit: high in black space, and just over the limb (its disc and glare follow the sky's illuminance)
  'sun-space': { lat: 12, lon: -35, alt: 400e3, lookAz: 270, lookEl: 5, sunAz: 270, sunEl: 12 },
  'sun-limb': { lat: 12, lon: -35, alt: 400e3, lookAz: 270, lookEl: -14, sunAz: 270, sunEl: -14 },
  // 400 km at 84 N over the Arctic ice, the sun 20 deg up: white ice under a middle sun
  'pole-400': { lat: 84, lon: 40, alt: 400e3, lookAz: 0, lookEl: -40, sunAz: 180, sunEl: 20 },
  // the 30 km and 12 km views with no pad in the scene: the globe itself under the camera, not the pad's terrain patch
  'alt-30km-nopad': { lat: 28.5, lon: -80.25, alt: 30e3, lookAz: 265, lookEl: -6, sunAz: 150, sunEl: 35 },
  'alt-12km-nopad': { lat: 28.56, lon: -80.5, alt: 12e3, lookAz: 95, lookEl: -3.5, sunAz: 200, sunEl: 30 },
  // the 30 km no-pad view at 20 and 45 km (the climb's question 2): the same place, look and sun, the look tipped
  // down by the horizon's dip (4.53 deg at 20 km, 6.79 at 45) so the horizon sits where it does at 30 km
  'alt-20km-nopad': { lat: 28.5, lon: -80.25, alt: 20e3, lookAz: 265, lookEl: -5, sunAz: 150, sunEl: 35 },
  'alt-45km-nopad': { lat: 28.5, lon: -80.25, alt: 45e3, lookAz: 265, lookEl: -7.25, sunAz: 150, sunEl: 35 },
  // the same with the haze at the scene's sun (3.3) and the sky pass as it is: the owner's option for the climb
  'alt-30km-nopad-haze33': { lat: 28.5, lon: -80.25, alt: 30e3, lookAz: 265, lookEl: -6, sunAz: 150, sunEl: 35, hazeIllum: 3.3 },
  'alt-12km-nopad-haze33': { lat: 28.56, lon: -80.5, alt: 12e3, lookAz: 95, lookEl: -3.5, sunAz: 200, sunEl: 30, hazeIllum: 3.3 },
  // Plesetsk (62.9 N): the pad at dusk
  'ples-pad-dusk': { lat: 0, lon: 0, alt: 0, lookAz: 300, lookEl: 3, sunAz: 315, sunEl: -2, pad: { site: 'plesetsk', off: [300, -100, 45] } },
  // the gradient sky (?sky=gradient), which the aerial perspective must leave as it was
  'gradient-limb': { lat: 12, lon: -35, alt: 400e3, lookAz: 270, lookEl: -16, sunAz: 160, sunEl: 40, gradient: true },
  'gradient-30km': { lat: 28.5, lon: -80.25, alt: 30e3, lookAz: 265, lookEl: -6, sunAz: 150, sunEl: 35, gradient: true, pad: { site: 'cape', off: [0, 0, 0] } },
};

const canvas = document.getElementById('c') as HTMLCanvasElement;
const W = canvas.width, H = canvas.height;
const ready = (async () => {
  const tex = await loadEarthTextures('./');
  const sm = new SceneManager(canvas, tex);
  sm.resize(W, H);
  const pads = new Map<string, LaunchPadView>();
  const padFor = (id: string): LaunchPadView => {
    let p = pads.get(id);
    if (!p) {
      p = new LaunchPadView(siteById(id), VEHICLES.find((v) => v.id === 'falcon9')!, {});
      sm.scene.add(p.group);
      pads.set(id, p);
    }
    return p;
  };
  return { sm, padFor, pads };
})();

function frameAt(r: V): Record<string, unknown> {
  return {
    t: 0, theta: 0, jd: 2460000, r: { x: r[0], y: r[1], z: r[2] }, v: { x: 0, y: 0, z: 0 }, dir: { x: 0, y: 0, z: 1 },
    stages: [], boosters: [], debris: [], altitudeAGL: 0, liftoff: false, thrust: 0, throttle: 0, destroyed: false, vehicleName: '',
  };
}

async function pose(name: string): Promise<SceneManager> {
  const { sm, padFor, pads } = await ready;
  const v = VIEWS[name];
  if (!v) throw new Error(`no view ${name}`);
  sm.setPhysicalSky(!v.gradient);
  let cam: V, f: { e: V; n: V; u: V }, origin: V;
  if (v.pad) {
    const s = siteById(v.pad.site);
    const pf = enu(s.latitude, s.longitude);
    const rs = R_EARTH + s.altitude;
    const site: V = [pf.u[0] * rs, pf.u[1] * rs, pf.u[2] * rs];
    if (v.alt > 0) {
      f = enu(v.lat, v.lon);
      cam = [0, 1, 2].map((k) => f.u[k] * (R_EARTH + v.alt)) as V;
    } else {
      f = pf;
      const o = v.pad.off;
      cam = [0, 1, 2].map((k) => site[k] + o[0] * pf.e[k] + o[1] * pf.n[k] + o[2] * pf.u[k]) as V;
    }
    origin = v.alt > 0 ? cam : site;
  } else {
    f = enu(v.lat, v.lon);
    cam = [0, 1, 2].map((k) => f.u[k] * (R_EARTH + v.alt)) as V;
    origin = cam;
  }
  for (const [id, p] of pads) p.group.visible = !!v.pad && id === v.pad.site;
  sm.origin = { x: origin[0], y: origin[1], z: origin[2] };
  const c = sm.camera;
  c.position.set(cam[0] - origin[0], cam[1] - origin[1], cam[2] - origin[2]);
  const look = towards(f, v.lookAz, v.lookEl);
  if (Math.abs(v.lookEl) > 89) c.up.set(f.n[0], f.n[1], f.n[2]); else c.up.set(f.u[0], f.u[1], f.u[2]);
  c.lookAt(c.position.x + look[0], c.position.y + look[1], c.position.z + look[2]);
  c.updateMatrixWorld();
  const sun = towards(f, v.sunAz, v.sunEl);
  const frame = frameAt(origin);
  if (v.pad) {
    const p = padFor(v.pad.site);
    const night = Math.max(0, Math.min(1, 0.5 - v.sunEl / 12));
    p.update(sm, frame as never, night);
    sm.setShadowFocus(p.group.position, p.shadowRadius, v.alt < 40e3);
  }
  const alt = Math.hypot(...cam) - R_EARTH;
  sm.update(frame as never, { x: sun[0], y: sun[1], z: sun[2] }, alt);
  if (__NOAERIAL__) {
    const my = sm as unknown as { aerial?: { uAerial: { value: number } } };
    if (my.aerial) my.aerial.uAerial.value = 0;
  }
  if (v.illum !== undefined) {
    const my = sm as unknown as { aerial?: { uSunIlluminance: { value: number } }; physicalSky: { mesh: THREE.Mesh } | null };
    if (my.aerial) my.aerial.uSunIlluminance.value = v.illum;
    if (my.physicalSky) (my.physicalSky.mesh.material as THREE.ShaderMaterial).uniforms.uSunIlluminance.value = v.illum;
  }
  {
    const my = sm as unknown as { aerial?: { uSunIlluminance: { value: number } }; physicalSky: { mesh: THREE.Mesh } | null };
    if (v.skyIllum !== undefined && my.physicalSky) (my.physicalSky.mesh.material as THREE.ShaderMaterial).uniforms.uSunIlluminance.value = v.skyIllum;
    if (v.hazeIllum !== undefined && my.aerial) my.aerial.uSunIlluminance.value = v.hazeIllum;
  }
  return sm;
}

async function shoot(name: string): Promise<string> {
  const sm = await pose(name);
  // the first frames build the sky's tables, the probe and the programs
  for (let i = 0; i < 3; i++) { await pose(name); sm.render(); }
  await pose(name);
  sm.render();
  return canvas.toDataURL('image/png');
}

/** ms per frame of `render()` (the composer: sky, scene, bloom, output), the GPU finished each time */
async function time(name: string, n: number): Promise<{ mean: number; median: number; min: number; samples: number[] }> {
  const sm = await pose(name);
  posed = sm;
  const gl = sm.renderer.getContext();
  const px = new Uint8Array(4);
  for (let i = 0; i < 3; i++) { sm.render(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); }
  const samples: number[] = [];
  for (let i = 0; i < n; i++) {
    const t0 = performance.now();
    sm.render();
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    samples.push(performance.now() - t0);
  }
  const s = [...samples].sort((a, b) => a - b);
  return { mean: samples.reduce((a, b) => a + b, 0) / n, median: s[Math.floor(n / 2)], min: s[0], samples };
}

/** one more frame of the view `time` last posed, the GPU finished, ms */
let posed: SceneManager | null = null;
function frameOnce(): number {
  const sm = posed!, gl = sm.renderer.getContext(), px = new Uint8Array(4);
  const t0 = performance.now();
  sm.render();
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  return performance.now() - t0;
}

Object.assign(window, { shoot, time, frameOnce, views: Object.keys(VIEWS), harnessReady: ready.then(() => true) });
