export class FireEscapeAudio {
  async preload() {
    const response = await fetch(new URL('./audio/fire-escape-announcement.mp3', document.baseURI));
    if (!response.ok) throw new Error('화재 안내 방송 파일을 불러오지 못했습니다.');
    this.announcementBytes = await response.arrayBuffer();
  }

  unlock() {
    this.context ??= new AudioContext();
    this.context.resume().catch(() => {});
    this.decoding ??= this.context.decodeAudioData(this.announcementBytes.slice(0));
    this.decoding.catch(error => console.error('화재 안내 방송을 재생할 수 없습니다.', error));
  }

  updateListener(camera) {
    if (!this.context) return;
    const listener = this.context.listener;
    const matrix = camera.matrixWorld.elements;
    listener.positionX.value = matrix[12];
    listener.positionY.value = matrix[13];
    listener.positionZ.value = matrix[14];
    listener.forwardX.value = -matrix[8];
    listener.forwardY.value = -matrix[9];
    listener.forwardZ.value = -matrix[10];
    listener.upX.value = matrix[4];
    listener.upY.value = matrix[5];
    listener.upZ.value = matrix[6];
  }

  playAlarm(position) {
    this.stop();
    const context = this.context;
    if (!context) return;
    const alarm = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    const source = context.createPanner();
    source.panningModel = 'HRTF';
    source.refDistance = 4;
    source.positionX.value = position.x;
    source.positionY.value = position.y;
    source.positionZ.value = position.z;
    alarm.connect(gain).connect(source).connect(context.destination);
    gain.gain.setValueAtTime(0, now);
    for (let pulse = 0; pulse < 9; pulse++) {
      const start = now + pulse * .85;
      const level = pulse < 2 ? .075 : .017;
      alarm.frequency.setValueAtTime(520, start);
      alarm.frequency.linearRampToValueAtTime(740, start + .32);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(level, start + .11);
      gain.gain.linearRampToValueAtTime(0, start + .45);
    }
    alarm.start(now);
    alarm.stop(now + 7.7);
    this.alarm = alarm;
    alarm.onended = () => {
      if (this.alarm === alarm) this.alarm = null;
    };

    this.announcing = true;
    this.decoding.then(buffer => {
      if (this.alarm !== alarm) return;
      const voice = context.createBufferSource();
      voice.buffer = buffer;
      voice.connect(context.destination);
      this.announcement = voice;
      voice.onended = () => {
        if (this.announcement !== voice) return;
        this.announcement = null;
        this.announcing = false;
      };
      voice.start(Math.max(context.currentTime, now + 1.4));
    }).catch(() => {
      if (this.alarm === alarm) this.announcing = false;
    });
  }

  select() {
    const context = this.context;
    if (context?.state !== 'running') return;
    this.selection?.stop();
    const tone = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    tone.frequency.value = 480;
    gain.gain.setValueAtTime(.036, now);
    gain.gain.exponentialRampToValueAtTime(.001, now + .11);
    tone.connect(gain).connect(context.destination);
    tone.start();
    tone.stop(now + .12);
    this.selection = tone;
    tone.onended = () => {
      if (this.selection === tone) this.selection = null;
    };
  }

  stop() {
    this.alarm?.stop();
    this.selection?.stop();
    this.announcement?.stop();
    this.alarm = null;
    this.selection = null;
    this.announcement = null;
    this.announcing = false;
  }
}
