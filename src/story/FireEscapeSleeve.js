import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

const RAISED = new THREE.Vector3(.38, -.30, -.62);
const REST = new THREE.Vector3(.54, -.64, -.67);
const WRIST = new THREE.Vector3(-.035, -.20, -.46);

export class FireEscapeSleeve {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera();
    this.arm = new THREE.Group();
    this.scene.add(this.arm, new THREE.HemisphereLight(0xfff4e4, 0x73839a, 2.25));
    const light = new THREE.DirectionalLight(0xfff6ed, 1.4);
    light.position.set(-.5, 1, 1);
    this.scene.add(light);

    const fabric = new THREE.MeshStandardMaterial({color: 0x58677f, roughness: .94});
    const cuff = new THREE.MeshStandardMaterial({color: 0x3b475d, roughness: .87});
    const stitching = new THREE.MeshStandardMaterial({color: 0x70809a, roughness: .92});
    const skin = new THREE.MeshStandardMaterial({color: 0xb47d60, roughness: .83});
    const axis = WRIST.clone().sub(RAISED);
    const length = axis.length();
    this.arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis.normalize());
    this.raisedRotation = this.arm.quaternion.clone();
    this.restRotation = new THREE.Quaternion()
      .setFromAxisAngle(new THREE.Vector3(0, 0, 1), -.32)
      .multiply(this.raisedRotation);

    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(.063, .087, length, 24, 5), fabric);
    sleeve.position.y = length / 2;
    this.arm.add(sleeve);
    const ribbedCuff = new THREE.Mesh(new THREE.CylinderGeometry(.059, .065, .055, 24), cuff);
    ribbedCuff.position.y = length - .016;
    this.arm.add(ribbedCuff);
    for (const offset of [-.014, .01]) {
      const seam = new THREE.Mesh(new THREE.TorusGeometry(.061, .002, 6, 24), stitching);
      seam.rotation.x = Math.PI / 2;
      seam.position.y = length + offset;
      this.arm.add(seam);
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

  update(elapsed, time) {
    this.progress = THREE.MathUtils.clamp(this.progress + elapsed * (this.covering ? 2.9 : -3.5), 0, 1);
    this.arm.visible = this.progress > 0;
    if (!this.arm.visible) return;
    const rise = THREE.MathUtils.smootherstep(this.progress, 0, 1);
    this.arm.position.lerpVectors(REST, RAISED, rise);
    this.arm.position.y += Math.sin(time * 3.2) * .0028 * rise;
    this.arm.quaternion.slerpQuaternions(this.restRotation, this.raisedRotation, rise);
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
