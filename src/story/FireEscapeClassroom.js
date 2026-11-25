import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

export function furnishFireClassroom(scene, school, collision, floor) {
  const room = new THREE.Group();
  room.name = 'Fire classroom furniture';
  scene.add(room);
  const parts = new Map();
  const sourceMaterials = new Map();
  school.traverse(object => {
    if (!object.isMesh) return;
    for (const material of [object.material].flat()) sourceMaterials.set(material.name, material);
  });
  const deskWood = sourceMaterials.get('[Wood Cherry Original]2') ?? 0x9e795c;
  const cabinetWood = sourceMaterials.get('[Wood Veneer 01]') ?? 0x795339;
  const whiteMetal = 0xbfc2bf;
  const shade = 0x999c98;

  function piece(material, x, y, z, width, height, depth) {
    if (!parts.has(material)) parts.set(material, []);
    parts.get(material).push({x, y: floor + y, z, width, height, depth});
  }

  function block(x, z, width, height, depth) {
    collision.addBox(
      new THREE.Vector3(x - width / 2, floor, z - depth / 2),
      new THREE.Vector3(x + width / 2, floor + height, z + depth / 2),
    );
  }

  for (const [row, z] of [-11.50, -12.74, -13.86].entries()) {
    for (const [column, x] of [33.67, 35.46, 37.16].entries()) {
      piece(deskWood, x, .754, z, 1.34, .045, .52);
      piece(whiteMetal, x, .687, z, 1.28, .092, .46);
      piece(shade, x, .636, z, 1.17, .015, .37);
      for (const side of [-1, 1]) {
        const postX = x + side * .606;
        for (const end of [-1, 1]) {
          piece(whiteMetal, postX, .337, z + end * .185, .035, .674, .035);
        }
        piece(whiteMetal, postX, .19, z, .03, .03, .383);
        const seatX = x + side * .326;
        const seatZ = z + .455;
        for (const legX of [-.15, .15]) {
          for (const legZ of [-.117, .117]) {
            piece(whiteMetal, seatX + legX, .212, seatZ + legZ, .026, .424, .026);
          }
          piece(whiteMetal, seatX + legX, .56, seatZ + .124, .026, .32, .024);
        }
        piece(deskWood, seatX, .438, seatZ, .361, .038, .316);
        piece(deskWood, seatX, .748, seatZ + .131, .362, .191, .041);
        block(seatX, seatZ, .36, .84, .35);
      }
      if ((row + column) % 3 === 0 || row === 1 && column === 2) {
        piece(0x486880, x - .29, .791, z + .054, .23, .025, .155);
        piece(0xe6d8ba, x + .018, .78, z - .054, .16, .012, .20);
      }
      block(x, z, 1.34, .78, .52);
    }
  }

  const frontZ = -14.62;
  piece(cabinetWood, 35.66, 1.85, frontZ, 3.01, 1.06, .054);
  piece(0x315855, 35.66, 1.85, frontZ + .038, 2.90, .96, .030);
  piece(whiteMetal, 35.66, 1.355, frontZ + .056, 2.91, .035, .082);
  piece(0xd8d4c5, 36.28, 1.382, frontZ + .065, .084, .013, .018);
  piece(0x393b38, 37.78, 2.28, frontZ, 1.04, .58, .071);
  piece(0x4c5050, 37.78, 2.28, frontZ + .045, .977, .512, .025);

  const podiumX = 34.55, podiumZ = -14.37;
  piece(cabinetWood, podiumX, .51, podiumZ, .68, 1.02, .37);
  piece(cabinetWood, podiumX, 1.037, podiumZ, .75, .048, .45);
  block(podiumX, podiumZ, .75, 1.06, .45);

  const rearZ = -10.74;
  piece(cabinetWood, 35.62, 1.68, rearZ, 2.99, .92, .045);
  piece(0x7c634f, 35.62, 1.68, rearZ - .027, 2.88, .82, .018);
  for (const [index, color] of [0xe0d8af, 0xc6d7e3, 0xdbc8ca, 0xe4dfd0].entries()) {
    const x = 34.58 + index * .68;
    piece(color, x, 1.68, rearZ - .043, .41, .58, .008);
    for (let line = 0; line < 4; line++) {
      piece(0x81837a, x - .026, 1.79 - line * .073, rearZ - .049, .265, .012, .002);
    }
  }
  for (let slot = 0; slot < 5; slot++) {
    const z = -14.13 + slot * .55;
    piece(cabinetWood, 32.55, .43, z, .38, .86, .54);
    piece(deskWood, 32.751, .43, z, .025, .76, .49);
    piece(shade, 32.772, .59, z + .16, .028, .033, .089);
    block(32.55, z, .42, .86, .54);
  }

  const geometry = new RoundedBoxGeometry(1, 1, 1, 2, .04);
  const transform = new THREE.Object3D();
  for (const [material, entries] of parts) {
    const mesh = new THREE.InstancedMesh(
      geometry,
      material.isMaterial ? material : new THREE.MeshStandardMaterial({color: material, roughness: .88}),
      entries.length,
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
