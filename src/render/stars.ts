/** Shared, deterministic sky for the launch scene and the orbit diagram.
 * Point sizes are CSS pixels, independent of the renderer backing-buffer DPI. */
import * as THREE from 'three';
import { hash11 } from './noise';

/**
 * Galactic north pole in equatorial (≈ ECI) coordinates: α = 192.86°,
 * δ = +27.13°. The Milky Way is the great circle perpendicular to it, which is
 * where the extra faint stars are packed.
 */
const GAL_POLE = new THREE.Vector3(-0.8677, -0.1978, 0.4560).normalize();


const STAR_VERT = /* glsl */ `
  #include <common>
  attribute vec3 aColor;
  attribute float aSize;
  uniform float uPixelRatio;
  varying vec3 vCol;
  void main() {
    vCol = aColor;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    #ifdef BACKGROUND_SKY
      // Preserve the sky direction while keeping it behind all scene geometry.
      gl_Position.z = gl_Position.w;
    #endif
    gl_PointSize = aSize * uPixelRatio;
  }
`;
const STAR_FRAG = /* glsl */ `
  #include <common>
  uniform float uOpacity;
  varying vec3 vCol;
  void main() {
    vec2 d = gl_PointCoord - vec2(0.5);
    // Gaussian point spread instead of a hard square: a 1-pixel square is what
    // made the old field read as graph paper rather than sky
    float g = exp(-dot(d, d) * 17.0);
    float a = g * uOpacity;
    if (a < 0.006) discard;
    gl_FragColor = vec4(vCol, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;


/**
 * Deterministic star field: a magnitude power law, per-star colour temperature
 * and size, and a band of faint stars packed around the galactic equator that
 * reads as the Milky Way without shipping a catalogue or a texture.
 *
 * Star counts roughly triple per magnitude step, so brightness is drawn as a
 * high power of a uniform hash: a handful of first-magnitude stars, a few
 * hundred you can pick out, and thousands at the threshold of visibility.
 * Nothing here uses `Math.random`, so the sky is identical on every run.
 */
export function buildStarField(radius = 4e8, pixelRatio = 1, background = false): THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial> {
  const FIELD = 3600;
  const BAND = 2400;
  const N = FIELD + BAND;
  const R = radius;
  const pos = new Float32Array(N * 3);
  const col = new Float32Array(N * 3);
  const size = new Float32Array(N);
  // an orthonormal frame with the galactic pole as its axis, so the band stars
  // can be generated directly in galactic latitude
  const gz = GAL_POLE.clone();
  const gx = new THREE.Vector3(0, 0, 1).cross(gz).normalize();
  const gy = new THREE.Vector3().crossVectors(gz, gx).normalize();
  const dir = new THREE.Vector3();
  for (let i = 0; i < N; i++) {
    if (i < FIELD) {
      // Fibonacci sphere: an even all-sky spread with no clumping
      const u = -1 + (2 * i + 1) / FIELD;
      const ph = i * 2.39996323;
      const rr = Math.sqrt(Math.max(0, 1 - u * u));
      dir.set(rr * Math.cos(ph), rr * Math.sin(ph), u);
    } else {
      // galactic band: latitude concentrated within a few degrees of b = 0
      const j = i - FIELD;
      const lon = (j * 2.39996323) % (Math.PI * 2);
      const s = hash11(j * 1.93 + 0.7) - 0.5;
      const b = Math.sign(s) * Math.pow(Math.abs(s) * 2, 2.4) * 0.28;
      const cb = Math.cos(b), sb = Math.sin(b);
      dir.copy(gx).multiplyScalar(cb * Math.cos(lon))
        .addScaledVector(gy, cb * Math.sin(lon))
        .addScaledVector(gz, sb);
    }
    pos[i * 3] = R * dir.x;
    pos[i * 3 + 1] = R * dir.y;
    pos[i * 3 + 2] = R * dir.z;
    // magnitude: few bright, many faint (band stars are unresolved, so dimmer)
    const mag = Math.pow(hash11(i * 1.37 + 3.1), i < FIELD ? 4.2 : 6.0);
    const b = (i < FIELD ? 0.10 : 0.05) + (i < FIELD ? 0.95 : 0.40) * mag;
    // colour temperature: most stars are white-ish, a few red or blue
    const tint = hash11(i * 3.91 + 7) * 2 - 1;
    const warm = Math.max(0, tint), cool = Math.max(0, -tint);
    col[i * 3] = b * (1 - 0.16 * cool);
    col[i * 3 + 1] = b * (1 - 0.07 * cool - 0.10 * warm);
    col[i * 3 + 2] = b * (1 - 0.34 * warm);
    size[i] = 1.1 + 3.4 * Math.pow(mag, 0.8) * (i < FIELD ? 1 : 0.55);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  const mat = new THREE.ShaderMaterial({
    vertexShader: STAR_VERT, fragmentShader: STAR_FRAG,
    defines: background ? { BACKGROUND_SKY: 1 } : {},
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    uniforms: { uOpacity: { value: 1 }, uPixelRatio: { value: pixelRatio } },
  });
  const points = new THREE.Points(geo, mat);
  // Opaque geometry has already written depth. Other transparent overlays
  // should blend over the sky, including those that do not write depth.
  if (background) points.renderOrder = -1;
  points.frustumCulled = false;
  return points;
}
