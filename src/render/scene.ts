/**
 * Three.js scene with a floating origin: every object is positioned relative
 * to `origin` (the tracked vehicle, in ECI metres) so that float32 precision
 * is preserved near the camera. Scene axes coincide with ECI axes (Z = north).
 */
import * as THREE from 'three';
import type { Vec3 } from '../physics/vec3';
import { R_EARTH } from '../physics/constants';

const EARTH_VERT = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    vUv = uv;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vPosW = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
    #include <logdepthbuf_vertex>
  }
`;
const EARTH_FRAG = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_fragment>
  uniform sampler2D dayMap;
  uniform sampler2D nightMap;
  uniform sampler2D specMap;
  uniform vec3 sunDir;
  uniform vec3 camPos;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    #include <logdepthbuf_fragment>
    vec3 n = normalize(vNormalW);
    float cosSun = dot(n, sunDir);
    float dayF = smoothstep(-0.12, 0.25, cosSun);
    vec3 day = texture2D(dayMap, vUv).rgb;
    vec3 night = texture2D(nightMap, vUv).rgb;
    vec3 col = day * (0.12 + 1.0 * max(cosSun, 0.0));
    col = mix(night * 1.4 + day * 0.03, col, dayF);
    float spec = texture2D(specMap, vUv).r;
    vec3 viewDir = normalize(camPos - vPosW);
    vec3 h = normalize(sunDir + viewDir);
    float s = pow(max(dot(n, h), 0.0), 48.0) * spec * dayF * 0.7;
    col += vec3(s * 0.9, s * 0.95, s);
    float rim = pow(1.0 - max(dot(n, viewDir), 0.0), 3.5);
    col += vec3(0.3, 0.55, 1.0) * rim * (0.45 * dayF + 0.04);
    gl_FragColor = vec4(col, 1.0);
  }
`;
const ATMO_VERT = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vPosW = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
    #include <logdepthbuf_vertex>
  }
`;
const ATMO_FRAG = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_fragment>
  uniform vec3 sunDir;
  uniform vec3 camPos;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    #include <logdepthbuf_fragment>
    vec3 n = normalize(vNormalW);
    vec3 viewDir = normalize(camPos - vPosW);
    float d = max(dot(n, viewDir), 0.0);
    float band = smoothstep(0.0, 0.32, d) * (1.0 - smoothstep(0.32, 0.95, d));
    float lit = 0.2 + 0.8 * smoothstep(-0.25, 0.35, dot(n, sunDir));
    vec3 col = vec3(0.35, 0.6, 1.0) * band * lit;
    gl_FragColor = vec4(col, band * lit * 0.85);
  }
`;

export interface EarthTextures {
  day: THREE.Texture;
  night: THREE.Texture;
  spec: THREE.Texture;
  clouds: THREE.Texture | null;
}

export class SceneManager {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly earthGroup = new THREE.Group();
  readonly earthMesh: THREE.Mesh;
  readonly cloudMesh: THREE.Mesh | null;
  readonly atmoMesh: THREE.Mesh;
  readonly stars: THREE.Points;
  readonly sun: THREE.DirectionalLight;
  readonly ambient: THREE.AmbientLight;
  readonly hemi: THREE.HemisphereLight;
  private earthMat: THREE.ShaderMaterial;
  private atmoMat: THREE.ShaderMaterial;
  private starsMat: THREE.PointsMaterial;
  origin: Vec3 = { x: 0, y: 0, z: 0 };
  private cloudDrift = 0;

  constructor(canvas: HTMLCanvasElement, tex: EarthTextures) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, logarithmicDepthBuffer: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.5, 5e9);
    this.camera.up.set(0, 0, 1);

    // Earth
    tex.day.colorSpace = THREE.SRGBColorSpace;
    tex.night.colorSpace = THREE.SRGBColorSpace;
    const geo = new THREE.SphereGeometry(R_EARTH, 128, 96);
    this.earthMat = new THREE.ShaderMaterial({
      vertexShader: EARTH_VERT, fragmentShader: EARTH_FRAG,
      uniforms: {
        dayMap: { value: tex.day }, nightMap: { value: tex.night }, specMap: { value: tex.spec },
        sunDir: { value: new THREE.Vector3(1, 0, 0) }, camPos: { value: new THREE.Vector3() },
      },
    });
    this.earthMesh = new THREE.Mesh(geo, this.earthMat);
    this.earthGroup.add(this.earthMesh);
    if (tex.clouds) {
      const cm = new THREE.MeshLambertMaterial({ map: tex.clouds, transparent: true, opacity: 0.85, depthWrite: false });
      cm.alphaMap = tex.clouds;
      this.cloudMesh = new THREE.Mesh(new THREE.SphereGeometry(R_EARTH + 9000, 96, 64), cm);
      this.earthGroup.add(this.cloudMesh);
    } else {
      this.cloudMesh = null;
    }
    this.atmoMat = new THREE.ShaderMaterial({
      vertexShader: ATMO_VERT, fragmentShader: ATMO_FRAG, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.FrontSide,
      uniforms: { sunDir: { value: new THREE.Vector3(1, 0, 0) }, camPos: { value: new THREE.Vector3() } },
    });
    this.atmoMesh = new THREE.Mesh(new THREE.SphereGeometry(R_EARTH + 110e3, 96, 64), this.atmoMat);
    this.earthGroup.add(this.atmoMesh);
    this.scene.add(this.earthGroup);

    // stars
    const N = 3500;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const u = Math.random() * 2 - 1;
      const ph = Math.random() * Math.PI * 2;
      const rr = Math.sqrt(1 - u * u);
      const R = 4e8;
      pos[i * 3] = R * rr * Math.cos(ph);
      pos[i * 3 + 1] = R * rr * Math.sin(ph);
      pos[i * 3 + 2] = R * u;
      const b = 0.5 + Math.random() * 0.5;
      const tint = Math.random();
      col[i * 3] = b * (tint < 0.2 ? 1.0 : 0.9);
      col[i * 3 + 1] = b * 0.92;
      col[i * 3 + 2] = b * (tint > 0.8 ? 1.0 : 0.9);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    sg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.starsMat = new THREE.PointsMaterial({ size: 2.2, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 1, depthWrite: false });
    this.stars = new THREE.Points(sg, this.starsMat);
    this.scene.add(this.stars);

    // lights
    this.sun = new THREE.DirectionalLight(0xfff4e0, 2.6);
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);
    this.ambient = new THREE.AmbientLight(0x8090b0, 0.45);
    this.scene.add(this.ambient);
    this.hemi = new THREE.HemisphereLight(0x9fb8ff, 0x4a3a2a, 0.9);
    this.scene.add(this.hemi);
  }

  resize(w: number, h: number): void {
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
  }

  /** Convert an ECI position (m) into scene coordinates relative to the origin. */
  toScene(v: Vec3, out = new THREE.Vector3()): THREE.Vector3 {
    return out.set(v.x - this.origin.x, v.y - this.origin.y, v.z - this.origin.z);
  }

  /** Per-frame update of Earth rotation, sun direction and sky colour. */
  update(theta: number, sunDir: Vec3, cameraAltitude: number): void {
    // Earth orientation: geometry is Y-up with the texture seam handled by the
    // SphereGeometry convention (u=0.5 at +X); rotate X by 90° so the pole is +Z,
    // then spin about Z by the sidereal angle.
    const qx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
    const qz = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), theta);
    this.earthMesh.quaternion.copy(qz).multiply(qx);
    if (this.cloudMesh) {
      this.cloudDrift += 0.0000002;
      const qc = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), theta + this.cloudDrift);
      this.cloudMesh.quaternion.copy(qc).multiply(qx);
    }
    this.earthGroup.position.set(-this.origin.x, -this.origin.y, -this.origin.z);
    const sd = new THREE.Vector3(sunDir.x, sunDir.y, sunDir.z).normalize();
    (this.earthMat.uniforms.sunDir.value as THREE.Vector3).copy(sd);
    (this.atmoMat.uniforms.sunDir.value as THREE.Vector3).copy(sd);
    (this.earthMat.uniforms.camPos.value as THREE.Vector3).copy(this.camera.position);
    (this.atmoMat.uniforms.camPos.value as THREE.Vector3).copy(this.camera.position);
    this.sun.position.copy(sd).multiplyScalar(1e7);
    this.sun.target.position.set(0, 0, 0);
    this.stars.position.copy(this.camera.position);
    // sky: blue near the ground, black above ~90 km; darker at night
    const camPosEci = new THREE.Vector3(this.camera.position.x + this.origin.x, this.camera.position.y + this.origin.y, this.camera.position.z + this.origin.z);
    const sunElev = camPosEci.clone().normalize().dot(sd);
    const dayF = THREE.MathUtils.smoothstep(sunElev, -0.15, 0.2);
    const f = 1 - THREE.MathUtils.smoothstep(cameraAltitude, 15e3, 90e3);
    const sky = new THREE.Color(0.35, 0.58, 0.95).multiplyScalar(dayF * f).add(new THREE.Color(0.02, 0.03, 0.06).multiplyScalar(f));
    this.renderer.setClearColor(sky, 1);
    this.starsMat.opacity = 1 - f * (0.3 + 0.7 * dayF);
    this.ambient.intensity = 0.35 + 0.6 * f * dayF;
    // hemisphere fill: sky above / ground below near the pad, sun-side fill in space
    this.hemi.intensity = 0.85 + 0.5 * f * dayF;
    this.hemi.position.copy(f > 0.5 ? new THREE.Vector3(camPosEci.x, camPosEci.y, camPosEci.z).normalize() : sd);
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }
}

export function loadEarthTextures(base: string): Promise<EarthTextures> {
  const loader = new THREE.TextureLoader();
  const load = (name: string) => new Promise<THREE.Texture | null>((resolve) => {
    loader.load(`${base}textures/${name}`, (t) => { t.anisotropy = 4; resolve(t); }, undefined, () => resolve(null));
  });
  return Promise.all([load('earth_atmos_2048.jpg'), load('earth_lights_2048.png'), load('earth_specular_2048.jpg'), load('earth_clouds_1024.png')]).then(
    ([day, night, spec, clouds]) => ({
      day: day ?? proceduralTexture('#2a5ea8', '#3f7a3a'),
      night: night ?? proceduralTexture('#000000', '#000000'),
      spec: spec ?? proceduralTexture('#ffffff', '#000000'),
      clouds,
    }),
  );
}

/** Fallback texture when the image files are missing (stylised ocean/land noise). */
function proceduralTexture(ocean: string, land: string): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = ocean;
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = land;
  for (let i = 0; i < 60; i++) {
    g.beginPath();
    g.ellipse(Math.random() * 512, 40 + Math.random() * 180, 20 + Math.random() * 60, 10 + Math.random() * 30, Math.random() * 3, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
