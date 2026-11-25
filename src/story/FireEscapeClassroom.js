import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

export function furnishFireClassroom(scene, collision, floor) {
  const room = new THREE.Group();
  room.name = 'Fire classroom furniture';
  scene.add(room);
  const parts = new Map();

  function piece(color, x, y, z, width, height, depth) {
    if (!parts.has(color)) parts.set(color, []);
    parts.get(color).push({x, y: floor + y, z, width, height, depth});
  }
  function block(x, z, width, height, depth) {
    collision.addBox(
      new THREE.Vector3(x - width / 2, floor, z - depth / 2),
      new THREE.Vector3(x + width / 2, floor + height, z + depth / 2),
    );
  }

  for (const [row, z] of [-11.55, -12.85, -14.15].entries()) {
    for (const [column, x] of [35.8, 37.17].entries()) {
      piece(0x94603d, x, .744, z, .76, .057, .52);
      piece(0x6c472f, x, .68, z - .19, .68, .088, .036);
      for (const side of [-1, 1]) {
        for (const end of [-1, 1]) {
          piece(0x777b78, x + side * .31, .35, z + end * .19, .033, .70, .033);
          piece(0x777b78, x + side * .145, .21, z + .47 + end * .12, .023, .42, .024);
        }
      }
      piece(0x9a6642, x, .43, z + .47, .34, .047, .32);
      piece(0x777b78, x, .58, z + .62, .28, .31, .025);
      piece(0x9a6642, x, .735, z + .619, .34, .14, .045);

      if (row !== 1 || column === 0) {
        const bookColor = column === 0 ? 0x426985 : 0x785041;
        piece(bookColor, x - .11, .785, z + .045, .21, .031, .15);
        piece(0xd8cfb3, x + .085, .778, z - .068, .135, .014, .17);
      }
      block(x, z, .76, .77, .52);
      block(x, z + .47, .34, .80, .34);
    }
  }

  const cabinetX = 34.95, cabinetZ = -13.55;
  piece(0x795a42, cabinetX, .64, cabinetZ, .36, 1.28, 1.28);
  piece(0x98775a, cabinetX + .13, .65, cabinetZ, .13, 1.24, 1.21);
  for (const [index, color] of [0x5c7382, 0x978454, 0x786c59, 0x5d8273, 0x7a5d50].entries()) {
    piece(color, cabinetX + .025, 1.37 + (index % 2) * .028, cabinetZ - .43 + index * .17, .22, .18, .07);
  }
  block(cabinetX, cabinetZ, .38, 1.49, 1.28);

  const geometry = new RoundedBoxGeometry(1, 1, 1, 2, .08);
  const transform = new THREE.Object3D();
  for (const [color, entries] of parts) {
    const mesh = new THREE.InstancedMesh(
      geometry, new THREE.MeshStandardMaterial({color, roughness: .88}), entries.length,
    );
    entries.forEach(({x, y, z, width, height, depth}, index) => {
      transform.position.set(x, y, z);
      transform.scale.set(width, height, depth);
      transform.updateMatrix();
      mesh.setMatrixAt(index, transform.matrix);
    });
    mesh.computeBoundingSphere();
    room.add(mesh);
  }
  return room;
}
