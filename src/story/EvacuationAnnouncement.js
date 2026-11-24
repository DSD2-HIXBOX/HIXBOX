export const EVACUATION_MESSAGE='흔들림이 멈췄습니다. 주변의 위험을 확인하고 안전한 경로로 대피하세요.';
// A bundled Korean recording, played through the already-unlocked story audio.
export class EvacuationAnnouncement {
 constructor(audio){this.audio=audio;this.offset=0;this.requested=false;this.finished=false;this.bytes=fetch('/audio/step3-announcement.wav').then(r=>{if(!r.ok)throw new Error('방송 파일 로딩 실패');return r.arrayBuffer();}).catch(()=>null);}
 start(){this.reset();this.requested=true;}
 update(active){if(!this.requested)return;const c=this.audio.context;
  if(c&&!this.buffer&&!this.loading&&!this.finished&&!this.fallback){this.loading=true;this.bytes.then(bytes=>bytes?c.decodeAudioData(bytes):null).then(b=>{this.buffer=b;this.loading=false;if(!b)this.fallback=true;}).catch(()=>{this.loading=false;this.fallback=true;});}
  if(!active){this.pause();return;}
  if(this.buffer&&!this.source&&!this.finished){const source=c.createBufferSource();source.buffer=this.buffer;source.connect(this.audio.master);source.onended=()=>{if(this.source===source){this.source=null;this.finished=true;}};this.source=source;this.startedAt=c.currentTime;source.start(0,Math.min(this.offset,this.buffer.duration));}
  if(this.fallback&&!this.finished&&globalThis.speechSynthesis){const u=new SpeechSynthesisUtterance(EVACUATION_MESSAGE);u.lang='ko-KR';u.rate=.9;speechSynthesis.speak(u);this.finished=true;}
 }
 pause(){if(this.source){const source=this.source;this.offset+=this.audio.context.currentTime-this.startedAt;this.source=null;source.stop();}}
 reset(){this.pause();this.offset=0;this.finished=false;this.requested=false;}
}
