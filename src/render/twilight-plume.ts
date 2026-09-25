/**
 * The "twilight jellyfish" (roadmap V02): at dusk or dawn a rocket climbing
 * out of the Earth's shadow into sunlight lights up its own exhaust. Above
 * ~ 50 km the plume, with almost no air to hold it in, balloons out over tens
 * of kilometres, and seen from a darkened ground it glows as a pale dome with
 * a bright rim, trailing tendrils — the shape that gives it its name. It is
 * sunlight scattered by the exhaust's ice and particulates, not the flame.
 *
 * Drawn as one billboard behind the vehicle, facing the camera and turned so
 * the dome opens along the flight path, sized by the altitude (the plume's
 * expansion), lit by `sunlitAt` at the vehicle, and additive, so against a
 * daylit sky it simply vanishes, as the real one does.
 */
import * as THREE from 'three';
import type { VisualFrame } from '../physics/frame';
import type { Vec3 } from '../physics/vec3';
import { R_EARTH } from '../physics/constants';
import { sunlitAt } from './sky';
import { smoothstep } from './noise';

const VERT = /* glsl */ `
  varying vec2 vUv;
  #include <common>
  #include <logdepthbuf_pars_vertex>
  void main() {
    vUv = uv * 2.0 - 1.0;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    #include <logdepthbuf_vertex>
  }
`;

const FRAG = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_fragment>
  uniform float uIntensity;
  uniform float uTime;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
  void main() {
    #include <logdepthbuf_fragment>
    // +y runs back down the flight path, the vehicle at the top centre
    vec2 p = vec2(vUv.x, 1.0 - (vUv.y * 0.5 + 0.5) * 2.0);
    float r = length(p - vec2(0.0, -0.05));
    float ang = atan(p.x, p.y);                        // 0 straight back
    float fan = smoothstep(1.35, 0.6, abs(ang));        // the dome opens rearwards
    float n = noise(p * 6.0 + uTime * 0.02) * 0.6 + noise(p * 17.0) * 0.4;
    float shell = smoothstep(0.62, 0.88, r) * smoothstep(1.0, 0.9, r); // the bright rim of the expanding shock
    float body = smoothstep(1.0, 0.2, r) * 0.12;                       // thin, translucent inside
    // streamers trailing back from the rim
    float streak = noise(vec2(ang * 9.0, r * 1.5 - uTime * 0.01));
    float tendrils = smoothstep(0.6, 0.95, streak) * smoothstep(0.35, 0.9, r) * smoothstep(1.0, 0.8, r) * 0.6;
    float a = (shell * (0.6 + 0.8 * n) + body + tendrils) * fan * uIntensity;
    vec3 col = mix(vec3(0.62, 0.78, 1.0), vec3(1.0, 0.86, 0.72), smoothstep(0.35, 0.0, r));
    gl_FragColor = vec4(col * a, 1.0);
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

export class TwilightPlume {
  readonly mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;
  private readonly tmp = new THREE.Vector3();
  private readonly axis = new THREE.Vector3();
  private readonly q = new THREE.Quaternion();

  constructor() {
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, uniforms: { uIntensity: { value: 0 }, uTime: { value: 0 } },
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    this.mesh.renderOrder = 5;
  }

  /**
   * @param vehicle the vehicle in scene coordinates
   * @param dir its direction of flight (unit, ECI = scene axes)
   */
  update(frame: VisualFrame, vehicle: THREE.Vector3, dir: Vec3, sunDir: Vec3, cameraSunElev: number, camera: THREE.Camera): void {
    const radius = jellyfishRadius(frame.altitude);
    // a sight for a distant observer: a camera inside the cloud sees only a haze, so it fades out
    const distance = camera.position.distanceTo(vehicle);
    const intensity = jellyfishIntensity(frame, sunDir, cameraSunElev) * smoothstep(radius * 0.8, radius * 2.5, distance);
    this.mesh.visible = intensity > 0.01 && radius > 100;
    if (!this.mesh.visible) return;
    this.material.uniforms.uIntensity.value = intensity * 1.6;
    this.material.uniforms.uTime.value = frame.t;
    // face the camera, the rim opening back along the flight path
    this.mesh.quaternion.copy(camera.quaternion);
    this.axis.set(-dir.x, -dir.y, -dir.z).applyQuaternion(this.q.copy(camera.quaternion).invert());
    const roll = Math.atan2(this.axis.x, -this.axis.y);
    this.mesh.rotateZ(roll);
    this.mesh.scale.set(radius, radius, 1);
    // centred a little behind the vehicle, so the vehicle sits at the dome's crown
    this.tmp.set(-dir.x, -dir.y, -dir.z).multiplyScalar(radius * 0.55);
    this.mesh.position.copy(vehicle).add(this.tmp);
  }

  dispose(): void {
    this.material.dispose();
    this.mesh.geometry.dispose();
  }
}
