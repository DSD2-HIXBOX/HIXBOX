export const INTRO_SECONDS = 6;
export const ANNOUNCEMENT_SECONDS = 10;
export const WINDOW_SECONDS = 1.2;

export class FireEscapeStory {
  constructor() {
    this.reset();
  }

  reset() {
    this.step = 1;
    this.elapsed = 0;
    this.alarm = false;
    this.announced = false;
    this.smokeSeconds = 0;
    this.windowFocus = 0;
    this.completed = false;
    this.lowering = false;
  }

  lower(doorOpened = false) {
    if (this.lowering || (this.step !== 4 && !(this.alarm && doorOpened))) return false;
    this.lowering = true;
    return true;
  }

  get canSelectBelongings() {
    return this.alarm && this.step <= 2;
  }

  update(dt, {nearDoor, doorOpened = false, lookingAtWindow, lowReady, announcementPlaying = false}) {
    this.elapsed += dt;
    if (this.alarm) this.smokeSeconds += dt;
    if (this.step === 1) {
      if (this.elapsed >= INTRO_SECONDS) this.alarm = true;
      if (this.elapsed >= INTRO_SECONDS + ANNOUNCEMENT_SECONDS && !announcementPlaying) {
        this.announced = true;
        this.step = 2;
      }
    } else if (this.step === 2 && (nearDoor || doorOpened)) {
      this.step = 3;
    } else if (this.step === 3) {
      this.windowFocus = lookingAtWindow ? Math.min(WINDOW_SECONDS, this.windowFocus + dt) : 0;
      if (this.windowFocus >= WINDOW_SECONDS) this.step = 4;
    } else if (this.step === 4 && this.lowering && lowReady) {
      this.completed = true;
    }
  }
}
