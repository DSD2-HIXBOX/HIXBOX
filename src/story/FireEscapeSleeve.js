import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

const SHOULDER = new THREE.Vector3(.22, -.28, -.20);
const ARM_AXIS = new THREE.Vector3(0, 1, 0);
const RAISED = new THREE.Vector3(.38, -.25, -.62);
const REST = new THREE.Vector3(.54, -.64, -.67);
const SLEEVE_EXTENSION = .132;
const WRIST = new THREE.Vector3(-.035, -.15, -.46);

// Diagonal folds gather at different points around the arm, leaving calmer cloth between them.
const FOLDS = [
  [.12, .012, .044, .9, .05],
  [.24, .020, .042, 2.6, .075],
  [.38, .016, .032, 3.9, .064],
  [.52, .010, .038, 5.2, .060],
  [.70, .011, .026, 2.1, .045],
  [.82, .012, .021, 4.4, .048],
  [.91, .009, .017, .5, .024],
];

function makeClothGeometry(length, shoulderRadius = .092, endRadius = .065) {
  const geometry = new THREE.CylinderGeometry(1, 1, length, 64, 84);
  const position = geometry.attributes.position;

  for (let i = 0; i < position.count; i++) {
    const t = position.getY(i) / length + .5;
    const x = position.getX(i);
    const z = position.getZ(i);
    const angle = Math.atan2(z, x);
    const taper = THREE.MathUtils.lerp(shoulderRadius, endRadius, t);
    const envelope = THREE.MathUtils.smoothstep(t, 0, .08)
      * (1 - THREE.MathUtils.smoothstep(t, .93, 1));
    let radius = taper + envelope * (.006 * Math.cos(2 * angle + t * 4)
      + .003 * Math.sin(5 * angle - t * 12));
    for (const [center, height, width, direction, slant] of FOLDS) {
      const around = Math.cos(angle - direction);
      const distance = (t - center - slant * Math.sin(angle - direction)) / width;
      const ridge = Math.exp(-(distance ** 2));
      const trough = Math.exp(-((distance - .95) ** 2) / .4);
      radius += height * envelope * (.38 + .62 * Math.max(0, around)) * (ridge - .48 * trough);
    }

    const drape = .030 * Math.sin(Math.PI * t);
    position.setXYZ(i, x * radius, position.getY(i), z * radius - drape);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function makeCuffGeometry() {
  const geometry = new THREE.CylinderGeometry(.064, .068, .046, 144, 6);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const z = position.getZ(i);
    const ribs = 1 + .026 * Math.cos(Math.atan2(z, x) * 36);
    position.setX(i, x * ribs);
    position.setZ(i, z * ribs);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function makeFabricGrain() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d');
  const pixels = context.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const stitch = Math.sin(x * Math.PI / 4) * Math.cos((y + x / 2) * Math.PI / 4);
      const fleck = ((x * 37 ^ y * 71 ^ x * y * 13) & 31) - 15;
      const shade = 128 + 23 * stitch + fleck;
      pixels.data.set([shade, shade, shade, 255], (y * size + x) * 4);
    }
  }
  context.putImageData(pixels, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(5, 6);
  return texture;
}

export class FireEscapeSleeve {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera();
    this.arm = new THREE.Group();
    this.scene.add(this.arm, new THREE.HemisphereLight(0xfff4e4, 0x73839a, 1.55));
    const light = new THREE.DirectionalLight(0xfff6ed, 1.4);
    light.position.set(-.5, 1, 1);
    this.scene.add(light);

    const grain = makeFabricGrain();
    const fabric = new THREE.MeshStandardMaterial({
      color: 0x454b52, roughness: .97, bumpMap: grain, bumpScale: .006,
    });
    // The upper sleeve starts inside the sweatshirt at the right shoulder.
    const torso = new THREE.Mesh(new RoundedBoxGeometry(.58, .58, .40, 5, .12), fabric);
    torso.position.set(0, -.438, -.19);
    this.scene.add(torso);

    this.upperSleeve = new THREE.Mesh(makeClothGeometry(1, .111, .078), fabric);
    this.arm.add(this.upperSleeve);
    this.shoulderInArm = new THREE.Vector3();
    this.upperSleeveAxis = new THREE.Vector3();
    this.inverseArmRotation = new THREE.Quaternion();

    const cuff = new THREE.MeshStandardMaterial({color: 0x30353c, roughness: .97});
    const stitching = new THREE.MeshStandardMaterial({color: 0x424951, roughness: .98});
    const skin = new THREE.MeshStandardMaterial({color: 0xb47d60, roughness: .83});
    const axis = WRIST.clone().sub(RAISED);
    const length = axis.length();
    this.arm.quaternion.setFromUnitVectors(ARM_AXIS, axis.normalize());
    this.raisedRotation = this.arm.quaternion.clone();
    this.restRotation = new THREE.Quaternion()
      .setFromAxisAngle(new THREE.Vector3(0, 0, 1), -.32)
      .multiply(this.raisedRotation);

    this.sleeveLength = length;
    this.sleeve = new THREE.Mesh(makeClothGeometry(length), fabric);
    this.arm.add(this.sleeve);
    this.cuff = new THREE.Group();
    this.arm.add(this.cuff);
    const ribbedCuff = new THREE.Mesh(makeCuffGeometry(), cuff);
    ribbedCuff.position.y = -.016;
    this.cuff.add(ribbedCuff);
    for (const offset of [-.016, .006]) {
      const seam = new THREE.Mesh(new THREE.TorusGeometry(.065, .0013, 6, 64), stitching);
      seam.rotation.x = Math.PI / 2;
      seam.position.y = offset;
      this.cuff.add(seam);
    }

    const hand = new THREE.Group();
    hand.position.set(0, length + .015, 0);
    hand.rotation.y = -.33;
    hand.rotation.x = -.16;
    this.arm.add(hand);
    const palm = new THREE.Mesh(new RoundedBoxGeometry(.078, .082, .046, 3, .018), skin);
    palm.position.y = .036;
    hand.add(palm);
    for (const [index, fingerLength] of [.035, .047, .042, .031].entries()) {
      const finger = new THREE.Mesh(new THREE.CapsuleGeometry(.0088, fingerLength * .55, 5, 10), skin);
      finger.position.set((index - 1.5) * .0174, .071 + fingerLength * .24, .007);
      finger.rotation.x = -.48 - index * .068;
      hand.add(finger);
    }
    const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(.011, .024, 5, 10), skin);
    thumb.position.set(.035, .039, .013);
    thumb.rotation.z = -.49;
    thumb.rotation.x = -.22;
    hand.add(thumb);
    this.reset();
  }

  reset() {
    this.covering = false;
    this.progress = 0;
    this.arm.visible = false;
  }

  toggle() {
    this.covering = !this.covering;
  }

  update(elapsed) {
    this.progress = THREE.MathUtils.clamp(this.progress + elapsed * (this.covering ? 1.65 : -2.6), 0, 1);
    this.arm.visible = this.progress > 0;
    if (!this.arm.visible) return;
    const pull = THREE.MathUtils.smootherstep(this.progress, 0, .42);
    const lift = THREE.MathUtils.smootherstep(this.progress, .42, 1);
    const extension = SLEEVE_EXTENSION * pull;
    const length = this.sleeveLength + extension;
    this.sleeve.scale.y = length / this.sleeveLength;
    this.sleeve.position.y = length / 2;
    this.cuff.position.y = length;

    const rise = .35 * pull + .65 * lift;
    this.arm.position.lerpVectors(REST, RAISED, rise);
    this.arm.quaternion.slerpQuaternions(this.restRotation, this.raisedRotation, rise);

    // Anchor the upper sleeve at the shoulder and tuck its end inside the forearm.
    this.inverseArmRotation.copy(this.arm.quaternion).invert();
    this.shoulderInArm.copy(SHOULDER).sub(this.arm.position).applyQuaternion(this.inverseArmRotation);
    this.upperSleeveAxis.set(0, .075, 0).sub(this.shoulderInArm);
    this.upperSleeve.position.copy(this.shoulderInArm).addScaledVector(this.upperSleeveAxis, .5);
    this.upperSleeve.scale.y = this.upperSleeveAxis.length();
    this.upperSleeve.quaternion.setFromUnitVectors(ARM_AXIS, this.upperSleeveAxis.normalize());
  }

  render(renderer, view) {
    if (!this.arm.visible) return;
    this.camera.projectionMatrix.copy(view.projectionMatrix);
    this.camera.projectionMatrixInverse.copy(view.projectionMatrixInverse);
    const autoClear = renderer.autoClear;
    renderer.autoClear = false;
    renderer.clearDepth();
    renderer.render(this.scene, this.camera);
    renderer.autoClear = autoClear;
  }
}
