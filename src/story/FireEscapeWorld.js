import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {gunzipSync} from 'three/addons/libs/fflate.module.js';
import {MeshoptDecoder} from 'meshoptimizer';
import {CompactCollider} from '../explore/CompactCollider.js';
import {ExploreCollision} from '../explore/ExploreCollision.js';
import {installDoors} from '../explore/HingedDoors.js';
import {installElevator} from '../explore/ElevatorSystem.js';
import {OcclusionCuller} from '../explore/OcclusionCuller.js';
import {DAYLIGHT, applySurfaceStability, daylightLights, isStableShell} from '../explore/RenderAppearance.js';

export function collisionBytes(bytes) {
  const decoded = bytes[0] === 0x1f && bytes[1] === 0x8b && bytes[2] === 8 ? gunzipSync(bytes) : bytes;
  if (!decoded.byteLength || decoded.byteLength % 36) throw new Error('학교 충돌 데이터 형식을 확인할 수 없습니다.');
  return new Float32Array(decoded.buffer, decoded.byteOffset, decoded.byteLength / 4);
}

export async function loadFireEscapeWorld(canvas, status) {
  const renderer = new THREE.WebGLRenderer({canvas, antialias: true, powerPreference: 'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = DAYLIGHT.exposure;
  renderer.localClippingEnabled = true;
  renderer.info.autoReset = false;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#c8d9df');
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  scene.environment = pmrem.fromScene(room, .04).texture;
  scene.environmentIntensity = DAYLIGHT.environment;
  room.dispose();
  pmrem.dispose();
  scene.add(...daylightLights());

  const rig = new THREE.Group();
  const camera = new THREE.PerspectiveCamera(70, 1, DAYLIGHT.near, DAYLIGHT.far);
  scene.add(rig);
  rig.add(camera);
  const resize = () => {
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener('resize', resize);

  const modelURL = new URL('./models/explore/', document.baseURI);
  async function fetchAsset(name) {
    const result = await fetch(new URL(name, modelURL));
    if (!result.ok) throw new Error(name + ' 파일을 불러오지 못했습니다.');
    return result;
  }
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const [{scene: school}, navigation, doorManifest, bytes] = await Promise.all([
    loader.loadAsync(new URL('render.glb', modelURL).href, event => {
      if (event.lengthComputable) status('학교 모델을 불러오는 중 · ' + Math.round(100 * event.loaded / event.total) + '%');
    }),
    fetchAsset('navigation.json').then(result => result.json()),
    fetchAsset('doors.json').then(result => result.json()),
    fetchAsset('collision.bin.gz').then(result => result.arrayBuffer()),
  ]);
  status('학교의 문과 충돌을 연결하는 중…');
  await new Promise(requestAnimationFrame);

  applySurfaceStability(school);
  const anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
  const textures = new Set();
  const originalNodes = new Map();
  school.traverse(object => {
    if (object.userData.originalNodeIndex !== undefined) originalNodes.set(object.userData.originalNodeIndex, object);
    if (!object.isMesh) return;
    for (const material of [object.material].flat()) {
      for (const value of Object.values(material)) {
        if (value?.isTexture && !textures.has(value)) {
          textures.add(value);
          value.anisotropy = anisotropy;
        }
      }
    }
  });
  scene.add(school);
  school.updateMatrixWorld(true);
  const collision = new ExploreCollision(navigation);
  collision.staticCollider = new CompactCollider(collisionBytes(new Uint8Array(bytes)));
  collision.meshes.push(collision.staticCollider);
  const elevator = await installElevator({
    root: school, scene, collision, rig, notify: () => {},
    assetURL: new URL('elevator.json', modelURL).href,
  });
  const doors = installDoors(school, doorManifest, originalNodes, collision, () => {});
  const classroomDoor = doors.doors.find(door => door.config.id === 'door-19');
  if (!classroomDoor) throw new Error('화재 대피 교실의 출입문을 찾을 수 없습니다.');
  const spawn = new THREE.Vector3(36, 5.7496, -6);
  const floor = collision.floorAt(spawn.x, spawn.z, spawn.y);
  if (floor === null || collision.blocked(spawn.x, floor, spawn.z)) throw new Error('교실 시작 위치를 확인할 수 없습니다.');
  spawn.y = floor;
  rig.position.copy(spawn);

  const occluders = [];
  school.traverse(object => {
    if (object.isMesh && !doors.movingMeshes.has(object)) occluders.push(object);
  });
  const bounds = occluders.map(object => ({o: object, box: new THREE.Box3().setFromObject(object, true)}));
  const culler = new OcclusionCuller(renderer, bounds.filter(({o}) => !isStableShell(o)));
  const interactionWorld = {
    root: school, doors: [classroomDoor], targets: [classroomDoor.leaves[0].pivot, classroomDoor.leaves[1].pivot],
    ignoreOccluderHit: elevator.ignoreHit, occluders,
  };
  let timeToCull = 0;
  const eyePosition = new THREE.Vector3();
  function render(dt) {
    camera.updateMatrixWorld(true);
    if ((timeToCull -= dt) <= 0) {
      timeToCull = .3;
      camera.getWorldPosition(eyePosition);
      for (const {o: object, box} of bounds) {
        object.userData.distanceVisible = ![object.material].flat().every(material => material.opacity === 0) &&
          box.distanceToPoint(eyePosition) < (object.userData.distanceVisible === false ? 100 : 110);
        object.visible = object.userData.distanceVisible && (object.userData.occlusionCell?.visible ?? true);
      }
    }
    culler.update(camera, Math.abs(classroomDoor.progress - Number(classroomDoor.open)) > .001);
    renderer.info.reset();
    renderer.render(scene, camera);
    culler.render(camera);
  }

  return {renderer, scene, camera, rig, collision, spawn, doors, classroomDoor, interactionWorld, elevator, render};
}
