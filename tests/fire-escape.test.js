import test from 'node:test';
import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';
import {ANNOUNCEMENT_SECONDS, FireEscapeStory, INTRO_SECONDS, WINDOW_SECONDS} from '../src/story/FireEscapeStory.js';
import {collisionBytes} from '../src/story/FireEscapeWorld.js';

const noInput = {nearDoor: false, lookingAtWindow: false, lowReady: false};
const arrival = {...noInput, nearDoor: true};
const gaze = {...noInput, lookingAtWindow: true};
const lowered = {...noInput, lowReady: true};

test('alarm and announcement precede free movement to the door', () => {
  const story = new FireEscapeStory();
  story.update(INTRO_SECONDS - 1, arrival);
  assert.equal(story.alarm, false);
  story.update(1, arrival);
  assert.equal(story.alarm, true);
  assert.equal(story.lower(), false);
  story.update(ANNOUNCEMENT_SECONDS, {...arrival, announcementPlaying: true});
  assert.equal(story.step, 1);
  story.update(.1, arrival);
  assert.equal(story.step, 2);
  story.update(2, noInput);
  assert.equal(story.step, 2);
  story.update(.1, arrival);
  assert.equal(story.step, 3);
});

test('window needs uninterrupted gaze; the low posture completes step 04 and reset clears the session', () => {
  const story = new FireEscapeStory();
  story.update(INTRO_SECONDS, noInput);
  story.update(ANNOUNCEMENT_SECONDS, noInput);
  story.update(.1, arrival);
  story.update(WINDOW_SECONDS * .8, gaze);
  story.update(.1, noInput);
  story.update(WINDOW_SECONDS * .8, gaze);
  assert.equal(story.step, 3);
  story.update(.5, gaze);
  assert.equal(story.step, 4);
  story.update(5, lowered);
  assert.equal(story.completed, false);
  assert.equal(story.lower(), true);
  assert.equal(story.lower(), false);
  story.update(.1, noInput);
  assert.equal(story.lowering, true);
  assert.equal(story.completed, false);
  story.update(100, lowered);
  assert.equal(story.step, 4);
  assert.equal(story.completed, true);
  story.reset();
  assert.deepEqual(story, new FireEscapeStory());
});

test('collision loader accepts both gzip payloads and HTTP-decoded triangles', () => {
  const triangles = new Float32Array([0, 0, 0, 1, 0, 0, 0, 0, 1]);
  const plain = new Uint8Array(triangles.buffer);
  assert.deepEqual(collisionBytes(plain), triangles);
  assert.deepEqual(collisionBytes(gzipSync(plain)), triangles);
  assert.throws(() => collisionBytes(new Uint8Array([1, 2, 3])), /충돌 데이터/);
});
