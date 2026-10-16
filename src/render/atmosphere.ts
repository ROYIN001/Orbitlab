/**
 * A physically based sky (roadmap V02): Rayleigh and Mie scattering and ozone
 * absorption in a spherical atmosphere, after Hillaire, "A Scalable and
 * Production Ready Sky and Atmosphere Rendering Technique" (EGSR 2020), with
 * the parameters of Bruneton's reference implementation (2017).
 *
 * Two look-up tables are computed once on the GPU: the **transmittance** from
 * any height and zenith angle to the top of the atmosphere (256 × 64), and the
 * **multiple scattering** a point receives at any height and solar zenith
 * angle (32 × 32, Hillaire's isotropic approximation of every order beyond
 * the first). Each frame a full-screen pass marches every view ray through
 * the atmosphere from the camera — on the pad, in the stratosphere or in
 * orbit alike — summing single scattering (sunlight reaching each sample
 * through the transmittance, the Earth's shadow included) and the multiple
 * scattering term. That one pass is the blue noon sky, the red horizon at
 * dusk, the Earth's shadow rising in the east after sunset, the thin blue
 * limb seen from orbit and the sun's reddened disc. It is drawn first, behind
 * everything; the Earth and the vehicles cover it.
 *
 * The stretch of a view ray inside the atmosphere is found from the camera
 * alone, through the ray's perigee (its closest approach to the Earth's
 * centre), not by re-projecting the point where the ray enters and
 * intersecting again from there: in float32 that point falls just inside or
 * just outside the top of the atmosphere at random, and from just outside the
 * nearer root is the re-entry only metres away — an empty march, a black
 * ring flickering on the limb seen from orbit. Seen from space the samples
 * crowd at the ray's lowest point (the perigee of a ray through the limb, the
 * ground where a ray ends on it); from inside the atmosphere they crowd
 * towards the camera. The sun's disc is darkened towards its limb and has a
 * faint glow round it. The details are at `SKY_FRAG`.
 *
 * It costs a fragment shader of ~ 24 samples per pixel. A slow GPU falls back
 * to the colour-gradient sky of `sky.ts` (the same trial as the glow, F07:
 * src/render/glow-governor.ts), and so does a GPU that cannot render to float
 * textures.
 */
import * as THREE from 'three';
import { R_EARTH } from '../physics/constants';

/** Top of the modelled atmosphere, m above the equatorial radius. */
export const ATMOSPHERE_HEIGHT = 100e3;

/**
 * The atmosphere's constants as GLSL, shared by the three passes (lengths in
 * metres), and the geometry the passes share.
 *
 * - Rayleigh (`RAY_S`, `RAY_H`): scattering at 680/550/440 nm, scale height
 *   8 km.
 * - Mie (`MIE_*`): continental aerosol, scattering and extinction, scale
 *   height 1.2 km, Cornette–Shanks phase with asymmetry 0.8.
 * - Ozone (`OZONE`): absorption only, a tent 30 km wide centred at 25 km.
 * - `toSphere(r, mu, R)`: the distance along a ray from radius r with cosine
 *   mu to the sphere of radius R (−1 if none ahead). R² − r² is written as
 *   (R − r)(R + r): float32 holds a 4·10¹³ m² square only to the nearest
 *   4·10⁶ m², and the direct difference of two of them loses the few
 *   kilometres that matter — a speckled horizon.
 * - `transmittanceUv` / `transmittanceRMu`: Bruneton's parametrisation of
 *   the transmittance table, and its inverse.
 */
const COMMON = /* glsl */ `
  #ifndef PI
  #define PI 3.141592653589793
  #endif
  const float RG = ${R_EARTH.toFixed(1)};
  const float RT = ${(R_EARTH + ATMOSPHERE_HEIGHT).toFixed(1)};
  const vec3 RAY_S = vec3(5.802e-6, 13.558e-6, 33.1e-6);
  const float RAY_H = 8000.0;
  const float MIE_S = 3.996e-6;
  const float MIE_E = 4.40e-6;
  const float MIE_H = 1200.0;
  const float MIE_G = 0.8;
  const vec3 OZONE = vec3(0.650e-6, 1.881e-6, 0.085e-6);

  struct Medium { vec3 scatR; float scatM; vec3 ext; };
  Medium medium(float h) {
    float dr = exp(-h / RAY_H), dm = exp(-h / MIE_H);
    float oz = max(0.0, 1.0 - abs(h - 25000.0) / 15000.0);
    Medium m;
    m.scatR = RAY_S * dr;
    m.scatM = MIE_S * dm;
    m.ext = RAY_S * dr + vec3(MIE_E * dm) + OZONE * oz;
    return m;
  }

  float toSphere(float r, float mu, float R) {
    float disc = r * r * mu * mu + (R - r) * (R + r);
    if (disc < 0.0) return -1.0;
    float s = sqrt(disc);
    float d0 = -r * mu - s, d1 = -r * mu + s;
    return d0 > 0.0 ? d0 : (d1 > 0.0 ? d1 : -1.0);
  }
  bool hitsGround(float r, float mu) {
    return mu < 0.0 && r * r * mu * mu + (RG - r) * (RG + r) >= 0.0;
  }

  vec2 transmittanceUv(float r, float mu) {
    float H = sqrt((RT - RG) * (RT + RG));
    float rho = sqrt(max(0.0, (r - RG) * (r + RG)));
    float d = max(0.0, -r * mu + sqrt(max(0.0, r * r * mu * mu + (RT - r) * (RT + r))));
    float dmin = RT - r, dmax = rho + H;
    return vec2((d - dmin) / max(dmax - dmin, 1.0), rho / H);
  }
  void transmittanceRMu(vec2 uv, out float r, out float mu) {
    float H = sqrt((RT - RG) * (RT + RG));
    float rho = H * uv.y;
    r = sqrt(rho * rho + RG * RG);
    float dmin = RT - r, dmax = rho + H;
    float d = dmin + uv.x * (dmax - dmin);
    mu = d == 0.0 ? 1.0 : clamp((H * H - rho * rho - d * d) / (2.0 * r * d), -1.0, 1.0);
  }

  float rayleighPhase(float c) { return 3.0 / (16.0 * PI) * (1.0 + c * c); }
  float miePhase(float c) {
    float g = MIE_G, g2 = g * g;
    return 3.0 / (8.0 * PI) * ((1.0 - g2) * (1.0 + c * c)) / ((2.0 + g2) * pow(1.0 + g2 - 2.0 * g * c, 1.5));
  }
`;

const FULLSCREEN_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = position.xy * 0.5 + 0.5;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const TRANSMITTANCE_FRAG = /* glsl */ `
  ${COMMON}
  varying vec2 vUv;
  void main() {
    float r, mu;
    transmittanceRMu(vUv, r, mu);
    float d = toSphere(r, mu, RT);
    vec3 depth = vec3(0.0);
    const int N = 40;
    for (int i = 0; i < N; i++) {
      float t = (float(i) + 0.5) / float(N) * max(d, 0.0);
      float h = sqrt(r * r + t * t + 2.0 * r * mu * t) - RG;
      depth += medium(h).ext;
    }
    vec3 tr = exp(-depth * max(d, 0.0) / float(N));
    gl_FragColor = vec4(any(isnan(tr)) ? vec3(0.0) : tr, 1.0);
  }
`;

/** The transmittance from radius r and cosine mu to space (the ground blocks it). */
const SAMPLE_TRANSMITTANCE = /* glsl */ `
  uniform sampler2D uTransmittance;
  vec3 transmittance(float r, float mu) {
    if (hitsGround(r, mu)) return vec3(0.0);
    return texture2D(uTransmittance, transmittanceUv(r, mu)).rgb;
  }
`;

/**
 * Hillaire 2020, §5.5: the second-order luminance L2 and the transfer f_ms,
 * integrated over the sphere of directions; every higher order sums as a
 * geometric series, Psi = L2 / (1 − f_ms). The directions are uniform over
 * the sphere — equal steps in cos φ, and azimuth over half a turn, the other
 * half mirroring it about the plane of the sun — so each direction weighs
 * 1/N of the average. Where a direction ends on the ground, the light the
 * ground bounces back (albedo 0.3) is added.
 */
const MULTISCATTER_FRAG = /* glsl */ `
  ${COMMON}
  ${SAMPLE_TRANSMITTANCE}
  varying vec2 vUv;
  void main() {
    float muS = vUv.x * 2.0 - 1.0;
    float r = RG + vUv.y * (RT - RG);
    vec3 sunDir = vec3(sqrt(max(0.0, 1.0 - muS * muS)), 0.0, muS);
    vec3 L2 = vec3(0.0), fms = vec3(0.0);
    const int SQ = 8, N = 20;
    for (int a = 0; a < SQ; a++) for (int b = 0; b < SQ; b++) {
      float th = PI * (float(a) + 0.5) / float(SQ);
      float ph = acos(1.0 - 2.0 * (float(b) + 0.5) / float(SQ));
      vec3 dir = vec3(cos(th) * sin(ph), sin(th) * sin(ph), cos(ph));
      float mu = dir.z;
      float dG = hitsGround(r, mu) ? toSphere(r, mu, RG) : -1.0;
      float dT = toSphere(r, mu, RT);
      float d = dG > 0.0 ? dG : dT;
      if (d <= 0.0) continue;
      vec3 T = vec3(1.0), Lp = vec3(0.0), fp = vec3(0.0);
      float dt = d / float(N);
      for (int i = 0; i < N; i++) {
        float t = (float(i) + 0.5) * dt;
        vec3 p = vec3(0.0, 0.0, r) + dir * t;
        float rp = length(p);
        Medium m = medium(rp - RG);
        vec3 S = m.scatR + vec3(m.scatM);
        vec3 Ts = transmittance(rp, dot(p, sunDir) / rp);
        vec3 stepT = exp(-m.ext * dt);
        vec3 integ = (vec3(1.0) - stepT) / max(m.ext, vec3(1e-12));
        Lp += T * integ * S * Ts * (1.0 / (4.0 * PI));
        fp += T * integ * S;
        T *= stepT;
      }
      if (dG > 0.0) {
        vec3 p = vec3(0.0, 0.0, r) + dir * dG;
        float c = max(0.0, dot(normalize(p), sunDir));
        Lp += T * transmittance(RG + 1.0, c) * c * 0.3 / PI;
      }
      L2 += Lp; fms += fp;
    }
    L2 /= float(SQ * SQ);
    fms /= float(SQ * SQ);
    vec3 psi = L2 / max(vec3(1.0) - fms, vec3(1e-3));
    gl_FragColor = vec4(any(isnan(psi)) || any(isinf(psi)) ? vec3(0.0) : psi, 1.0);
  }
`;

/**
 * The per-frame pass, in order.
 *
 * `sunlight(r, muS)`: sunlight reaching radius r with the sun at cosine muS —
 * the transmittance, faded out over a quarter of a degree about the
 * geometric horizon rather than cut at it: a hard cut per sample speckles a
 * twilight limb.
 *
 * The view ray is unprojected on the near plane: at the far one (5·10⁹ m) w
 * is ~10⁻¹⁰ and the division loses it.
 *
 * The ray's stretch of atmosphere, [tStart, tEnd], is solved once from the
 * camera, about the ray's perigee: tc = −o·dir is the distance to it, rp2 its
 * squared radius, and RT² − rp2 (RG² − rp2) the squared half-chord of the top
 * of the atmosphere (of the ground). The squares there are rounded to
 * ~4·10⁶ m² as toSphere's are, but here that is no worse than the rounding
 * of the perigee point itself. Replayed in float32 against float64 on the
 * same inputs (as tests/sky-interval.test.ts does), on rays sweeping the
 * limb from 13 camera placements: no ray whose perigee is below 60 km comes
 * out empty from 400 km, 2 000 km, 36 000 km or 400 000 km, and only a ray
 * passing within ~10 m of the ground may be cut at it. Re-projecting the
 * entry point emptied or cut short a share of them that depends on the
 * direction of view: between 0.2 % and 38 % from 400 km, 13 % and 53 % from
 * 36 000 km, 30 % and 93 % from 400 000 km. The ends of the interval are
 * within ~7 m from 400 km and 2 000 km, ~20 m from 36 000 km and ~200 m
 * from 400 000 km, at the top of the atmosphere where the air no longer
 * counts. The perigee is not clamped to the camera:
 * from inside the atmosphere a ray looking up has its perigee behind the
 * camera, and the half-chord must be the one through that point (clamped,
 * it emptied every ray more than ~10° above the horizon from the pad).
 *
 * Where the samples go: seen from space (r > RT) they crowd at the ray's
 * lowest point, tLow, which is the perigee of a ray through the limb and the
 * ground at the end of a ray that hits it; from inside the atmosphere they
 * crowd towards the camera, where the air is densest on a ground view, as
 * u² does. Either way the fraction u of the 24 steps maps to the offset from
 * tLow of (u − f)|u − f| · len / f before it and · len / (1 − f) after it,
 * f being the share of the interval before tLow (0 from inside the
 * atmosphere) — so the samples split between the two sides as the length
 * does, crowding quadratically towards tLow on both. Against a float64 march
 * of 20 000 even steps with the same per-step integration (errors relative
 * to the ray's brightest channel, or to 0.2 % of the illuminance where the
 * ray is darker; 28 suns from 60° above to 6° below the lowest point's
 * horizon), the RMS errors in single-scattered radiance and optical depth
 * are 0.6 % and 0.7 % on limb rays from orbit (perigee 0–60 km) and 0.2 %
 * and 0.5 % on rays from orbit that hit the ground (crowding at the start
 * of the interval instead, as from the ground: 1.8 % and 9.6 %); from the
 * pad, 10, 30 and 80 km they are 0.2–0.6 % and 0.3–0.4 %.
 *
 * Each sample is placed as pLow + dir · offset, its offset measured from
 * tLow rather than from the camera, so the step lengths come out of small
 * numbers. The altitudes cannot be better than float32 makes the product of
 * the camera's position with the ray's direction: within ~1 m of float64
 * on the visible limb (RMS 0.3 m) from 400 km, ~2 m (0.5 m) from 36 000 km
 * and ~16 m (5 m) from 400 000 km, where the whole atmosphere is a third of
 * a pixel across at a 45° field of view. What the anchor buys is that the
 * error is shared by all the samples of a ray (neighbours differ by under
 * 2 m at 400 000 km, against up to ~28 m when each sample is placed from
 * the camera).
 *
 * The sun's disc, 0.266° in radius (959.6″ at 1 au), its edge smoothed over
 * ~0.05° centred on that radius, reddened by the air in front of it: the
 * transmittance table from inside the atmosphere, and from space the
 * transmittance T just accumulated along the view ray, which is 1 when the
 * ray misses the air. It is darkened towards its limb as the Eddington
 * approximation of a grey atmosphere has it, I(μ) ∝ μ + 2/3, i.e.
 * I(μ)/I(1) = 0.4 + 0.6 μ, where μ is the cosine of the angle from the
 * normal of the sun's surface: μ = √(1 − (θ/θ☉)²) for a point θ from the
 * centre of a disc θ☉ in radius, and since 1 − cos θ ≈ θ²/2,
 * (cos θ − cos θ☉) / (1 − cos θ☉) is 1 − (θ/θ☉)² to a part in 10⁵. The Sun at
 * 550 nm is 0.30 + 0.93 μ − 0.23 μ² (Cox (ed.), Allen's Astrophysical
 * Quantities, 2000): 0.30 at the limb and 0.805 on average, against this
 * law's 0.4 and 0.8. The centre is 50 × the illuminance, so that the disc's
 * mean, 0.8 of its centre, is the 40 × of a uniform disc. Past the tone
 * mapping the darkening shows only where the air has dimmed the disc to a
 * few per cent, low in a red sky or through the limb from orbit.
 *
 * Round it a glow, pow(c, 18000) · 0.35 ≈ 0.35 e^(−9000 θ²) of the
 * illuminance: 1/e at 0.6° from the centre, cut where it falls below 0.001,
 * 1.5° out. On the ground it stands in for the solar aureole, the narrow
 * forward peak of scattering by aerosol that one Cornette–Shanks lobe with
 * g = 0.8 is far too broad to give; in space it is the glare of the eye or
 * the lens. With the illuminance scene.ts passes (SKY_ILLUMINANCE, 8) it
 * peaks at 2.8, over the bloom's threshold of 1.0 only within 0.6° of the
 * centre, and adds a few per cent to the light the disc gives the bloom.
 * The exposure is set from the sun's elevation (sky.ts), not metered from
 * the picture, so neither feeds back into it; the disc peaks at 400, far
 * under the 6·10⁴ clamp that keeps a half-float target finite.
 *
 * One bad sample must not become a black frame: the bloom's blur would
 * spread it everywhere.
 */
const SKY_FRAG = /* glsl */ `
  #include <common>
  ${COMMON}
  ${SAMPLE_TRANSMITTANCE}
  uniform sampler2D uMultiScatter;
  uniform mat4 uInvProj;
  uniform mat4 uCamToWorld;
  uniform vec3 uCamEci;
  uniform vec3 uSunDir;
  uniform float uSunIlluminance;
  varying vec2 vUv;

  vec3 sunlight(float r, float muS) {
    float muH = -sqrt(max(0.0, (r - RG) * (r + RG)) / (r * r));
    float vis = smoothstep(muH - 0.004, muH + 0.004, muS);
    return vis * texture2D(uTransmittance, transmittanceUv(r, max(muS, muH + 0.004))).rgb;
  }

  vec3 multiScatter(float r, float muS) {
    return texture2D(uMultiScatter, vec2(muS * 0.5 + 0.5, (r - RG) / (RT - RG))).rgb;
  }

  void main() {
    vec4 v = uInvProj * vec4(vUv * 2.0 - 1.0, -1.0, 1.0);
    vec3 dir = normalize((uCamToWorld * vec4(v.xyz / v.w, 0.0)).xyz);
    vec3 o = uCamEci;
    float r = max(length(o), RG + 1.0);
    float tc = -dot(o, dir);
    float mu = -tc / r;
    float c = dot(dir, uSunDir);
    vec3 L = vec3(0.0);
    vec3 T = vec3(1.0);
    vec3 pc = o + dir * tc;
    float rp2 = dot(pc, pc);
    float h = sqrt(max(0.0, RT * RT - rp2));
    float tStart = max(0.0, tc - h), tEnd = tc + h;
    if (tc > 0.0 && rp2 < RG * RG) tEnd = tc - sqrt(RG * RG - rp2);
    if (tEnd > tStart) {
      float pr = rayleighPhase(c), pm = miePhase(c);
      const int N = 24;
      float len = tEnd - tStart;
      float tLow = r > RT ? clamp(tc, tStart, tEnd) : tStart;
      vec3 pLow = o + dir * tLow;
      float f = (tLow - tStart) / len;
      float kA = len / max(f, 1e-6), kB = len / max(1.0 - f, 1e-6);
      float sa = tStart - tLow;
      for (int i = 0; i < N; i++) {
        float x = float(i + 1) / float(N) - f;
        float sb = x * abs(x) * (x < 0.0 ? kA : kB);
        float dt = sb - sa;
        vec3 p = pLow + dir * (0.5 * (sa + sb));
        sa = sb;
        float rp = length(p);
        float muS = dot(p, uSunDir) / rp;
        Medium m = medium(rp - RG);
        vec3 Ts = sunlight(rp, muS);
        vec3 single = m.scatR * pr + vec3(m.scatM * pm);
        vec3 S = single * Ts + (m.scatR + vec3(m.scatM)) * multiScatter(rp, muS);
        vec3 stepT = exp(-m.ext * dt);
        L += T * S * (vec3(1.0) - stepT) / max(m.ext, vec3(1e-12));
        T *= stepT;
      }
    }
    L *= uSunIlluminance;
    {
      const float SUN_COS = 0.9999892;
      float disc = smoothstep(SUN_COS - 2e-6, SUN_COS + 2e-6, c);
      float glow = pow(max(c, 0.0), 18000.0) * 0.35;
      if ((disc > 0.0 || glow > 0.001) && !hitsGround(r, mu)) {
        float limb = 0.4 + 0.6 * sqrt(clamp((c - SUN_COS) / (1.0 - SUN_COS), 0.0, 1.0));
        L += (disc * 50.0 * limb + glow) * uSunIlluminance * (r > RT ? T : transmittance(r, mu));
      }
    }
    if (any(isnan(L)) || any(isinf(L))) L = vec3(0.0);
    gl_FragColor = vec4(min(L, vec3(6.0e4)), 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function target(w: number, h: number, type: THREE.TextureDataType): THREE.WebGLRenderTarget {
  return new THREE.WebGLRenderTarget(w, h, {
    type, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
    wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping, depthBuffer: false, stencilBuffer: false,
  });
}

export class PhysicalSky {
  readonly mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;
  private transmittanceRT: THREE.WebGLRenderTarget;
  private multiRT: THREE.WebGLRenderTarget;
  private ready = false;

  constructor(private readonly renderer: THREE.WebGLRenderer, floatType: THREE.TextureDataType = THREE.HalfFloatType) {
    this.transmittanceRT = target(256, 64, floatType);
    this.multiRT = target(32, 32, floatType);
    const tri = new THREE.BufferGeometry();
    tri.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    this.material = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERT, fragmentShader: SKY_FRAG, depthTest: false, depthWrite: false,
      uniforms: {
        uTransmittance: { value: this.transmittanceRT.texture }, uMultiScatter: { value: this.multiRT.texture },
        uInvProj: { value: new THREE.Matrix4() }, uCamToWorld: { value: new THREE.Matrix4() },
        uCamEci: { value: new THREE.Vector3() }, uSunDir: { value: new THREE.Vector3(0, 0, 1) }, uSunIlluminance: { value: 20 },
      },
    });
    this.mesh = new THREE.Mesh(tri, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1000;
  }

  /** Fill the two tables (once). */
  private precompute(): void {
    const scene = new THREE.Scene();
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const tri = this.mesh.geometry;
    const pass = (frag: string, rt: THREE.WebGLRenderTarget, uniforms: Record<string, THREE.IUniform>) => {
      const m = new THREE.Mesh(tri, new THREE.ShaderMaterial({ vertexShader: FULLSCREEN_VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false }));
      m.frustumCulled = false;
      scene.clear();
      scene.add(m);
      const prev = this.renderer.getRenderTarget();
      this.renderer.setRenderTarget(rt);
      this.renderer.render(scene, cam);
      this.renderer.setRenderTarget(prev);
      (m.material as THREE.Material).dispose();
    };
    pass(TRANSMITTANCE_FRAG, this.transmittanceRT, {});
    pass(MULTISCATTER_FRAG, this.multiRT, { uTransmittance: { value: this.transmittanceRT.texture } });
    this.ready = true;
  }

  /** FX-8: fill the tables again (a lost context took them). */
  invalidate(): void {
    this.ready = false;
  }

  /**
   * Point the pass at this frame: the camera (its matrices, and its position
   * in ECI metres) and the sun.
   */
  update(camera: THREE.PerspectiveCamera, camEci: THREE.Vector3, sunDir: THREE.Vector3, illuminance: number): void {
    if (!this.ready) this.precompute();
    const u = this.material.uniforms;
    (u.uInvProj.value as THREE.Matrix4).copy(camera.projectionMatrixInverse);
    (u.uCamToWorld.value as THREE.Matrix4).copy(camera.matrixWorld);
    (u.uCamEci.value as THREE.Vector3).copy(camEci);
    (u.uSunDir.value as THREE.Vector3).copy(sunDir);
    u.uSunIlluminance.value = illuminance;
  }

  dispose(): void {
    this.transmittanceRT.dispose();
    this.multiRT.dispose();
    this.material.dispose();
    this.mesh.geometry.dispose();
  }
}
