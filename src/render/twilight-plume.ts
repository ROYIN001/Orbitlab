/**
 * The "twilight jellyfish" (roadmap V02): at dusk or dawn a rocket climbing
 * out of the Earth's shadow into sunlight lights up its own exhaust. Above
 * ~ 50 km the plume, with almost no air to hold it in, balloons out over tens
 * of kilometres, and seen from a darkened ground it glows as a pale dome with
 * a bright rim, trailing tendrils — the shape that gives it its name. It is
 * sunlight scattered by the exhaust's ice and particulates, not the flame.
 *
 * Upgraded to a 3D volumetric raymarched axisymmetric plume in vehicle-locked
 * plume coordinates: preserves logarithmic depth buffering while eliminating
 * 2D billboard roll-flips, camera-rotation swimming, and close-camera culling,
 * and adds physical Cornette-Shanks Mie + Rayleigh phase scattering and
 * solar-terminator spectral gradients across the 3D volume.
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
  uniform float uExpansion;
  uniform vec3 uCamLocal;
  uniform vec3 uQuadCenterLocal;
  uniform vec3 uQuadRightLocal;
  uniform vec3 uQuadUpLocal;
  uniform vec3 uSunLocal;
  uniform vec3 uUpLocal;

  varying vec2 vUv;

  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  float hash13(vec3 p3) {
    p3 = fract(p3 * 0.1031);
    p3 += dot(p3, p3.zyx + 31.32);
    return fract((p3.x + p3.y) * p3.z);
  }

  float noise3(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(
        mix(hash13(i + vec3(0, 0, 0)), hash13(i + vec3(1, 0, 0)), f.x),
        mix(hash13(i + vec3(0, 1, 0)), hash13(i + vec3(1, 1, 0)), f.x),
        f.y
      ),
      mix(
        mix(hash13(i + vec3(0, 0, 1)), hash13(i + vec3(1, 0, 1)), f.x),
        mix(hash13(i + vec3(0, 1, 1)), hash13(i + vec3(1, 1, 1)), f.x),
        f.y
      ),
      f.z
    );
  }

  // Cornette-Shanks Mie + Rayleigh combined phase function for ice/soot aerosols
  float plumePhase(float cosTheta) {
    float rayleigh = 0.75 * (1.0 + cosTheta * cosTheta);
    float g = 0.68;
    float g2 = g * g;
    float denom = max(0.001, 1.0 + g2 - 2.0 * g * cosTheta);
    float mie = 1.5 * ((1.0 - g2) / (2.0 + g2)) * (1.0 + cosTheta * cosTheta) / pow(denom, 1.5);
    return mix(rayleigh, mie, 0.55);
  }

  void main() {
    #include <logdepthbuf_fragment>

    // Reconstruct the 3D ray in vehicle-locked Plume Local Coordinates
    // Origin (0,0,0) = nozzle; +Z runs backwards along the exhaust plume
    vec3 hitLocal = uQuadCenterLocal + vUv.x * uQuadRightLocal + vUv.y * uQuadUpLocal;
    vec3 rd = normalize(hitLocal - uCamLocal);
    vec3 ro = uCamLocal;

    // Intersect ray with the 3D plume bounding sphere centered at (0, 0, 0.82) with radius 1.18
    vec3 sphCenter = vec3(0.0, 0.0, 0.82);
    float sphRadius = 1.18;
    vec3 oc = ro - sphCenter;
    float b = dot(oc, rd);
    float c = dot(oc, oc) - sphRadius * sphRadius;
    float disc = b * b - c;
    if (disc <= 0.0) discard;

    float sqrtDisc = sqrt(disc);
    float tNear = max(0.0, -b - sqrtDisc);
    float tFar = -b + sqrtDisc;
    if (tFar <= tNear) discard;

    // 14-step jittered volumetric raymarch through the 3D plume
    const int STEPS = 14;
    float dt = (tFar - tNear) / float(STEPS);
    float jitter = hash12(gl_FragCoord.xy + fract(uTime * 1.37));

    float cosTheta = dot(rd, uSunLocal);
    float phase = plumePhase(cosTheta);

    vec3 accumCol = vec3(0.0);
    float accumAlpha = 0.0;

    for (int i = 0; i < STEPS; i++) {
      float t = tNear + (float(i) + jitter) * dt;
      vec3 p = ro + rd * t;

      // Axial coordinate u in [0, 1] from nozzle (z = 0) to far wake (z = 1.85)
      if (p.z < -0.04 || p.z > 1.88) continue;
      float u = clamp(p.z / 1.80, 0.0, 1.0);

      // Prandtl-Meyer under-expanded parabolic shock envelope
      float envR = 0.02 + uExpansion * (0.96 * pow(u, 0.56) * (1.0 - 0.24 * pow(u, 1.65)));
      float rPerp = length(p.xy);
      float rho = rPerp / max(0.001, envR);
      if (rho > 1.22) continue;

      // 1. Outer contact-surface shock dome (limb-brightened in 3D automatically)
      float rimWidth = mix(0.09, 0.16, u);
      float shell = exp(-pow((rho - 0.90) / rimWidth, 2.0))
                  * smoothstep(0.0, 0.06, u)
                  * smoothstep(1.02, 0.52, u);

      // 2. Inner barrel shock & Mach disk near the nozzle apex
      float coreR = 0.015 + 0.22 * pow(u, 0.72) * (1.0 - 0.55 * u);
      float rhoCore = rPerp / coreR;
      float machRings = 0.72 + 0.28 * cos(u * 52.0 - uTime * 6.0) * exp(-u * 6.5);
      float core = exp(-2.4 * rhoCore * rhoCore)
                 * smoothstep(0.42, 0.0, u)
                 * machRings * 1.45;

      // 3. Diffuse interior vapour cavity
      float cavity = smoothstep(0.92, 0.15, rho)
                   * smoothstep(0.02, 0.14, u)
                   * smoothstep(0.95, 0.30, u) * 0.16;

      // 4. 3D Kelvin-Helmholtz azimuthal tendrils locked to world space
      float phi = atan(p.y, p.x);
      vec3 flowPos = vec3(p.xy * 3.8, p.z * 2.6 - uTime * 0.045);
      float turb = noise3(flowPos) * 0.65 + noise3(flowPos * 2.4 + vec3(13.7, 5.2, -uTime * 0.08)) * 0.35;
      float flutes = smoothstep(0.42, 0.88, noise3(vec3(cos(phi) * 3.2, sin(phi) * 3.2, u * 3.0 - uTime * 0.03)));
      float tendrils = flutes * turb
                     * exp(-pow((rho - 0.76) / 0.26, 2.0))
                     * smoothstep(0.12, 0.45, u)
                     * smoothstep(1.0, 0.68, u) * 0.85;

      float localDensity = (shell * (0.55 + 0.75 * turb) + core + cavity + tendrils) * dt * 1.35;
      if (localDensity <= 0.0005) continue;

      // 3D cross-plume solar self-shadowing & terminator gradient
      float sunSide = dot(vec3(p.xy, (p.z - 0.35) * 0.5), uSunLocal) / max(0.08, envR);
      float shadowTerm = mix(0.42, 1.32, smoothstep(-0.85, 0.85, sunSide));

      // Altitude & axial spectral shift:
      // Warm exhaust core -> crisp ice-blue sunlit dome -> golden twilight rim -> cobalt Chappuis wake
      float altShift = clamp(dot(p, uUpLocal) * 0.6 + 0.5, 0.0, 1.0);
      vec3 iceBlue = mix(vec3(0.48, 0.68, 1.0), vec3(0.76, 0.90, 1.0), altShift);
      vec3 solarGold = vec3(1.0, 0.85, 0.68);
      vec3 coreWarm = vec3(1.0, 0.92, 0.80);

      vec3 sampleCol = mix(iceBlue, solarGold, smoothstep(0.72, 1.02, rho) * 0.55 + max(0.0, cosTheta) * 0.35);
      sampleCol = mix(sampleCol, coreWarm, clamp(core / (localDensity / dt + 0.01), 0.0, 1.0));
      sampleCol *= shadowTerm * (0.62 + 0.38 * phase);

      accumCol += (1.0 - accumAlpha) * sampleCol * localDensity;
      accumAlpha += (1.0 - accumAlpha) * min(1.0, localDensity * 0.65);
    }

    vec3 finalCol = accumCol * uIntensity;
    if (dot(finalCol, finalCol) < 1e-6) discard;

    gl_FragColor = vec4(finalCol, 1.0);
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
export function jellyfishIntensity(
  frame: Pick<VisualFrame, 'thrust' | 'altitude' | 'r'>,
  sunDir: Vec3,
  cameraSunElev: number,
): number {
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
  private readonly basisX = new THREE.Vector3();
  private readonly basisY = new THREE.Vector3();
  private readonly basisZ = new THREE.Vector3();
  private readonly upVec = new THREE.Vector3();
  private readonly sunVec = new THREE.Vector3();
  private readonly camRel = new THREE.Vector3();
  private readonly centerWorld = new THREE.Vector3();
  private readonly quadRightWorld = new THREE.Vector3();
  private readonly quadUpWorld = new THREE.Vector3();

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
        uExpansion: { value: 1.0 },
        uCamLocal: { value: new THREE.Vector3() },
        uQuadCenterLocal: { value: new THREE.Vector3() },
        uQuadRightLocal: { value: new THREE.Vector3() },
        uQuadUpLocal: { value: new THREE.Vector3() },
        uSunLocal: { value: new THREE.Vector3(0, 1, 0) },
        uUpLocal: { value: new THREE.Vector3(0, 1, 0) },
      },
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    this.mesh.renderOrder = 5;
  }

  private toPlumeLocal(v: THREE.Vector3, scale: number, out: THREE.Vector3): THREE.Vector3 {
    const inv = 1.0 / scale;
    return out.set(
      v.dot(this.basisX) * inv,
      v.dot(this.basisY) * inv,
      v.dot(this.basisZ) * inv,
    );
  }

  /**
   * @param vehicle the vehicle in scene coordinates
   * @param dir its direction of flight (unit, ECI = scene axes)
   */
  update(
    frame: VisualFrame,
    vehicle: THREE.Vector3,
    dir: Vec3,
    sunDir: Vec3,
    cameraSunElev: number,
    camera: THREE.Camera,
  ): void {
    const radius = jellyfishRadius(frame.altitude);
    const distance = camera.position.distanceTo(vehicle);
    // Visible both in close exterior chase views (> 25 m) and from distant ground/space views
    const proximityFade = smoothstep(15, 180, distance);
    const intensity = jellyfishIntensity(frame, sunDir, cameraSunElev) * proximityFade;

    this.mesh.visible = intensity > 0.01 && radius > 100;
    if (!this.mesh.visible) return;

    // Build a deterministic, world-anchored 3D orthonormal basis for the plume:
    // +Z points back along the exhaust vector (-dir); +X/+Y are locked to local zenith
    this.basisZ.set(-dir.x, -dir.y, -dir.z).normalize();
    this.upVec.set(frame.r.x, frame.r.y, frame.r.z).normalize();
    if (Math.abs(this.basisZ.dot(this.upVec)) > 0.98) {
      this.upVec.set(0, 0, 1);
      if (Math.abs(this.basisZ.dot(this.upVec)) > 0.98) this.upVec.set(1, 0, 0);
    }
    this.basisX.crossVectors(this.upVec, this.basisZ).normalize();
    this.basisY.crossVectors(this.basisZ, this.basisX).normalize();

    // Position the screen-aligned raymarching proxy quad so it never clips the camera near plane
    const plumeCenterOffset = radius * 0.82;
    this.centerWorld.copy(vehicle).addScaledVector(this.basisZ, plumeCenterOffset);

    const camToPlumeCenter = camera.position.distanceTo(this.centerWorld);
    const boundRadius = radius * 1.25;
    if (camToPlumeCenter < boundRadius * 1.1) {
      // Camera is inside or close to the plume volume: place proxy plane safely in front of camera
      const forward = this.camRel.set(0, 0, -1).applyQuaternion(camera.quaternion);
      const proxyDist = Math.max(80, Math.min(distance * 0.9, 1500));
      this.mesh.position.copy(camera.position).addScaledVector(forward, proxyDist);
      this.mesh.scale.set( proxyDist * 2.2, proxyDist * 2.2, 1 );
    } else {
      this.mesh.position.copy(this.centerWorld);
      this.mesh.scale.set(boundRadius, boundRadius, 1);
    }
    this.mesh.quaternion.copy(camera.quaternion);

    // Transform camera, quad geometry, sun, and zenith into Plume Local Coordinates
    const u = this.material.uniforms;
    u.uIntensity.value = intensity * 1.75;
    u.uTime.value = frame.t;
    u.uExpansion.value = 0.75 + 0.35 * smoothstep(45e3, 110e3, frame.altitude);

    this.camRel.subVectors(camera.position, vehicle);
    this.toPlumeLocal(this.camRel, radius, u.uCamLocal.value);

    this.centerWorld.subVectors(this.mesh.position, vehicle);
    this.toPlumeLocal(this.centerWorld, radius, u.uQuadCenterLocal.value);

    this.quadRightWorld.set(this.mesh.scale.x, 0, 0).applyQuaternion(camera.quaternion);
    this.toPlumeLocal(this.quadRightWorld, radius, u.uQuadRightLocal.value);

    this.quadUpWorld.set(0, this.mesh.scale.y, 0).applyQuaternion(camera.quaternion);
    this.toPlumeLocal(this.quadUpWorld, radius, u.uQuadUpLocal.value);

    this.sunVec.set(sunDir.x, sunDir.y, sunDir.z).normalize();
    this.toPlumeLocal(this.sunVec, 1.0, u.uSunLocal.value);
    this.toPlumeLocal(this.upVec, 1.0, u.uUpLocal.value);
  }

  dispose(): void {
    this.material.dispose();
    this.mesh.geometry.dispose();
  }
}
