/**
 * Lightweight CPU-driven particle systems rendered as point sprites with
 * per-particle alpha and size (works with the logarithmic depth buffer).
 */
import * as THREE from 'three';

const VERT = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  attribute float aAlpha;
  attribute float aSize;
  uniform float uScale;
  varying float vAlpha;
  void main() {
    vAlpha = aAlpha;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uScale * projectionMatrix[1][1] / max(0.01, -mv.z);
    gl_Position = projectionMatrix * mv;
    #include <logdepthbuf_vertex>
  }
`;
const FRAG = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_fragment>
  uniform sampler2D map;
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    #include <logdepthbuf_fragment>
    vec4 tex = texture2D(map, gl_PointCoord);
    gl_FragColor = vec4(uColor * tex.rgb, tex.a * vAlpha);
  }
`;

let softSprite: THREE.Texture | null = null;
export function getSoftSprite(): THREE.Texture {
  if (softSprite) return softSprite;
  const size = 64;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.3, 'rgba(255,255,255,0.7)');
  grad.addColorStop(0.7, 'rgba(255,255,255,0.18)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  softSprite = new THREE.CanvasTexture(c);
  return softSprite;
}

export interface Particle {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  age: number; life: number;
  size0: number; size1: number;
  alpha0: number;
  alive: boolean;
}

export class ParticleSystem {
  readonly points: THREE.Points;
  readonly material: THREE.ShaderMaterial;
  readonly particles: Particle[] = [];
  private positions: Float32Array;
  private alphas: Float32Array;
  private sizes: Float32Array;
  private geometry: THREE.BufferGeometry;
  private cursor = 0;
  readonly capacity: number;

  constructor(capacity: number, color: THREE.ColorRepresentation, additive: boolean) {
    this.capacity = capacity;
    this.positions = new Float32Array(capacity * 3);
    this.alphas = new Float32Array(capacity);
    this.sizes = new Float32Array(capacity);
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphas, 1));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
    for (let i = 0; i < capacity; i++) {
      this.particles.push({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, age: 0, life: 1, size0: 1, size1: 1, alpha0: 1, alive: false });
    }
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG,
      uniforms: { map: { value: getSoftSprite() }, uColor: { value: new THREE.Color(color) }, uScale: { value: 400 } },
      transparent: true, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
  }

  setColor(c: THREE.ColorRepresentation): void {
    (this.material.uniforms.uColor.value as THREE.Color).set(c);
  }

  /** Emit one particle (overwrites the oldest slot when full). */
  emit(p: Omit<Particle, 'age' | 'alive'>): void {
    const q = this.particles[this.cursor];
    this.cursor = (this.cursor + 1) % this.capacity;
    Object.assign(q, p, { age: 0, alive: true });
  }

  /** Advance all particles; accel is applied in local coordinates. */
  update(dt: number, ax: number, ay: number, az: number, drag = 0): void {
    const k = Math.max(0, 1 - drag * dt);
    for (let i = 0; i < this.capacity; i++) {
      const p = this.particles[i];
      if (!p.alive) { this.alphas[i] = 0; continue; }
      p.age += dt;
      if (p.age >= p.life) { p.alive = false; this.alphas[i] = 0; continue; }
      p.vx = (p.vx + ax * dt) * k; p.vy = (p.vy + ay * dt) * k; p.vz = (p.vz + az * dt) * k;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      const f = p.age / p.life;
      this.positions[i * 3] = p.x; this.positions[i * 3 + 1] = p.y; this.positions[i * 3 + 2] = p.z;
      this.alphas[i] = p.alpha0 * (1 - f) * (1 - f);
      this.sizes[i] = p.size0 + (p.size1 - p.size0) * f;
    }
    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.aAlpha as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
  }

  setPointScale(s: number): void {
    this.material.uniforms.uScale.value = s;
  }

  clear(): void {
    for (const p of this.particles) p.alive = false;
    this.alphas.fill(0);
    (this.geometry.attributes.aAlpha as THREE.BufferAttribute).needsUpdate = true;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
