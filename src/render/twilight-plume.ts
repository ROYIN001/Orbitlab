/**
 * The "twilight jellyfish" (roadmap V02): at dusk or dawn a rocket climbing
 * out of the Earth's shadow into sunlight lights up its own exhaust. Above
 * ~ 50 km the plume, with almost no air to hold it in, balloons out over tens
 * of kilometres, and seen from a darkened ground it glows as a pale dome with
 * a bright rim, trailing tendrils — the shape that gives it its name. It is
 * sunlight scattered by the exhaust's ice and particulates, not the flame.
 *
 * Drawn as a volume, not a picture: a ray from the camera is marched through
 * an axisymmetric cloud behind the vehicle, so the plume has the same shape
 * from any side and from inside it — a dome seen from abeam, rings seen along
 * the flight path. The exterior camera, tens to thousands of metres from the
 * vehicle and so inside the dome, sees it open out round and behind the
 * vehicle; a distant camera sees it whole. The cloud, in units of
 * `jellyfishRadius`, is
 *
 * - a parabolic envelope opening back along the flight path from the nozzle,
 *   wider with altitude (`uExpansion`),
 * - a bright shell just inside that envelope, the rim of the dome,
 * - a brighter, warmer core along the axis near the nozzle, with a few
 *   stationary bands in it,
 * - a faint interior,
 * - tendrils near the rim: value noise, fixed to the vehicle on the scene's
 *   (ECI) axes, so they neither turn with the camera nor jump when the flight
 *   direction swings past the vertical, drifting slowly back along the plume.
 *
 * It is lit by the sun: a phase function makes it far brighter looking
 * towards the sun than away from it, and silver-gold that way; the side
 * facing the sun is brighter, with a golden tint at the rim, the side away
 * from it darker and bluer. It is sized by the altitude, lit by `sunlitAt` at
 * the vehicle, faded out next to the camera and dimmed while the camera is
 * inside it (NEAR_FADE, IMMERSED below), and additive, so against a daylit
 * sky it simply vanishes, as the real one does.
 */
import * as THREE from 'three';
import type { VisualFrame } from '../physics/frame';
import type { Vec3 } from '../physics/vec3';
import { R_EARTH } from '../physics/constants';
import { sunlitAt } from './sky';
import { smoothstep } from './noise';

/*
 * Plume units: metres from the vehicle divided by the plume's radius
 * (`jellyfishRadius`), on the scene's axes, the axis running back along the
 * exhaust from the nozzle (z = 0). Every bound below is in them, and those
 * the JS and the shader both use are written into the shader from here
 * (`toFixed`: a GLSL float needs its decimal point).
 *
 * The bounding sphere: its centre on the axis this far behind the nozzle, and
 * its radius. The shader marches only the chord of the ray inside it, and the
 * proxy quad is sized to its silhouette. At the widest expansion (uExpansion
 * 1.1) density above 0.01 per unit length, 0.4 % of the cloud's peak, reaches
 * 1.198 from this centre, in the wide tail; what lies beyond is a trace.
 */
const BOUND_Z = 1.0;
const BOUND_R = 1.2;
/*
 * A paraboloid r² = PARA_K (z + PARA_Z0) round the envelope, out to the
 * cloud's edge (1.22 envelope radii) at the widest expansion, which it comes
 * within 1.6 % of near z = 0.85: the chord is cut to it as well, so that a ray
 * across the narrow end, where the shell is thin, spends its steps inside the
 * cloud and not in the empty corners of the sphere. It halved the sampling
 * error of views from abeam.
 */
const PARA_K = 0.68;
const PARA_Z0 = 0.15;
/*
 * The cloud close to the camera: none nearer than NEAR_CUT, full density from
 * NEAR_FADE. The exterior camera sits tens to thousands of metres from the
 * vehicle, which in a plume tens of kilometres across is at the apex of the
 * dome, inside the core: unfaded, the gas round the lens washed the screen
 * out and hid the shape. Faded, the camera sees the dome round it and the
 * plume stretching away. Next to the nozzle the real exhaust is a narrow jet,
 * which the flame itself draws (render/exhaust.ts).
 */
const NEAR_CUT = 0.02;
const NEAR_FADE = 0.12;
/* steps along the chord: few enough for a full-screen pass, the jitter turning their banding into fine grain */
const STEPS = 14;
/*
 * The cloud's brightness with the camera inside it (within 1.1 bounding radii
 * of the centre), as a fraction of its brightness from outside (beyond 3),
 * blended between. From inside it fills the view, and as bright as it is
 * from outside it filled the screen with grey-white light: this is the
 * exposure coming down, as a camera's would, for a view full of it.
 */
const IMMERSED = 0.4;
/*
 * The most a pixel of the cloud can reach, linear: cap * tanh(m / cap) on its
 * brightest channel, which leaves the faint cloud alone (0.5 stays 0.48) and
 * stops a column looking into the sun at a bright glow instead of white
 * (the bloom pass starts at 1.0).
 */
const CAP = 1.6;
/*
 * The phase function: Rayleigh mixed with the Cornette-Shanks function for
 * g = 0.68 (W. M. Cornette and J. G. Shanks, "Physically reasonable analytic
 * expression for the single-scattering phase function", Appl. Opt. 31, 3152,
 * 1992), both normalised to a mean of 1 over the sphere:
 *   p(c) = 1.5 (1 - g²)/(2 + g²) (1 + c²) / (1 + g² - 2 g c)^1.5,  c = cos θ.
 * The mix, 0.45 Rayleigh and 0.55 Cornette-Shanks, is 11.7 looking straight
 * at the sun, 0.44 across the sunlight and 0.75 away from it; the cloud takes
 * 0.62 + 0.38 of it, so it is 5.1, 0.79 and 0.91 times as bright.
 */
const G = 0.68;
const CS_K = (1.5 * (1 - G * G)) / (2 + G * G);

const VERT = /* glsl */ `
  uniform vec3 uVehicle;
  uniform float uScale;
  varying vec3 vPos;
  #include <common>
  #include <logdepthbuf_pars_vertex>
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vPos = (w.xyz - uVehicle) / uScale;
    gl_Position = projectionMatrix * viewMatrix * w;
    #include <logdepthbuf_vertex>
  }
`;

/*
 * The shader works in plume units (`uScale` is the radius, `uAxis` the axis).
 * The proxy quad's own position (vPos) gives the ray, so how the quad is
 * turned or sized does not change the picture, only which pixels run it.
 *
 * The ray's chord inside the sphere and the paraboloid, from NEAR_CUT on, is
 * cut into 14 steps. Each samples the cloud at one point, jittered along the
 * step by interleaved gradient noise fixed to the pixel (J. Jimenez, "Next
 * generation post processing in Call of Duty: Advanced Warfare", SIGGRAPH
 * 2014): a jitter that changed every frame shimmered. The cloud starts at the
 * nozzle, z = 0, and is empty past z = 1.84.
 *
 * Except the core, a Gaussian tube round the axis and narrow next to the
 * nozzle: point samples a step apart hit it in one pixel and miss it in the
 * next, which sparkled. Along the ray its squared distance from the axis is
 * d2 + a (t - tm)², so each step integrates the tube exactly over its own
 * length, by the error function (`erfa`: erf x ≈ tanh(1.1284 x + 0.1009 x³),
 * J. D. Vedder, Am. J. Phys. 55, 762, 1987, within 3.6e-4; the argument is
 * held to ±3, where erf is 1 to 2e-5, as some drivers' tanh overflows to NaN
 * for large arguments). The bands in it are faded by how far the step runs
 * along the axis, by exp(-w²/6), which follows the average of a cosine over
 * the step, sin w / w (w half the phase it covers), while w is small and
 * falls off where that oscillates: a step longer than a band leaves little
 * of them to alias.
 *
 * Each step's colour: ice-blue, paler upwards; golden towards the rim on the
 * side facing the sun only, so the side away from it stays bluer; golden
 * everywhere looking sunwards (forward scattering: weighting this by the lit
 * side too took the gold out of a view towards the sun through the plume,
 * whose near side is the shaded one); warmer where the core dominates;
 * brighter on the sunward side and by the phase function.
 * Composited front to back, so a thick column saturates instead of piling up,
 * then capped (CAP).
 */
const FRAG = /* glsl */ `
  #include <logdepthbuf_pars_fragment>
  uniform float uIntensity, uTime, uExpansion, uScale;
  uniform vec3 uVehicle, uAxis, uSun, uUp;
  varying vec3 vPos;

  float hash13(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.zyx + 31.32);
    return fract((p.x + p.y) * p.z);
  }
  float noise3(vec3 x) {
    vec3 i = floor(x), f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash13(i), hash13(i + vec3(1, 0, 0)), f.x), mix(hash13(i + vec3(0, 1, 0)), hash13(i + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(hash13(i + vec3(0, 0, 1)), hash13(i + vec3(1, 0, 1)), f.x), mix(hash13(i + vec3(0, 1, 1)), hash13(i + vec3(1, 1, 1)), f.x), f.y),
      f.z);
  }
  float erfa(float x) {
    x = clamp(x, -3.0, 3.0);
    return tanh(x * (1.1284 + 0.1009 * x * x));
  }

  void main() {
    #include <logdepthbuf_fragment>
    vec3 ro = (cameraPosition - uVehicle) / uScale;
    vec3 rd = normalize(vPos - ro);
    vec3 oc = ro - uAxis * ${BOUND_Z.toFixed(2)};
    float b = dot(oc, rd);
    float h = b * b - dot(oc, oc) + ${(BOUND_R * BOUND_R).toFixed(4)};
    if (h <= 0.0) discard;
    h = sqrt(h);
    float t0 = max(${NEAR_CUT.toFixed(2)}, -b - h);
    float t1 = h - b;
    float ra = dot(rd, uAxis);
    vec3 rp = rd - ra * uAxis;
    vec3 op = ro - dot(ro, uAxis) * uAxis;
    float a = max(dot(rp, rp), 1e-6);
    float tm = -dot(op, rp) / a;
    float d2 = max(dot(op, op) - a * tm * tm, 0.0);
    float c2 = dot(op, op) - ${PARA_K.toFixed(2)} * (dot(ro, uAxis) + ${PARA_Z0.toFixed(2)});
    b = -a * tm - ${(PARA_K / 2).toFixed(2)} * ra;
    h = b * b - a * c2;
    if (h <= 0.0) discard;
    h = b < 0.0 ? sqrt(h) - b : -sqrt(h) - b;
    t0 = max(t0, min(h / a, c2 / h));
    t1 = min(t1, max(h / a, c2 / h));
    float dt = (t1 - t0) / ${STEPS.toFixed(1)};
    if (dt <= 0.0) discard;
    float sa = sqrt(2.4 * a);
    float wz = 14.4 * dt * abs(ra);
    float bands = 0.28 * exp(-wz * wz / 6.0);
    float jitter = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));

    float c = dot(rd, uSun);
    float light = 0.62 + 0.38 * mix(0.75 * (1.0 + c * c), ${CS_K.toFixed(4)} * (1.0 + c * c) / pow(${(1 + G * G).toFixed(4)} - ${(2 * G).toFixed(2)} * c, 1.5), 0.55);
    vec3 col = vec3(0.0);
    float alpha = 0.0;

    for (int i = 0; i < ${STEPS}; i++) {
      float ts = t0 + float(i) * dt;
      float t = ts + jitter * dt;
      vec3 p = ro + rd * t;
      float z = dot(p, uAxis);
      if (z < 0.0 || z > 1.84) continue;
      float u = clamp(z / 1.8, 0.0, 1.0);

      float cr = 0.015 + 0.22 * pow(u, 0.72) * (1.0 - 0.55 * u);
      float x0 = sa * (ts - tm) / cr;
      float core = (erfa(x0 + sa * dt / cr) - erfa(x0)) * 0.8862 * cr / sa * exp(-2.4 * d2 / (cr * cr))
                 * (1.0 - smoothstep(0.0, 0.42, u)) * (0.72 + bands * cos(z * 28.9) * exp(-6.5 * u)) * 1.45;

      vec3 q = p - z * uAxis;
      float r = length(q);
      float env = 0.02 + uExpansion * 0.96 * pow(u, 0.56) * (1.0 - 0.24 * pow(u, 1.65));
      float rho = r / env;
      float rest = 0.0;
      if (rho < 1.22) {
        float e = (rho - 0.9) / mix(0.09, 0.16, u);
        float shell = exp(-e * e) * smoothstep(0.0, 0.06, u) * (1.0 - smoothstep(0.52, 1.02, u));
        float cavity = (1.0 - smoothstep(0.15, 0.92, rho)) * smoothstep(0.02, 0.14, u) * (1.0 - smoothstep(0.3, 0.95, u)) * 0.16;
        vec3 fp = 3.8 * p - uAxis * (1.2 * z + 0.045 * uTime);
        float turb = noise3(fp) * 0.65 + noise3(fp * 2.4 + vec3(13.7, 5.2, 0.0) - uAxis * (0.08 * uTime)) * 0.35;
        float flutes = smoothstep(0.42, 0.88, noise3(q / max(r, 1e-5) * 3.2 + uAxis * (3.0 * u - 0.03 * uTime)));
        e = (rho - 0.76) / 0.26;
        float tendrils = flutes * turb * exp(-e * e) * smoothstep(0.12, 0.45, u) * (1.0 - smoothstep(0.68, 1.0, u)) * 0.85;
        rest = shell * (0.55 + 0.75 * turb) + cavity + tendrils;
      }
      float sum = (core + rest * dt) * 1.35;
      float dens = sum * smoothstep(${NEAR_CUT.toFixed(2)}, ${NEAR_FADE.toFixed(2)}, t);
      if (dens < 0.0005) continue;

      float lit = smoothstep(-0.85, 0.85, dot(q + (0.5 * z - 0.175) * uAxis, uSun) / max(0.08, env));
      vec3 s = mix(vec3(0.48, 0.68, 1.0), vec3(0.76, 0.9, 1.0), clamp(dot(p, uUp) * 0.6 + 0.5, 0.0, 1.0));
      s = mix(s, vec3(1.0, 0.85, 0.68), smoothstep(0.72, 1.02, rho) * 0.55 * lit + max(0.0, c) * 0.35);
      s = mix(s, vec3(1.0, 0.92, 0.8), clamp(core / (sum + 0.01 * dt), 0.0, 1.0));
      col += (1.0 - alpha) * s * mix(0.42, 1.32, lit) * light * dens;
      alpha += (1.0 - alpha) * min(1.0, dens * 0.65);
    }
    col *= uIntensity;
    float m = max(col.r, max(col.g, col.b));
    if (m < 1e-3) discard;
    col *= ${CAP.toFixed(1)} * tanh(min(m / ${CAP.toFixed(1)}, 4.0)) / m;
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/** The plume's radius at an altitude, m: nothing below 45 km, tens of km by 120 km. */
export function jellyfishRadius(altitude: number): number {
  return Math.max(0, Math.min(60e3, (altitude - 45e3) * 0.45));
}

/**
 * How bright it is, 0..1: the engines burning, the plume expanded (thin air),
 * the vehicle in sunlight, and the camera in a sky dark enough to see it.
 */
export function jellyfishIntensity(frame: Pick<VisualFrame, 'thrust' | 'altitude' | 'r'>, sunDir: Vec3, cameraSunElev: number): number {
  if (!(frame.thrust > 0)) return 0;
  const grow = smoothstep(45e3, 90e3, frame.altitude);
  const lit = sunlitAt(frame.r, sunDir, R_EARTH);
  // the observer's twilight: the sun between a few degrees above and 18° below the horizon
  const dusk = smoothstep(0.1, -0.02, cameraSunElev) * smoothstep(-0.32, -0.12, cameraSunElev);
  return grow * lit * Math.max(dusk, 0.15 * smoothstep(0.1, -0.02, cameraSunElev));
}

const Z_AXIS = new THREE.Vector3(0, 0, 1);

export class TwilightPlume {
  /** added straight to the scene: the quad's placement below is in world (= scene) coordinates */
  readonly mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;
  private readonly axis = new THREE.Vector3();
  private readonly tmp = new THREE.Vector3();

  constructor() {
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uIntensity: { value: 0 },
        uTime: { value: 0 },
        uExpansion: { value: 1 },
        uScale: { value: 1 },
        uVehicle: { value: new THREE.Vector3() },
        uAxis: { value: new THREE.Vector3(0, 0, 1) },
        uSun: { value: new THREE.Vector3(0, 1, 0) },
        uUp: { value: new THREE.Vector3(0, 1, 0) },
      },
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    this.mesh.renderOrder = 5;
  }

  /**
   * @param vehicle the vehicle in scene coordinates
   * @param dir its direction of flight (unit, ECI = scene axes)
   * @param sunDir unit vector to the sun (ECI)
   * @param cameraSunElev sine of the sun's elevation at the camera
   * @param camera the scene camera, which has no parent: its position and
   *   quaternion are in scene coordinates, and its projection matrix is up to
   *   date for this frame
   */
  update(frame: VisualFrame, vehicle: THREE.Vector3, dir: Vec3, sunDir: Vec3, cameraSunElev: number, camera: THREE.Camera): void {
    const radius = jellyfishRadius(frame.altitude);
    const intensity = jellyfishIntensity(frame, sunDir, cameraSunElev);
    const axis = this.axis.set(-dir.x, -dir.y, -dir.z);
    this.mesh.visible = intensity > 0.01 && radius > 100 && axis.lengthSq() > 0.25;
    if (!this.mesh.visible) return;
    axis.normalize();
    const rb = BOUND_R * radius;
    const toCentre = this.tmp.copy(vehicle).addScaledVector(axis, BOUND_Z * radius).sub(camera.position);
    const d = toCentre.length();
    const u = this.material.uniforms;
    u.uIntensity.value = intensity * 1.75 * (IMMERSED + (1 - IMMERSED) * smoothstep(1.1, 3, d / rb));
    // mission time, so the tendrils drift the same way in a replay
    u.uTime.value = frame.t;
    // the envelope's width: 0.75 at 45 km, 1.1 from 110 km
    u.uExpansion.value = 0.75 + 0.35 * smoothstep(45e3, 110e3, frame.altitude);
    u.uScale.value = radius;
    (u.uVehicle.value as THREE.Vector3).copy(vehicle);
    (u.uAxis.value as THREE.Vector3).copy(axis);
    (u.uSun.value as THREE.Vector3).set(sunDir.x, sunDir.y, sunDir.z).normalize();
    // the zenith at the vehicle: the cloud is paler above it than below
    (u.uUp.value as THREE.Vector3).set(frame.r.x, frame.r.y, frame.r.z).normalize();

    // The proxy quad: the pixels the shader runs on. From outside the
    // bounding sphere, a quad at its centre facing the camera: a sphere of
    // radius rb at distance d fills a cone of half-angle asin(rb/d), which
    // meets that plane in a circle of radius rb d / sqrt(d² - rb²) — larger
    // than rb, by 2.4 times at the hand-over (a quad of half-size about rb
    // cut the dome to straight edges within 3.6 plume radii). From inside the
    // sphere or within 1.1 rb of its centre, a quad across the whole view.
    if (d > rb * 1.1) {
      this.mesh.position.copy(camera.position).add(toCentre);
      this.mesh.quaternion.setFromUnitVectors(Z_AXIS, toCentre.multiplyScalar(-1 / d));
      this.mesh.scale.setScalar((rb * d) / Math.sqrt(d * d - rb * rb));
    } else {
      // Just beyond the vehicle (150 m is longer than any stack), so that
      // the vehicle hides the cloud behind it; never deeper than NEAR_FADE, so
      // that what anything nearer than the quad hides is cloud already fading
      // out; never nearer than 2 m, well clear of the 0.5 m near plane.
      // Square, covering the frustum at that depth with any view offset (the
      // landing page shifts its picture): x/depth reaches (1 + |e8|) / e0 at
      // the screen's edge, y/depth (1 + |e9|) / e5.
      const fwd = this.tmp.set(0, 0, -1).applyQuaternion(camera.quaternion);
      const depth = Math.min(NEAR_FADE * radius, Math.max(2, fwd.dot(vehicle) - fwd.dot(camera.position) + 150));
      const e = camera.projectionMatrix.elements;
      this.mesh.position.copy(camera.position).addScaledVector(fwd, depth);
      this.mesh.quaternion.copy(camera.quaternion);
      this.mesh.scale.setScalar(depth * 1.01 * Math.max((1 + Math.abs(e[8])) / e[0], (1 + Math.abs(e[9])) / e[5]));
    }
  }

  dispose(): void {
    this.material.dispose();
    this.mesh.geometry.dispose();
  }
}
