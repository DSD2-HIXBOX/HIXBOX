import * as THREE from 'three';
import {PCInput} from '../input/PCInput.js';
import {ExploreInteraction} from '../explore/ExploreInteraction.js';
import {SmoothEye} from '../explore/SmoothEye.js';
import {FireEscapeAudio} from './FireEscapeAudio.js';
import {FireEscapeEffects, WINDOW} from './FireEscapeEffects.js';
import {FireEscapeStory, WINDOW_SECONDS} from './FireEscapeStory.js';
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
  const story = new FireEscapeStory();
  const effects = new FireEscapeEffects(scene, classroomDoor);
  const ui = new FireEscapeUI();
  const smoothEye = new SmoothEye(STANDING_EYE);
  const interaction = new ExploreInteraction(world.interactionWorld, () => {});
  const ray = new THREE.Ray();
  const point = new THREE.Vector3();
  const choiceAnchor = new THREE.Vector3();
  const projected = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const wallCheck = new THREE.Raycaster();
  let started = false;
  let playing = false;
  let anchorSet = false;
  let doorTarget = null;
  let previousTime = 0;

  const posture = {
    crouched: false,
    updatePC() {},
    toggle() {},
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
  pc.onProtection = () => true;

  function reset() {
    story.reset();
    audio.stop();
    ui.reset();
    effects.reset();
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
    anchorSet = false;
    doorTarget = null;
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

  function choose(number) {
    if (!playing || !story.choose(number)) return false;
    audio.select();
    ui.update(story, '', null);
    return true;
  }

  pc.onPrimary = () => {
    if (choose(ui.aim())) return true;
    if (story.step === 4 && doorTarget) {
      interaction.activate(doorTarget);
      audio.select();
    }
    return true;
  };

  document.addEventListener('keydown', event => {
    if (!playing || event.repeat) return;
    if (event.code === 'KeyR') reset();
    if (event.code === 'Digit1' || event.code === 'Digit2') choose(Number(event.key));
  });
  canvas.addEventListener('click', () => {
    if (playing) choose(ui.aim());
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

  function updateChoiceAnchor() {
    if (!story.choiceOpen) {
      anchorSet = false;
      return;
    }
    if (!anchorSet) {
      camera.getWorldPosition(choiceAnchor);
      camera.getWorldDirection(direction);
      choiceAnchor.addScaledVector(direction, 3);
      choiceAnchor.y -= .58;
      anchorSet = true;
    }
    camera.getWorldPosition(point);
    camera.getWorldDirection(direction);
    const behind = point.subVectors(choiceAnchor, point).dot(direction) <= .12;
    projected.copy(choiceAnchor).project(camera);
    const offscreen = behind || Math.abs(projected.x) > 1.25 || Math.abs(projected.y) > 1.25;
    ui.choices.classList.toggle('offscreen', offscreen);
    if (!offscreen) {
      ui.choices.style.setProperty('--choice-x', 50 + projected.x * 50 + '%');
      ui.choices.style.setProperty('--choice-y', 50 - projected.y * 50 + '%');
    }
  }

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

  function hintFor(lookingAtWindow) {
    if (story.choiceOpen) return '선택지에 조준하고 클릭 또는 E · 숫자 1 / 2';
    if (story.step === 2) return '빛나는 교실 출입문 가까이 이동하세요.';
    if (story.step === 3) return lookingAtWindow
      ? '연기 방향 확인 중 · ' + Math.floor(100 * story.windowFocus / WINDOW_SECONDS) + '%'
      : '조준점으로 빛나는 창문을 잠시 바라보세요.';
    if (story.completed) return doorTarget
      ? '낮은 자세로 대피할 준비가 되었어요. · ' + doorTarget.userData.interactionLabel()
      : '낮은 자세로 대피할 준비가 되었어요.';
    if (story.step === 4 && story.lowering) return '허리를 숙이는 중…';
    return '';
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
      const lookingAtWindow = checkWindow();
      const nearDoor = rig.position.x < classroomDoor.config.min[0] &&
        Math.hypot(rig.position.x - classroomDoor.openingCenter.x, rig.position.z - classroomDoor.openingCenter.z) < 1.8;
      const alarmWasOn = story.alarm;
      story.update(elapsed, {
        nearDoor, lookingAtWindow, announcementPlaying: audio.announcing,
        lowReady: collision.height <= LOW_HEIGHT && Math.abs(camera.position.y - LOW_EYE) < .025,
      });
      if (!alarmWasOn && story.alarm) audio.playAlarm();
      doorTarget = story.step === 4 && story.lowering ? interaction.fromCamera(camera) : null;
      updateChoiceAnchor();
      effects.update(story, camera, elapsed);
      ui.update(story, hintFor(lookingAtWindow), lookingAtWindow || doorTarget);
      world.doors.update(dt, rig.position);
    }
    world.render(dt);
  });
}

main().catch(error => {
  console.error(error);
  setStatus('학교 공간을 불러오지 못했습니다. ' + error.message);
});
