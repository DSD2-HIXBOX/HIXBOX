import * as THREE from 'three';
import {PCInput} from '../input/PCInput.js';
import {ExploreInteraction} from '../explore/ExploreInteraction.js';
import {SmoothEye} from '../explore/SmoothEye.js';
import {furnishFireClassroom} from './FireEscapeClassroom.js';
import {FireEscapeAudio} from './FireEscapeAudio.js';
import {FireEscapeEffects, WINDOW} from './FireEscapeEffects.js';
import {FireEscapeSleeve} from './FireEscapeSleeve.js';
import {FireEscapeStory} from './FireEscapeStory.js';
import {FireEscapeUI} from './FireEscapeUI.js';
import {loadFireEscapeWorld} from './FireEscapeWorld.js';
import './FireEscape.css';

const element = id => document.getElementById(id);
const setStatus = text => { element('load-status').textContent = text; };
const STANDING_EYE = 1.6;
const LOW_EYE = 1.12;
const LOW_HEIGHT = 1.22;

async function main() {
  const canvas = element('scene');
  const audio = new FireEscapeAudio();
  const [world] = await Promise.all([loadFireEscapeWorld(canvas, setStatus), audio.preload()]);
  const {renderer, scene, camera, rig, collision, classroomDoor} = world;
  furnishFireClassroom(scene, world.interactionWorld.root, collision, world.spawn.y);
  const story = new FireEscapeStory();
  const sleeve = new FireEscapeSleeve();
  const effects = new FireEscapeEffects(scene, classroomDoor);
  const ui = new FireEscapeUI();
  const smoothEye = new SmoothEye(STANDING_EYE);
  const doorTargets = world.interactionWorld.targets;
  const allTargets = [...doorTargets, ...effects.belongingTargets];
  const interactionWorld = {...world.interactionWorld};
  const interaction = new ExploreInteraction(interactionWorld, () => {});
  for (const {object} of effects.belongingOutlines) {
    object.userData.interaction = '소지품';
    object.userData.onInteract = () => ui.showBelongingFeedback(story.elapsed);
  }
  const ray = new THREE.Ray();
  const point = new THREE.Vector3();
  const wallCheck = new THREE.Raycaster();
  let started = false;
  let playing = false;
  let previousTime = 0;

  const posture = {
    crouched: false,
    updatePC() {},
    toggle() {
      if (playing && story.lower(classroomDoor.open)) audio.select();
    },
  };

  function lowerPosture(elapsed) {
    if (!story.lowering) return;
    collision.height = Math.max(LOW_HEIGHT, collision.height - .92 * Math.min(elapsed, .25));
    smoothEye.height = STANDING_EYE - (1.70 - collision.height);
    posture.crouched = true;
  }

  function showPlaying(locked) {
    playing = locked && document.pointerLockElement === canvas;
    previousTime = 0;
    element('menu').hidden = playing;
    element('hud').hidden = !playing;
    if (!playing) {
      audio.stop();
      setStatus(started ? '이어서 체험하거나 처음부터 다시 시작할 수 있어요.' : '교실에서 화재 대피를 시작합니다.');
    }
  }

  const pc = new PCInput(camera, canvas, interaction, showPlaying, posture);
  pc.onProtection = () => {
    if (playing && story.alarm) sleeve.toggle();
    return true;
  };

  function reset() {
    story.reset();
    audio.stop();
    ui.reset();
    effects.reset();
    sleeve.reset();
    world.doors.reset();
    rig.position.copy(world.spawn);
    collision.height = 1.7;
    posture.crouched = false;
    smoothEye.height = STANDING_EYE;
    smoothEye.reset(rig.position.y);
    camera.position.set(0, STANDING_EYE, 0);
    pc.keys.clear();
    pc.yaw = 0;
    pc.pitch = 0;
    pc.applyView();
  }

  function begin() {
    if (!started) reset();
    audio.unlock();
    started = true;
    element('restart').hidden = false;
    element('start').textContent = '계속하기';
    pc.start().then(locked => {
      if (!locked) {
        pc.dragMode = false;
        showPlaying(false);
        setStatus('마우스 잠금을 허용한 뒤 계속하기를 눌러 주세요.');
      } else {
        showPlaying(true);
        if (story.alarm && story.step === 1) audio.playAlarm();
      }
    });
  }

  function aimedTarget() {
    if (!story.alarm) return null;
    interactionWorld.targets = story.canSelectBelongings ? allTargets : doorTargets;
    camera.updateWorldMatrix(true, false);
    return interaction.fromCamera(camera);
  }

  pc.onPrimary = () => {
    const target = playing && aimedTarget();
    if (target) {
      const selectedDoor = doorTargets.includes(target);
      if (selectedDoor) ui.clearFeedback();
      interaction.activate(target);
      audio.select();
      if (selectedDoor && pc.keys.has('KeyC')) story.lower(classroomDoor.open);
    }
    return true;
  };

  document.addEventListener('keydown', event => {
    if (!playing || event.repeat) return;
    if (event.code === 'KeyR') reset();
  });
  element('start').addEventListener('click', begin);
  element('restart').addEventListener('click', () => {
    reset();
    begin();
  });
  element('fullscreen').addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      setStatus('이 브라우저에서 전체 화면으로 전환할 수 없습니다.');
    }
  });
  window.addEventListener('pagehide', () => {
    audio.stop();
    if (document.pointerLockElement === canvas) document.exitPointerLock();
  });
  document.addEventListener('visibilitychange', () => {
    previousTime = 0;
    if (document.hidden) audio.stop();
  });

  function checkWindow() {
    if (story.step !== 3 || rig.position.x >= WINDOW.min.x) return false;
    camera.getWorldPosition(ray.origin);
    camera.getWorldDirection(ray.direction);
    const hit = ray.intersectBox(WINDOW, point);
    if (!hit || ray.origin.distanceTo(hit) > 5) return false;
    wallCheck.set(ray.origin, ray.direction);
    wallCheck.far = ray.origin.distanceTo(hit) - .04;
    return !wallCheck.intersectObjects(world.interactionWorld.occluders, false).some(result => {
      const material = result.object.material;
      return !(material.transparent && material.opacity < .35) &&
        !world.interactionWorld.ignoreOccluderHit?.(result);
    });
  }

  function checkOpenHallway() {
    if (story.step !== 3 || classroomDoor.progress < .7 || rig.position.x < 38.65) return false;
    camera.getWorldPosition(ray.origin);
    camera.getWorldDirection(ray.direction);
    point.copy(effects.smokeSight).sub(ray.origin);
    const distance = point.length();
    if (!distance || distance > 7 || ray.direction.dot(point.normalize()) < .94) return false;
    wallCheck.set(ray.origin, point);
    wallCheck.far = distance - .25;
    return !wallCheck.intersectObjects(world.interactionWorld.occluders, false).some(hit =>
      !world.interactionWorld.ignoreOccluderHit?.(hit) && !(hit.object.material.transparent && hit.object.material.opacity < .35));
  }

  reset();
  setStatus('화면과 조명을 준비하는 중…');
  await renderer.compileAsync(scene, camera);
  setStatus('교실에서 화재 대피를 시작합니다.');
  element('start').disabled = false;
  renderer.setAnimationLoop(time => {
    const elapsed = previousTime ? Math.min((time - previousTime) / 1000, 1) : 0;
    const dt = Math.min(elapsed, .05);
    previousTime = time;
    if (playing && !document.hidden) {
      lowerPosture(elapsed);
      pc.update(dt, rig, collision);
      smoothEye.update(Math.min(elapsed, .15), rig.position.y, camera);
      camera.updateWorldMatrix(true, false);
      const lookingAtWindow = checkWindow() || checkOpenHallway();
      const nearDoor = rig.position.x < classroomDoor.config.min[0] &&
        Math.hypot(rig.position.x - classroomDoor.openingCenter.x, rig.position.z - classroomDoor.openingCenter.z) < 1.8;
      const alarmWasOn = story.alarm;
      story.update(elapsed, {
        nearDoor, doorOpened: classroomDoor.open, lookingAtWindow, announcementPlaying: audio.announcing,
        lowReady: collision.height <= LOW_HEIGHT && Math.abs(camera.position.y - LOW_EYE) < .025,
      });
      if (!alarmWasOn && story.alarm) audio.playAlarm();
      effects.update(story, camera, elapsed);
      sleeve.update(Math.min(elapsed, .12));
      ui.update(story, lookingAtWindow || aimedTarget());
      world.doors.update(dt, rig.position);
    }
    world.render(dt);
    if (playing) sleeve.render(renderer, camera);
  });
}

main().catch(error => {
  console.error(error);
  setStatus('학교 공간을 불러오지 못했습니다. ' + error.message);
});
