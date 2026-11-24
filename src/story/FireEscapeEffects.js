import * as THREE from 'three';

export const WINDOW = new THREE.Box3(
  new THREE.Vector3(38.60, 7.07, -8.77),
  new THREE.Vector3(38.73, 8.00, -6.17),
);

function rectangle(width, height, color) {
  const frame = new THREE.Shape();
  const hole = new THREE.Path();
  const inset = .014;
  frame.moveTo(-width / 2, -height / 2);
  frame.lineTo(width / 2, -height / 2);
  frame.lineTo(width / 2, height / 2);
  frame.lineTo(-width / 2, height / 2);
  frame.closePath();
  hole.moveTo(-width / 2 + inset, -height / 2 + inset);
  hole.lineTo(-width / 2 + inset, height / 2 - inset);
  hole.lineTo(width / 2 - inset, height / 2 - inset);
  hole.lineTo(width / 2 - inset, -height / 2 + inset);
  hole.closePath();
  frame.holes.push(hole);
  return new THREE.Mesh(
    new THREE.ShapeGeometry(frame),
    new THREE.MeshBasicMaterial({color, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide}),
  );
}

function circularLine(radius, color) {
  const points = Array.from({length: 48}, (_, index) => {
    const angle = index * Math.PI / 24;
    return new THREE.Vector3(radius * Math.cos(angle), radius * Math.sin(angle), 0);
  });
  return new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({color, transparent: true, depthWrite: false}),
  );
}

function glint() {
  const points = [[-.075, 0], [.075, 0], [0, -.075], [0, .075]].map(([x, y]) => new THREE.Vector3(x, y, 0));
  return new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({color: 0xe2efff, transparent: true, depthWrite: false}),
  );
}

function boxPiece(parent, size, position, color) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(...size),
    new THREE.MeshStandardMaterial({color, roughness: .92}),
  );
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}

function smokeTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 96;
  const ctx = canvas.getContext('2d');
  for (let i = 0; i < 24; i++) {
    const angle = i * 2.39996;
    const distance = 4 + (i * 19 % 24);
    const x = 48 + Math.cos(angle) * distance;
    const y = 48 + Math.sin(angle) * distance;
    const radius = 13 + (i * 7 % 16);
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, 'rgba(255,255,255,.28)');
    gradient.addColorStop(.5, 'rgba(255,255,255,.12)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 96, 96);
  }
  return new THREE.CanvasTexture(canvas);
}

function flameMaterial(seed) {
  return new THREE.ShaderMaterial({
    uniforms: {time: {value: 0}, seed: {value: seed}, reveal: {value: 0}},
    transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide,
    vertexShader: `
      varying vec2 flameUV;
      void main() {
        flameUV = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 flameUV;
      uniform float time;
      uniform float seed;
      uniform float reveal;
      void main() {
        float y = flameUV.y;
        float sway = sin(y * 8.0 - time * 5.0 + seed) * 0.13 * y;
        float x = abs(flameUV.x - 0.5 + sway);
        float width = 0.46 * pow(1.0 - y, 0.7);
        float edge = 1.0 - smoothstep(width * 0.28, width + 0.02, x);
        float tail = 1.0 - smoothstep(0.53, 0.94, y + 0.08 * sin(time * 4.0 + seed));
        float opacity = edge * tail * smoothstep(0.0, 0.14, y) * reveal;
        vec3 orange = vec3(1.0, 0.28, 0.035);
        vec3 yellow = vec3(1.0, 0.86, 0.36);
        vec3 color = mix(orange, yellow, edge * (1.0 - y));
        gl_FragColor = vec4(color, opacity * 0.92);
      }
    `,
  });
}

const bounds = (x0, x1, y0, y1, z0, z1) => [
  new THREE.Plane(new THREE.Vector3(1, 0, 0), -x0),
  new THREE.Plane(new THREE.Vector3(-1, 0, 0), x1),
  new THREE.Plane(new THREE.Vector3(0, 1, 0), -y0),
  new THREE.Plane(new THREE.Vector3(0, -1, 0), y1),
  new THREE.Plane(new THREE.Vector3(0, 0, 1), -z0),
  new THREE.Plane(new THREE.Vector3(0, 0, -1), z1),
];

export class FireEscapeEffects {
  constructor(scene, door) {
    this.root = new THREE.Group();
    scene.add(this.root);
    this.door = door;
    const {min, max} = door.config;
    this.doorOutline = rectangle(max[2] - min[2], max[1] - min[1], 0xaecfff);
    this.doorOutline.position.set(min[0] - .13, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2);
    this.doorOutline.rotation.y = Math.PI / 2;
    this.windowOutline = rectangle(2.63, .96, 0xbfdaff);
    this.windowOutline.position.set(38.48, 7.54, -7.47);
    this.windowOutline.rotation.y = Math.PI / 2;

    this.belongings = new THREE.Group();
    // The original desktop at this location is 6.495 m above the model origin.
    this.belongings.position.set(35.25, 6.5, -8.13);
    boxPiece(this.belongings, [.17, .027, .16], [-.15, .0135, 0], 0x577ca0);
    boxPiece(this.belongings, [.14, .038, .085], [.025, .019, .055], 0xd18a9a);
    boxPiece(this.belongings, [.072, .016, .129], [.16, .008, -.018], 0x3f4b57);
    this.deskOutline = rectangle(.51, .22, 0xcfe3ff);
    this.deskOutline.position.set(0, .044, 0);
    this.deskOutline.rotation.x = -Math.PI / 2;
    this.belongings.add(this.deskOutline);

    this.markers = [this.doorOutline, this.windowOutline, this.deskOutline].map(outline => {
      const sparkle = glint();
      outline.add(sparkle);
      sparkle.position.set(0, outline === this.deskOutline ? .07 : .23, .02);
      return {outline, sparkle};
    });

    this.alarm = new THREE.Group();
    this.alarm.position.set(38.47, 8.24, -9.55);
    this.alarm.rotation.y = -Math.PI / 2;
    boxPiece(this.alarm, [.21, .15, .06], [0, 0, 0], 0x751a23);
    this.lens = boxPiece(this.alarm, [.15, .065, .035], [0, 0, .047], 0xcf4148);
    this.rings = [circularLine(.18, 0xff5752), circularLine(.18, 0xff8c76)];
    this.rings.forEach(ring => { ring.position.z = .077; this.alarm.add(ring); });

    this.texture = smokeTexture();
    this.geometry = new THREE.PlaneGeometry(1, 1);
    this.corridor = this.addSmoke(25, bounds(38.78, 40.98, 6.75, 8.53, -20, -1.55), 0x777578);
    this.room = this.addSmoke(12, bounds(34.4, 38.70, 7.58, 8.52, -10.05, -4.75), 0x888487);
    const openingZ = door.openingCenter.z;
    this.seam = this.addSmoke(4, bounds(38.45, 39.1, max[1] - .15, max[1] + .09, openingZ - .28, openingZ + .28), 0x888487);
    this.fireOrigin = new THREE.Vector3(39.7, 5.75, door.openingCenter.z - 3.6);
    this.flames = Array.from({length: 3}, (_, index) => {
      const flame = new THREE.Mesh(this.geometry, flameMaterial(index * 2.3));
      this.root.add(flame);
      return flame;
    });
    this.root.add(this.doorOutline, this.windowOutline, this.belongings, this.alarm);
    this.reset();
  }

  addSmoke(count, clippingPlanes, color) {
    return Array.from({length: count}, (_, index) => {
      const material = new THREE.MeshBasicMaterial({
        map: this.texture, color, transparent: true, depthWrite: false,
        opacity: 0, clippingPlanes, toneMapped: false,
      });
      const sheet = new THREE.Mesh(this.geometry, material);
      sheet.userData.seed = (index * .6180339) % 1;
      this.root.add(sheet);
      return sheet;
    });
  }

  reset() {
    this.indoorTime = 0;
    for (const flame of this.flames) flame.visible = false;
    this.rings.forEach(ring => { ring.visible = false; });
    for (const cloud of [...this.corridor, ...this.room, ...this.seam]) cloud.visible = false;
    for (const {outline} of this.markers) outline.visible = false;
    this.alarm.visible = false;
    this.lens.material.emissive.setHex(0);
  }

  update(story, camera, dt) {
    const time = story.smokeSeconds;
    const shimmer = .78 + .18 * Math.sin(story.elapsed * 3);
    this.doorOutline.visible = (story.step === 2 || story.step === 3) && this.door.progress < .8;
    this.deskOutline.visible = story.step === 2;
    this.windowOutline.visible = story.step === 3;
    this.markers.forEach(({outline, sparkle}, index) => {
      const pulse = Math.max(0, Math.sin(story.elapsed * 2.7 + index * 2)) ** 3;
      outline.material.opacity = shimmer;
      sparkle.material.opacity = pulse * .76;
      sparkle.scale.setScalar(.48 + pulse * .52);
    });
    const ringing = story.alarm && time < 9;
    this.alarm.visible = ringing;
    this.lens.material.emissive.setHex(ringing ? 0xff3c39 : 0);
    this.lens.material.emissiveIntensity = ringing ? .24 + .58 * (.5 + .5 * Math.sin(time * 4.5)) : 0;
    this.rings.forEach((ring, index) => {
      ring.visible = ringing;
      const wave = (time / 1.8 + index * .5) % 1;
      ring.scale.setScalar(1 + wave * 2.7);
      ring.material.opacity = (1 - wave) * .62;
    });

    const expected = [0, .30, .73, 1.12, 1.27][story.step];
    const strength = expected * Math.min(1, time / 8);
    this.corridor.forEach((cloud, index) => {
      const seed = cloud.userData.seed;
      const nearWindow = index < 4;
      const cycle = (seed + time * (.019 + (index % 4) * .003)) % 1;
      const reach = Math.min(12, 3.4 + time * .57);
      const z = nearWindow ? -9.75 + cycle * 2.4 : this.fireOrigin.z - 2.5 + cycle * reach;
      const density = THREE.MathUtils.lerp(.98, .27, cycle);
      this.cloud(cloud, camera, 39.22 + (index % 5) * .24, 7.05 + seed * 1.25, z,
        1.25 + seed * 2, .6 + seed * .72,
        strength * density * Math.sin(Math.PI * cycle) * (nearWindow ? .36 : .78), time);
    });

    if (story.step === 4) this.indoorTime += dt;
    const doorOpening = this.door.progress;
    this.flames.forEach((flame, index) => {
      flame.visible = story.alarm && doorOpening > .28;
      if (!flame.visible) return;
      const height = 1.22 + index * .18;
      flame.position.copy(this.fireOrigin);
      flame.position.x += (index - 1) * .32;
      flame.position.y += height * .53;
      flame.position.z += index * .19;
      flame.scale.set(.68 + index * .06, height, 1);
      flame.quaternion.copy(camera.quaternion);
      flame.material.uniforms.time.value = time;
      flame.material.uniforms.reveal.value = THREE.MathUtils.smoothstep(doorOpening, .28, .85);
    });
    this.seam.forEach(cloud => {
      const seed = cloud.userData.seed;
      this.cloud(cloud, camera, 38.79, this.door.config.max[1] - .04,
        this.door.openingCenter.z + seed * .26 - .13, .64, .23,
        doorOpening * Math.min(this.indoorTime * .09, .4), time);
    });
    this.room.forEach(cloud => {
      const seed = cloud.userData.seed;
      const age = (seed + this.indoorTime * .029) % 1;
      const reach = Math.min(3.6, this.indoorTime * .32);
      const influx = Math.min(1, this.indoorTime / 9);
      const opacity = influx * (.08 + doorOpening * .43) * Math.sin(Math.PI * age);
      this.cloud(cloud, camera, 38.52 - age * reach, 8.01 + seed * .34,
        this.door.openingCenter.z + age * seed * 3.5, 1 + seed * 1.5, .64 + .28 * seed, opacity, time);
    });
  }

  cloud(mesh, camera, x, y, z, width, height, opacity, time) {
    mesh.visible = opacity > .003;
    if (!mesh.visible) return;
    mesh.position.set(x, y, z);
    mesh.scale.set(width, height, 1);
    mesh.quaternion.copy(camera.quaternion);
    mesh.rotateZ(.16 * Math.sin(time * .43 + mesh.userData.seed * 12));
    mesh.material.opacity = opacity;
  }
}
