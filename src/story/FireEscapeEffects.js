import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

export const WINDOW = new THREE.Box3(
  new THREE.Vector3(38.60, 7.07, -8.77),
  new THREE.Vector3(38.73, 8.00, -6.17),
);

export function smokeDensity(elapsed) {
  return .52 + .55 * THREE.MathUtils.smoothstep(elapsed, 0, 22)
    + .48 * THREE.MathUtils.smoothstep(elapsed, 8, 75);
}

function frameGlow(width, height) {
  const padding = .13;
  const size = new THREE.Vector2(width + 2 * padding, height + 2 * padding);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      size: {value: size},
      halfFrame: {value: new THREE.Vector2(width / 2, height / 2)},
      strength: {value: 0},
    },
    transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide,
    vertexShader: `
      varying vec2 glowUV;
      void main() {
        glowUV = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 glowUV;
      uniform vec2 size;
      uniform vec2 halfFrame;
      uniform float strength;
      void main() {
        vec2 edge = abs((glowUV - 0.5) * size) - halfFrame + 0.015;
        float distanceToEdge = abs(length(max(edge, 0.0)) + min(max(edge.x, edge.y), 0.0) - 0.015);
        float glow = exp(-distanceToEdge * 29.0) * 0.48;
        float core = 0.26 * (1.0 - smoothstep(0.0, 0.012, distanceToEdge));
        float alpha = (glow + core) * (1.0 - smoothstep(0.085, 0.13, distanceToEdge));
        vec3 blue = vec3(0.35, 0.64, 1.0);
        vec3 color = mix(blue, vec3(0.87, 0.94, 1.0), core * 2.4);
        gl_FragColor = vec4(color, alpha * strength);
      }
    `,
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(size.x, size.y), material);
}

function silhouetteGlow(geometry, height = 0, worldScale = new THREE.Vector3(1, 1, 1), boost = 1) {
  geometry.computeBoundingBox();
  const dimensions = geometry.boundingBox.getSize(new THREE.Vector3());
  const center = geometry.boundingBox.getCenter(new THREE.Vector3());
  const worldSize = dimensions.multiply(worldScale);
  const glow = new THREE.Group();
  for (const [spread, opacity, color] of [
    [.024, .045, 0x639bff],
    [.017, .085, 0x74aaff],
    [.011, .14, 0x8fbaff],
    [.006, .21, 0xb6d5ff],
    [.003, .27, 0xe0efff],
  ]) {
    const shell = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
      color, transparent: true, depthWrite: false, toneMapped: false, side: THREE.BackSide,
    }));
    shell.scale.set(
      1 + 2 * spread * boost / Math.max(.01, Math.abs(worldSize.x)),
      1 + 2 * spread * boost / Math.max(.01, Math.abs(worldSize.y)),
      1 + 2 * spread * boost / Math.max(.01, Math.abs(worldSize.z)),
    );
    shell.position.copy(center).multiply(shell.scale).negate();
    shell.raycast = () => {};
    shell.userData.peakOpacity = opacity * boost;
    shell.material.opacity = shell.userData.peakOpacity;
    glow.add(shell);
  }
  glow.position.copy(center);
  glow.position.y += height;
  return glow;
}

function setSilhouetteGlow(glow, visible, strength) {
  glow.visible = visible;
  if (!visible) return;
  for (const shell of glow.children) shell.material.opacity = shell.userData.peakOpacity * strength;
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
    const {max} = door.config;
    const doorPanels = [];
    for (const {pivot} of door.leaves) {
      pivot.traverse(mesh => {
        if (mesh.isMesh && [mesh.material].flat().every(material => !material.transparent)) doorPanels.push(mesh);
      });
    }
    this.doorGlows = doorPanels.map(panel => {
      const glow = silhouetteGlow(panel.geometry, 0, panel.getWorldScale(new THREE.Vector3()), 2.1);
      panel.add(glow);
      return glow;
    });
    this.windowOutline = frameGlow(2.63, .96);
    this.windowOutline.position.set(38.48, 7.54, -7.47);
    this.windowOutline.rotation.y = Math.PI / 2;

    this.belongings = new THREE.Group();
    // The rendered wood top is above the simplified collision surface.
    const desktopHeight = 6.637;
    this.belongings.position.set(35.25, desktopHeight + .007, -8.13);
    const book = new THREE.Group();
    book.position.set(-.305, 0, .015);
    book.rotation.y = -.16;
    book.scale.set(1.38, 1.2, 1.24);
    boxPiece(book, [.22, .034, .18], [0, .017, 0], 0xe6ddbd);
    for (const y of [.004, .034]) boxPiece(book, [.232, .008, .19], [0, y, 0], 0x507eb4);
    boxPiece(book, [.10, .002, .044], [0, .039, -.025], 0xaed6ed);
    const bag = new THREE.Group();
    const bagScale = 1.52;
    bag.position.set(.055, .115 * bagScale, -.02);
    bag.rotation.set(Math.PI / 2, -.14, 0, 'YXZ');
    bag.scale.setScalar(bagScale);
    const shell = new THREE.Mesh(
      new RoundedBoxGeometry(.242, .122, .23, 3, .046),
      new THREE.MeshStandardMaterial({color: 0x8c5277, roughness: .93}),
    );
    shell.position.y = .061;
    bag.add(shell);
    boxPiece(bag, [.15, .023, .092], [0, .102, .057], 0xb6719b);
    boxPiece(bag, [.125, .009, .012], [0, .117, .06], 0x4b324e);
    boxPiece(bag, [.026, .013, .028], [.049, .12, .059], 0xe4d5c8);
    boxPiece(bag, [.082, .026, .027], [0, .052, -.109], 0x4b324e);

    this.belongingOutlines = [
      {object: book, outline: silhouetteGlow(new RoundedBoxGeometry(.232, .038, .19, 2, .003), .019)},
      {object: bag, outline: silhouetteGlow(shell.geometry, shell.position.y)},
    ];
    this.belongingTargets = this.belongingOutlines.flatMap(({object}) => [...object.children]);
    for (const {object, outline} of this.belongingOutlines) {
      object.add(outline);
      this.belongings.add(object);
    }

    this.alarm = new THREE.Group();
    this.alarm.position.set(38.47, 8.24, -9.55);
    this.alarm.rotation.y = -Math.PI / 2;
    boxPiece(this.alarm, [.21, .15, .06], [0, 0, 0], 0x751a23);
    this.lens = boxPiece(this.alarm, [.15, .065, .035], [0, 0, .047], 0xcf4148);
    this.rings = [circularLine(.18, 0xff5752), circularLine(.18, 0xff8c76)];
    this.rings.forEach(ring => { ring.position.z = .077; this.alarm.add(ring); });

    this.texture = smokeTexture();
    this.geometry = new THREE.PlaneGeometry(1, 1);
    // The neighboring classroom occupies the west side of the wall (x < 38.62).
    // Its existing door frame spans z=-14.75 to -13.40 in the school model.
    this.fireOrigin = new THREE.Vector3(38.03, 5.75, -12.92);
    this.sourceDoorZ = -14.08;
    this.smokeSight = new THREE.Vector3(39.45, 7.56, -12.7);
    this.sourceRoom = this.addSmoke(12, bounds(35.5, 38.63, 6.58, 8.6, -14.96, -10.7), 0x545257);
    this.sourceDoor = this.addSmoke(7, bounds(38.46, 39.42, 6.78, 8.13, -14.73, -13.4), 0x57555b);
    this.corridor = this.addSmoke(28, bounds(38.77, 40.98, 6.67, 8.57, -20, -1.55), 0x66646a);
    this.room = this.addSmoke(12, bounds(34.4, 38.70, 7.58, 8.52, -10.05, -4.75), 0x888487);
    const openingZ = door.openingCenter.z;
    this.seam = this.addSmoke(4, bounds(38.45, 39.1, max[1] - .15, max[1] + .09, openingZ - .28, openingZ + .28), 0x888487);
    this.flames = Array.from({length: 3}, (_, index) => {
      const flame = new THREE.Mesh(this.geometry, flameMaterial(index * 2.3));
      this.root.add(flame);
      return flame;
    });
    this.root.add(this.windowOutline, this.belongings, this.alarm);
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
    for (const cloud of [...this.sourceRoom, ...this.sourceDoor, ...this.corridor, ...this.room, ...this.seam]) cloud.visible = false;
    for (const glow of this.doorGlows) glow.visible = false;
    this.windowOutline.visible = false;
    for (const {outline} of this.belongingOutlines) outline.visible = false;
    this.alarm.visible = false;
    this.lens.material.emissive.setHex(0);
  }

  update(story, camera, dt) {
    const time = story.elapsed;
    const alarmTime = story.smokeSeconds;
    const shimmer = .78 + .18 * Math.sin(story.elapsed * 3);
    const doorGlowVisible = story.alarm && story.step <= 3 && this.door.progress < .8;
    for (const glow of this.doorGlows) setSilhouetteGlow(glow, doorGlowVisible, shimmer);
    this.windowOutline.visible = story.step === 3;
    this.windowOutline.material.uniforms.strength.value = shimmer;
    for (const {outline} of this.belongingOutlines) {
      setSilhouetteGlow(outline, story.canSelectBelongings, shimmer);
    }
    const ringing = story.alarm && alarmTime < 9;
    this.alarm.visible = ringing;
    this.lens.material.emissive.setHex(ringing ? 0xff3c39 : 0);
    this.lens.material.emissiveIntensity = ringing ? .24 + .58 * (.5 + .5 * Math.sin(alarmTime * 4.5)) : 0;
    this.rings.forEach((ring, index) => {
      ring.visible = ringing;
      const wave = (alarmTime / 1.8 + index * .5) % 1;
      ring.scale.setScalar(1 + wave * 2.7);
      ring.material.opacity = (1 - wave) * .62;
    });

    const strength = smokeDensity(time);
    this.sourceRoom.forEach((cloud, index) => {
      const seed = cloud.userData.seed;
      const drift = (seed + time * .078) % 1;
      this.cloud(cloud, camera, 37.18 + drift * 1.08, 6.95 + seed * 1.44,
        this.fireOrigin.z - (index % 4) * .54, 1.45 + seed * 1.65, .78 + seed * .82,
        Math.min(.93, strength) * Math.sin(Math.PI * drift) * .9, time);
    });
    this.sourceDoor.forEach(cloud => {
      const seed = cloud.userData.seed;
      const drift = (seed + time * .115) % 1;
      this.cloud(cloud, camera, 38.52 + drift * .76, 7.35 + seed * .45,
        this.sourceDoorZ + (seed - .5) * .53, 1.32, .63 + seed * .42,
        Math.min(.94, strength) * Math.sin(Math.PI * drift), time);
    });
    this.corridor.forEach((cloud, index) => {
      const seed = cloud.userData.seed;
      const nearWindow = index < 8;
      const cycle = (seed + time * (.025 + (index % 4) * .003)) % 1;
      const reach = THREE.MathUtils.lerp(4.5, 11, THREE.MathUtils.smoothstep(time, 0, 64));
      const z = nearWindow ? -9.65 + cycle * 2.4 : this.sourceDoorZ + cycle * reach;
      const density = THREE.MathUtils.lerp(1, .30, cycle);
      this.cloud(cloud, camera, 39.07 + (index % 6) * .28, 7.05 + seed * 1.3, z,
        1.48 + seed * 2.35, .75 + seed * .84,
        Math.min(.96, strength * density * Math.sin(Math.PI * cycle) * (nearWindow ? .72 : 1)), time);
    });

    const doorOpening = this.door.progress;
    if (story.step === 4 || doorOpening > .15) this.indoorTime += dt;
    this.flames.forEach((flame, index) => {
      flame.visible = story.alarm && doorOpening > .28;
      if (!flame.visible) return;
      const height = 1.52 + index * .19;
      flame.position.copy(this.fireOrigin);
      flame.position.x += (index - 1) * .19;
      flame.position.y += height * .53;
      flame.position.z += (index - 1) * .32;
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
      const influx = THREE.MathUtils.smoothstep(this.indoorTime, 0, 32);
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
