/**
 * Sky, haze and exposure as a function of the sun's elevation at the camera and
 * the camera's altitude: deep blue at noon, orange through twilight, black with
 * stars above ~60 km, plus horizon fog near the pad.
 */
import * as THREE from 'three';
import { clamp01, smoothstep } from './noise';

export interface SkyState {
  /** clear colour / fog colour */
  color: THREE.Color;
  /** 0 = space, 1 = sea level */
  groundFactor: number;
  /** 0 = night, 1 = full day */
  dayFactor: number;
  /** star opacity 0..1 */
  stars: number;
  /** renderer exposure */
  exposure: number;
  ambient: number;
  hemi: number;
  /** linear fog distances, m (fog disabled when `fogFar` <= 0) */
  fogNear: number;
  fogFar: number;
}

const ZENITH_DAY = new THREE.Color(0.20, 0.42, 0.85);
const HORIZON_DAY = new THREE.Color(0.58, 0.72, 0.92);
const DUSK = new THREE.Color(0.92, 0.42, 0.16);
const NIGHT = new THREE.Color(0.012, 0.018, 0.045);

const out: SkyState = {
  color: new THREE.Color(), groundFactor: 0, dayFactor: 0, stars: 1, exposure: 1,
  ambient: 0.4, hemi: 0.8, fogNear: 0, fogFar: 0,
};
/** scratch colour, hoisted so `skyState` allocates nothing per rendered frame */
const lit = new THREE.Color();

/**
 * @param sunElev sine of the sun's elevation at the camera (up · sunDir)
 * @param camAltitude camera altitude above the ellipsoid, m
 * @param visibility horizontal visibility near the ground, m
 */
export function skyState(sunElev: number, camAltitude: number, visibility = 45e3): SkyState {
  // how much atmosphere is between the camera and space
  const g = 1 - smoothstep(12e3, 72e3, camAltitude);
  const day = smoothstep(-0.18, 0.15, sunElev);
  const twilight = smoothstep(-0.28, -0.02, sunElev) * (1 - smoothstep(0.02, 0.22, sunElev));
  const c = out.color;
  c.copy(NIGHT);
  lit.copy(HORIZON_DAY).lerp(ZENITH_DAY, 1 - g * 0.55);
  c.lerp(lit, day * g);
  c.lerp(DUSK, twilight * g * 0.75);
  // thin, dark blue band just above the dense atmosphere
  c.multiplyScalar(0.25 + 0.75 * g);
  out.groundFactor = g;
  out.dayFactor = day;
  out.stars = clamp01(1 - g * (0.25 + 0.75 * day));
  out.exposure = 1.08 - 0.2 * g * day;
  // Fill light is deliberately weak and close to neutral: at the previous
  // levels (ambient up to 0.97, hemi up to 1.25) the blue sky lights drowned
  // the 2.6-intensity sun and every vehicle rendered slate blue regardless of
  // its paint. The sun must clearly dominate the lit side; the sky's job is
  // only to keep the shadowed side readable.
  // In vacuum there is no sky to fill with. The ambient term has to fall to
  // almost nothing there, otherwise the shadowed side of a satellite is as
  // bright as the sunlit side and the eclipse test in SceneManager.update has
  // nothing to darken — orbital night is about 35 % of every LEO orbit and it
  // should look like night. `SceneManager` then adds Earth-shine from nadir,
  // which is the fill that really exists up there.
  out.ambient = 0.05 + 0.22 * g * day + 0.09 * g * (1 - day);
  out.hemi = 0.08 + 0.26 * g * day;
  // Haze is a pad-level effect only. The Earth globe is drawn with its own
  // shader and takes no fog, so fogging distant terrain at altitude would put a
  // visible seam along the horizon.
  if (camAltitude < 8e3) {
    out.fogNear = 1500 + camAltitude * 2.5;
    out.fogFar = visibility * 0.6 + camAltitude * 10;
  } else {
    out.fogNear = 0;
    out.fogFar = 0;
  }
  return out;
}
