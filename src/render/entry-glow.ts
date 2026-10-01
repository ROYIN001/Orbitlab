/**
 * The glow of an entry: the shock layer ahead of a body coming in from orbit,
 * hottest where the flow stops on it, and the wake of hot gas behind it.
 *
 * Its strength is the heating's at the stagnation point, ∝ √ρ·v³ (the
 * Sutton–Graves form, src/physics/sim/entry-heating.ts), on Apollo's scale:
 * 1 at Apollo 11's peak, about 60 km up at 10 km/s. Vostok's sphere peaks
 * near a third of that, about 45 km up at 6 km/s; that is the physics, and it
 * is drawn as it comes (how bright a given strength looks is the drawing's).
 *
 * The glow is pointed along the airflow, never along the body's axes: a body
 * tumbling through the entry — Vostok's sphere and its instrument module,
 * spinning at 30°/s from the venting after the retro burn — keeps its shock
 * on whichever side meets the air.
 *
 * The gas is drawn as a thin glowing shell: brightest where the line of sight
 * runs along it (the limb), and fading from the stagnation point back round
 * the shoulder; the wake as a cone fading down its length.
 */
import * as THREE from 'three';
import { density } from '../physics/atmosphere';

/**
 * How brightly the air round a body glows, 0..1: as the heating at its stagnation
 * point goes, √ρ·v³ — full at Apollo's peak heating, about 60 km up at 10 km/s,
 * first seen near 100 km (the scale the model's, for the picture).
 */
export function entryGlow(alt: number, airspeed: number): number {
  if (!(airspeed > 0) || alt > 130e3) return 0;
  return Math.min(1, (Math.sqrt(density(Math.max(0, alt))) * airspeed ** 3) / 1.2e10);
}

/** A soft round spot, white in the middle and gone at the edge, for the halos (shared, never disposed). */
let spotTex: THREE.Texture | null = null;
export function glowSpot(): THREE.Texture {
  if (spotTex) return spotTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.3, 'rgba(255,255,255,0.9)');
  grad.addColorStop(0.6, 'rgba(255,255,255,0.25)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.userData.shared = true;
  spotTex = t;
  return t;
}

/** The shock layer's colour, orange-red, and its hot core's, yellow-white (the drawing's). */
const SHOCK = new THREE.Color(1.0, 0.45, 0.17);
const CORE = new THREE.Color(1.0, 0.8, 0.5);
/** The far spot's: a saturated orange, which reads against a sunlit cloud deck as well as against space. */
const SPOT = new THREE.Color(1.0, 0.5, 0.12);

const GLOW_VERT = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  varying vec3 vLocal;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    vLocal = position;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vPosW = wp.xyz;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
    #include <logdepthbuf_vertex>
  }
`;

const GLOW_FRAG = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_fragment>
  uniform vec3 uColor;
  uniform vec3 uCore;
  uniform float uIntensity;
  uniform float uWake;
  uniform float uLength;
  varying vec3 vLocal;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    #include <logdepthbuf_fragment>
    vec3 n = normalize(vNormalW);
    vec3 vd = normalize(cameraPosition - vPosW);
    float facing = abs(dot(n, vd));
    float w;
    vec3 col;
    if (uWake < 0.5) {
      // a thin glowing layer: the longer the line of sight through it, the brighter (its limb); up the flow (+Y)
      // the stagnation point, fading back round the shoulder
      float s = normalize(vLocal).y;
      w = pow(clamp((s + 0.45) / 1.45, 0.0, 1.0), 2.2) * (0.28 + 0.72 * pow(1.0 - facing, 1.6));
      col = mix(uColor, uCore, smoothstep(0.55, 1.0, s));
    } else {
      // a column of hot gas: brightest down its middle, soft at its edges, fading to nothing at its end
      float u = clamp(-vLocal.y / uLength, 0.0, 1.0);
      w = pow(1.0 - u, 2.0) * pow(facing, 1.3);
      col = uColor;
    }
    gl_FragColor = vec4(col * uIntensity * w, 1.0);
  }
`;

export interface EntryGlowView {
  /** Put where the body's centre is; its +Y is turned onto the flow by `set`. */
  readonly group: THREE.Group;
  /**
   * @param k strength, 0..1 (`entryGlow`, or a piece's own)
   * @param flow the body's motion through the air, any length, in the axes of the group's parent; null leaves the aim as it is
   */
  set(k: number, flow: THREE.Vector3 | null): void;
  /**
   * Where the camera is, from the body, in the axes of the group's parent:
   * the far spot sits on that side of the body, so the body does not hide
   * it, and shows only when the body is too far off to be seen itself.
   */
  look(toCamera: THREE.Vector3): void;
  dispose(): void;
}

/** Between these distances from the camera, m, the far spot comes in (the drawing's). */
const SPOT_NEAR = 40;
const SPOT_FAR = 200;

export interface EntryGlowOptions {
  /** the wake's length, in body radii */
  wake?: number;
  /**
   * A spot of fixed size on the screen, in the viewport's heights (0.01 is
   * about 9 px on an 800 px picture): what shows of a body kilometres from
   * the camera, where the body itself is under a pixel. 0: none.
   */
  spot?: number;
}

/** The glow round a body of `radius` m: its group's origin at the body's centre, +Y up the flow. */
export function buildEntryGlow(radius: number, opts: EntryGlowOptions = {}): EntryGlowView {
  const wakeLen = radius * (opts.wake ?? 9);
  const group = new THREE.Group();
  const material = (wake: boolean) => new THREE.ShaderMaterial({
    vertexShader: GLOW_VERT, fragmentShader: GLOW_FRAG,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uColor: { value: SHOCK.clone() }, uCore: { value: CORE.clone() }, uIntensity: { value: 0 },
      uWake: { value: wake ? 1 : 0 }, uLength: { value: wakeLen } },
  });
  // the shock standing off the face by about a sixth of the radius (for a sphere, Billig's correlation gives
  // 0.1–0.2 R at these speeds): a shell round the body, its centre a little downstream
  const shellMat = material(false);
  const shell = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.22, 40, 24), shellMat);
  shell.position.y = -radius * 0.07;
  // the wake: hot gas closing in behind the body, as wide as it at the shoulder (CylinderGeometry's top is +Y)
  const wakeMat = material(true);
  const wakeGeo = new THREE.CylinderGeometry(radius * 1.05, radius * 0.25, wakeLen, 28, 6, true);
  wakeGeo.translate(0, -wakeLen / 2, 0);
  const wake = new THREE.Mesh(wakeGeo, wakeMat);
  group.add(shell, wake);
  // a soft halo round it all, the size of the body and its shock
  const haloMat = new THREE.SpriteMaterial({ map: glowSpot(), color: SHOCK.clone(), transparent: true, opacity: 0, blending: THREE.AdditiveBlending,
    depthWrite: false, fog: false });
  const halo = new THREE.Sprite(haloMat);
  // three's sprites share one geometry: never to be disposed with a body (render/dispose.ts)
  halo.geometry.userData.shared = true;
  halo.scale.setScalar(radius * 4.5);
  group.add(halo);
  let spotMat: THREE.SpriteMaterial | null = null, spot: THREE.Sprite | null = null;
  if (opts.spot) {
    // drawn over whatever is behind it (normal blending), so it shows against a sunlit cloud deck as well as the night
    spotMat = new THREE.SpriteMaterial({ map: glowSpot(), color: SPOT.clone(), transparent: true, opacity: 0,
      depthWrite: false, fog: false, sizeAttenuation: false });
    spot = new THREE.Sprite(spotMat);
    spot.scale.setScalar(opts.spot);
    group.add(spot);
  }
  group.visible = false;
  const up = new THREE.Vector3(0, 1, 0), aim = new THREE.Vector3(), inv = new THREE.Quaternion();
  let strength = 0, far = 1;
  const spotOpacity = () => { if (spotMat) spotMat.opacity = far * Math.min(1, 0.55 + 1.2 * strength); };
  const set = (k: number, flow: THREE.Vector3 | null): void => {
    group.visible = k > 0.005;
    if (!group.visible) return;
    if (flow && flow.lengthSq() > 1e-12) group.quaternion.setFromUnitVectors(up, aim.copy(flow).normalize());
    // a gentle curve, so a third of Apollo's peak still reads as the fire it was; over 1 in linear light it blooms
    const b = Math.min(1, Math.pow(k, 0.6));
    strength = b;
    shellMat.uniforms.uIntensity.value = 2.6 * b;
    wakeMat.uniforms.uIntensity.value = 1.3 * b;
    haloMat.opacity = 0.3 * b;
    spotOpacity();
  };
  const look = (toCamera: THREE.Vector3): void => {
    if (!spot) return;
    const d = toCamera.length();
    far = Math.min(1, Math.max(0, (d - SPOT_NEAR) / (SPOT_FAR - SPOT_NEAR)));
    if (d > 1e-6) spot.position.copy(toCamera).multiplyScalar(radius * 1.6 / d).applyQuaternion(inv.copy(group.quaternion).invert());
    spotOpacity();
  };
  return {
    group, set, look,
    dispose: () => {
      shell.geometry.dispose(); wakeGeo.dispose();
      for (const m of [shellMat, wakeMat, haloMat, spotMat]) m?.dispose();
    },
  };
}
