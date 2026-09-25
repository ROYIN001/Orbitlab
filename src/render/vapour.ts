/**
 * The vapour cone (roadmap V03): the condensation collar a rocket wears as it
 * goes through the speed of sound.
 *
 * Near Mach 1 the flow accelerating round the fairing's shoulder expands and
 * cools below its dew point, and the water in it condenses into a sheet that
 * starts at the shoulder and trails aft, opening like a skirt, flickering as
 * the shock moves. It needs moist air: it is thick at Kourou, Wenchang or the
 * Cape, faint over the Kazakh steppe, and gone above about 13 km, where there
 * is no water left to condense.
 *
 * Drawn only; it changes nothing in the flight. When: Mach 0.85–1.15, fading
 * in and out at the ends; how strong: the site's humidity (SITE_HUMIDITY) and
 * how thick the air still is.
 */
import * as THREE from 'three';
import { smoothstep } from './noise';

/** How strong the cone is, 0–1, at this Mach number, altitude (m) and site humidity (0–1). */
export function vapourStrength(mach: number, altitude: number, humidity: number): number {
  const band = smoothstep(0.84, 0.95, mach) * (1 - smoothstep(1.06, 1.18, mach));
  const water = 1 - smoothstep(9e3, 13.5e3, altitude);
  return band * water * (0.2 + 0.8 * Math.min(1, Math.max(0, humidity)));
}

export class VapourCone {
  readonly group = new THREE.Group();
  private readonly mat: THREE.ShaderMaterial;
  private readonly geo: THREE.BufferGeometry;

  /**
   * @param radius the body's radius at the shoulder, m
   * @param length how far aft the sheet trails, m
   */
  constructor(radius: number, length: number) {
    // a skirt from the shoulder aft (−y), opening as it goes
    const pts: THREE.Vector2[] = [];
    const n = 12;
    for (let i = 0; i <= n; i++) {
      const k = i / n;
      pts.push(new THREE.Vector2(radius * (1.02 + 0.55 * Math.pow(k, 0.7)), -length * k));
    }
    // a lathe facing outward needs its profile rising in y
    pts.reverse();
    this.geo = new THREE.LatheGeometry(pts, 48);
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: { uStrength: { value: 0 }, uT: { value: 0 }, uLight: { value: 1 } },
    });
    const mesh = new THREE.Mesh(this.geo, this.mat);
    mesh.renderOrder = 5;
    mesh.frustumCulled = false;
    this.group.add(mesh);
    this.group.visible = false;
  }

  /**
   * @param strength 0–1 (`vapourStrength`)
   * @param t mission time, s: drives the flicker
   * @param night 0 in daylight, 1 at night
   */
  update(strength: number, t: number, night: number): void {
    this.group.visible = strength > 0.01;
    if (!this.group.visible) return;
    this.mat.uniforms.uStrength.value = strength;
    this.mat.uniforms.uT.value = t;
    this.mat.uniforms.uLight.value = 1 - 0.8 * night;
  }

  dispose(): void {
    this.geo.dispose();
    this.mat.dispose();
  }
}

const VERT = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  varying vec2 vUv;
  varying float vRim;
  void main() {
    // the lathe's v runs from the trailing edge (0) to the shoulder (1)
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vec3 nrm = normalize(normalMatrix * normal);
    // a sheet is seen edge-on at its silhouette: thicker there
    vRim = 1.0 - abs(dot(nrm, normalize(-mv.xyz)));
    gl_Position = projectionMatrix * mv;
    #include <logdepthbuf_vertex>
  }
`;

const FRAG = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_fragment>
  uniform float uStrength;
  uniform float uT;
  uniform float uLight;
  varying vec2 vUv;
  varying float vRim;
  float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(h(i), h(i + vec2(1, 0)), u.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), u.x), u.y);
  }
  void main() {
    #include <logdepthbuf_fragment>
    float along = vUv.y;                      // 1 at the shoulder, 0 at the trailing edge
    // dense at the shoulder, ragged and thinning aft; the shock flickers
    float streaks = noise(vec2(vUv.x * 42.0, along * 3.0 - uT * 6.0)) * 0.6 + noise(vec2(vUv.x * 11.0 + uT * 0.7, along * 7.0)) * 0.4;
    float body = smoothstep(0.0, 0.55, along) * (1.0 - smoothstep(0.93, 1.0, along));
    float ragged = smoothstep(0.25, 0.75, streaks + along * 0.35);
    float flicker = 0.8 + 0.2 * sin(uT * 37.0 + vUv.x * 6.2831);
    float a = uStrength * body * ragged * flicker * (0.35 + 0.65 * vRim) * 0.85;
    if (a < 0.004) discard;
    gl_FragColor = vec4(vec3(0.97, 0.98, 1.0) * uLight, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
