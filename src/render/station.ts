/**
 * The International Space Station as drawn for a rendezvous (roadmap G07).
 *
 * Built in the station's body axes, as `src/physics/rendezvous/ports.ts`
 * places the docking ports: x forward along the velocity, y to starboard, z to
 * nadir; the view turns it into the frame's LVLH attitude. Proportions follow
 * the station's layout (a 109 m truss, eight 35 m US array wings, the US
 * modules ahead of the Russian segment), simplified to what reads from a few
 * hundred metres and up close at a docking port; details are estimates.
 *
 * Each docking port carries the target the Soyuz TV camera lines up on: a
 * cross on a standoff above a disc, offset from the port as the real targets
 * are, so the docking camera's view has something to aim at.
 */
import * as THREE from 'three';
import { PORTS, targetOffset, type PortId } from '../physics/rendezvous/ports';

export class StationView {
  readonly group = new THREE.Group();
  private readonly materials: THREE.Material[] = [];
  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly targets = new Map<PortId, THREE.Group>();

  constructor() {
    const mat = (color: number, metal = 0.2, rough = 0.6, emissive = 0) => {
      const m = new THREE.MeshStandardMaterial({ color, metalness: metal, roughness: rough, emissive });
      this.materials.push(m);
      return m;
    };
    const white = mat(0xe4e2dc, 0.05, 0.75), grey = mat(0x9aa0a6, 0.4, 0.5), dark = mat(0x3e434a, 0.4, 0.6);
    const gold = mat(0xc9a24a, 0.7, 0.3), array = mat(0x2a3a70, 0.55, 0.3, 0x05081a), radiator = mat(0xf2f2f0, 0.05, 0.85);
    const russian = mat(0xd9d4c4, 0.05, 0.8), ruArray = mat(0x2c3452, 0.5, 0.35, 0x04060f);
    const g = this.group;
    const add = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, rot?: [number, number, number]) => {
      this.geometries.push(geo);
      const mesh = new THREE.Mesh(geo, m);
      mesh.position.set(x, y, z);
      if (rot) mesh.rotation.set(rot[0], rot[1], rot[2]);
      mesh.castShadow = true; mesh.receiveShadow = true;
      g.add(mesh);
      return mesh;
    };
    // a module along an axis: cylinders are built along y, so turn them
    const along = { x: [0, 0, Math.PI / 2] as [number, number, number], y: undefined, z: [Math.PI / 2, 0, 0] as [number, number, number] };
    const module = (r: number, len: number, axis: 'x' | 'y' | 'z', x: number, y: number, z: number, m = white, r2 = r) =>
      add(new THREE.CylinderGeometry(r2, r, len, 24), m, x, y, z, along[axis]);

    // --- the US segment, forward of the Russian one; the centre of mass is taken at the S0 truss, above Destiny
    module(2.2, 8.5, 'x', 0, 0, 0);                    // Destiny
    module(2.2, 7.2, 'x', 7.85, 0, 0);                 // Harmony
    module(1.2, 2.5, 'x', 12.7, 0, 0, grey);           // PMA-2 / IDA
    module(2.2, 6.5, 'y', 7.85, 5.5, 0);               // Columbus, starboard
    module(2.2, 11, 'y', 7.85, -7.7, 0);               // Kibo, port
    module(2.2, 5.5, 'x', -7, 0, 0);                   // Unity
    module(2.2, 6.7, 'y', -7, -5.6, 0);                // Tranquility
    add(new THREE.CylinderGeometry(1.5, 1.5, 1.5, 7), grey, -7, -7.5, 2.1, along.z);   // Cupola
    module(1.2, 1.9, 'x', -10.7, 0, 0, grey);          // PMA-1
    // --- the Russian segment
    module(2.05, 12.6, 'x', -17.95, 0, 0, russian);    // Zarya
    module(1.35, 3.8, 'x', -26.15, 0, 0, russian, 2.1); // Zvezda's forward node and transfer compartment
    module(2.1, 9.5, 'x', -32.8, 0, 0, russian);       // Zvezda's working compartment
    module(2.05, 13, 'z', -26.1, 0, 8.6, russian);     // Nauka, below Zvezda
    add(new THREE.SphereGeometry(1.7, 20, 14), russian, -26.1, 0, 16.9);  // Prichal
    module(1.2, 6, 'z', -13.2, 0, 5.05, russian);      // Rassvet, below Zarya's forward end
    module(1.25, 4.1, 'z', -26.1, 0, -4.05, russian);  // Poisk, above Zvezda
    for (const s of [1, -1]) {
      // Zvezda's and Zarya's array wings
      add(new THREE.BoxGeometry(3.2, 13, 0.08), ruArray, -34, s * 9, 0, [Math.PI / 2, 0, 0]);
      add(new THREE.BoxGeometry(3.2, 10, 0.08), ruArray, -19.5, s * 7.2, 0, [Math.PI / 2, 0, 0]);
    }
    // --- the truss, above Destiny (a box built along y), and its arrays and radiators
    add(new THREE.BoxGeometry(2.6, 109, 2.6), grey, 0, 0, -4.8);
    for (const s of [1, -1]) {
      for (const station of [36, 50]) {
        // two array wings per joint, fore and aft of it, turned 30° about the truss
        for (const f of [1, -1]) {
          const wing = add(new THREE.BoxGeometry(11.6, 0.12, 34.5), array, 0, s * station, -4.8);
          wing.position.set(f * 18 * Math.cos(Math.PI / 6), s * station, -4.8 - f * 18 * Math.sin(Math.PI / 6));
          wing.rotation.y = Math.PI / 2 + Math.PI / 6;
        }
        add(new THREE.CylinderGeometry(0.25, 0.25, 36, 6), gold, 0, s * station, -4.8, [0, 0, Math.PI / 2 + Math.PI / 6]);
      }
      // radiators hang below the truss's inner segments
      add(new THREE.BoxGeometry(3.2, 0.1, 22), radiator, 0, s * 18, 7.5);
    }
    add(new THREE.BoxGeometry(1.2, 0.1, 12), radiator, 0, 0, -12);
    add(new THREE.BoxGeometry(1.2, 1.2, 1.2), dark, 0, 0, -6.4);

    // --- the targets on the Russian ports
    for (const port of Object.values(PORTS)) {
      const t = new THREE.Group();
      const n = new THREE.Vector3(port.axis.x, port.axis.y, port.axis.z);
      // the docking ring
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.07, 8, 24), dark);
      this.geometries.push(ring.geometry);
      ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
      t.add(ring);
      // the target: a disc on the hull 1 m beside the port, a cross on a 0.6 m standoff in front of it
      const o = targetOffset(port);
      const base = new THREE.Vector3(o.x, o.y, o.z);
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.28, 20), mat(0x101010, 0, 0.9));
      this.geometries.push(disc.geometry);
      disc.position.copy(base);
      disc.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
      t.add(disc);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 6), white);
      this.geometries.push(post.geometry);
      post.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
      post.position.copy(base).addScaledVector(n, 0.3);
      t.add(post);
      const bar = new THREE.BoxGeometry(0.34, 0.05, 0.02), bar2 = new THREE.BoxGeometry(0.05, 0.34, 0.02);
      this.geometries.push(bar, bar2);
      for (const geo of [bar, bar2]) {
        const m = new THREE.Mesh(geo, white);
        m.position.copy(base).addScaledVector(n, 0.61);
        m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
        t.add(m);
      }
      t.position.set(port.position.x, port.position.y, port.position.z);
      g.add(t);
      this.targets.set(port.id, t);
    }
    this.group.visible = false;
  }

  dispose(): void {
    for (const m of this.materials) m.dispose();
    for (const x of this.geometries) x.dispose();
  }
}
