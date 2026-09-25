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
 * It costs a fragment shader of ~ 24 samples per pixel. A slow GPU falls back
 * to the colour-gradient sky of `sky.ts` (the same trial as the glow, F07:
 * src/render/glow-governor.ts), and so does a GPU that cannot render to float
 * textures.
 */
import * as THREE from 'three';
import { R_EARTH } from '../physics/constants';

/** Top of the modelled atmosphere, m above the equatorial radius. */
export const ATMOSPHERE_HEIGHT = 100e3;

/** The atmosphere's constants as GLSL, shared by the three passes (lengths in metres). */
const COMMON = /* glsl */ `
  #ifndef PI
  #define PI 3.141592653589793
  #endif
  const float RG = ${R_EARTH.toFixed(1)};
  const float RT = ${(R_EARTH + ATMOSPHERE_HEIGHT).toFixed(1)};
  // Rayleigh: scattering at 680/550/440 nm, scale height 8 km
  const vec3 RAY_S = vec3(5.802e-6, 13.558e-6, 33.1e-6);
  const float RAY_H = 8000.0;
  // Mie: continental aerosol, scale height 1.2 km, asymmetry 0.8
  const float MIE_S = 3.996e-6;
  const float MIE_E = 4.40e-6;
  const float MIE_H = 1200.0;
  const float MIE_G = 0.8;
  // ozone: absorption only, a tent 30 km wide centred at 25 km
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

  // distance along a ray from radius r with cosine mu to the sphere of radius R (-1 if none ahead)
  // R² − r² as (R − r)(R + r): the direct difference of two 4·10¹³ m² squares
  // loses the few kilometres that matter in float32 — a speckled horizon
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

  // Bruneton's parametrisation of the transmittance table
  vec2 transmittanceUv(float r, float mu) {
    float H = sqrt(RT * RT - RG * RG);
    float rho = sqrt(max(0.0, (r - RG) * (r + RG)));
    float d = max(0.0, -r * mu + sqrt(max(0.0, r * r * mu * mu + (RT - r) * (RT + r))));
    float dmin = RT - r, dmax = rho + H;
    return vec2((d - dmin) / max(dmax - dmin, 1.0), rho / H);
  }
  void transmittanceRMu(vec2 uv, out float r, out float mu) {
    float H = sqrt(RT * RT - RG * RG);
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

const MULTISCATTER_FRAG = /* glsl */ `
  ${COMMON}
  ${SAMPLE_TRANSMITTANCE}
  varying vec2 vUv;
  // Hillaire 2020, §5.5: second-order luminance L2 and the transfer f_ms,
  // integrated over the sphere of directions; every higher order sums as a
  // geometric series, Psi = L2 / (1 - f_ms).
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
      // light bounced off the ground (albedo 0.3), where the ray ends on it
      if (dG > 0.0) {
        vec3 p = vec3(0.0, 0.0, r) + dir * dG;
        float c = max(0.0, dot(normalize(p), sunDir));
        Lp += T * transmittance(RG + 1.0, c) * c * 0.3 / PI;
      }
      L2 += Lp; fms += fp;
    }
    // uniform over the sphere: each direction weighs 1/N of the average
    L2 /= float(SQ * SQ);
    fms /= float(SQ * SQ);
    vec3 psi = L2 / max(vec3(1.0) - fms, vec3(1e-3));
    gl_FragColor = vec4(any(isnan(psi)) || any(isinf(psi)) ? vec3(0.0) : psi, 1.0);
  }
`;

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

  /**
   * Sunlight reaching radius r with the sun at cosine muS: the transmittance,
   * faded out over a quarter of a degree about the geometric horizon rather
   * than cut at it — a hard cut per sample speckles a twilight limb.
   */
  vec3 sunlight(float r, float muS) {
    float muH = -sqrt(max(0.0, 1.0 - (RG / r) * (RG / r)));
    float vis = smoothstep(muH - 0.004, muH + 0.004, muS);
    return vis * texture2D(uTransmittance, transmittanceUv(r, max(muS, muH + 0.004))).rgb;
  }

  vec3 multiScatter(float r, float muS) {
    return texture2D(uMultiScatter, vec2(muS * 0.5 + 0.5, (r - RG) / (RT - RG))).rgb;
  }

  void main() {
    // unproject on the near plane: at the far one (5e9 m) w is ~1e-10 and the division loses it
    vec4 v = uInvProj * vec4(vUv * 2.0 - 1.0, -1.0, 1.0);
    vec3 dir = normalize((uCamToWorld * vec4(v.xyz / v.w, 0.0)).xyz);
    vec3 o = uCamEci;
    float r = max(length(o), RG + 1.0);
    float mu = dot(o, dir) / r;
    vec3 L = vec3(0.0);
    vec3 T = vec3(1.0);
    // the part of the ray inside the atmosphere
    float tStart = 0.0, tEnd;
    if (r > RT) {
      float dIn = toSphere(r, mu, RT);
      if (dIn < 0.0) { tEnd = -1.0; }
      else {
        tStart = dIn;
        vec3 p = o + dir * dIn;
        float r2 = length(p), mu2 = dot(p, dir) / r2;
        float dG = hitsGround(r2, mu2) ? toSphere(r2, mu2, RG) : -1.0;
        tEnd = dIn + (dG > 0.0 ? dG : max(toSphere(r2, max(mu2, -1.0), RT), 0.0));
      }
    } else {
      float dG = hitsGround(r, mu) ? toSphere(r, mu, RG) : -1.0;
      tEnd = dG > 0.0 ? dG : toSphere(r, mu, RT);
    }
    if (tEnd > tStart) {

      float c = dot(dir, uSunDir);
      float pr = rayleighPhase(c), pm = miePhase(c);
      const int N = 24;
      float len = tEnd - tStart;
      for (int i = 0; i < N; i++) {
        // samples crowd towards the camera, where the air is densest on a ground view
        float a = float(i) / float(N), b = float(i + 1) / float(N);
        float ta = tStart + len * a * a, tb = tStart + len * b * b;
        float dt = tb - ta;
        vec3 p = o + dir * (0.5 * (ta + tb));
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
    // the sun's disc (0.27° radius), reddened by the air in front of it
    {
      float c = dot(dir, uSunDir);
      float disc = smoothstep(0.999985, 0.9999895, c);
      if (disc > 0.0 && !hitsGround(r, mu)) L += disc * uSunIlluminance * 40.0 * (r > RT ? vec3(1.0) : transmittance(r, mu));
    }
    // one bad sample must not become a black frame: the bloom's blur would spread it everywhere
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
