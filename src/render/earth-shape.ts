/**
 * The shape of the drawn Earth: the WGS-84 ellipsoid every flight is flown on
 * (D-51, src/physics/geodesy.ts), not the 6,378.137 km sphere it was drawn as
 * before. The launch scene's globe, its clouds and the orbit view's globe are
 * built here, so the pads, the landing zones and every body stand on the
 * ground the physics puts them on (tests/wgs84-sites.test.ts).
 */
import * as THREE from 'three';
import { WGS84_F } from '../physics/geodesy';

/**
 * A globe of equatorial radius `radius` flattened by WGS-84's 1/298.257 along
 * the geometry's y, which the scenes turn onto the pole (+z): a three.js
 * sphere, so its uv and its normals are a sphere's, the normals scaled with it.
 */
export function ellipsoidGeometry(radius: number, widthSegments: number, heightSegments: number): THREE.SphereGeometry {
  return new THREE.SphereGeometry(radius, widthSegments, heightSegments).scale(1, 1 - WGS84_F, 1);
}

/** Radius of a globe from `ellipsoidGeometry(radius, …)`, turned pole to +z, along the unit vector `(x, y, z)`. */
export function ellipsoidRadius(radius: number, x: number, y: number, z: number): number {
  const b = radius * (1 - WGS84_F);
  return (radius * b) / Math.sqrt(b * b * (x * x + y * y) + radius * radius * z * z);
}
