import * as T from 'three';
import {Phone} from './Phone.js';
import {StoryAudio} from './StoryAudio.js';
import {StoryTimeline,phoneInView} from './StoryTimeline.js';
export class EarthquakeStory {
 constructor({scene,camera,renderer,world,vr,notify}){
  Object.assign(this,{scene,camera,renderer,world,vr,notify});this.phone=new Phone();this.audio=new StoryAudio();this.clock=new StoryTimeline(e=>this.event(e));this.started=false;this.active=false;this.raised=false;this.raise=0;this.dwell=0;
  camera.add(this.phone.root);this.phone.root.visible=false;
  this.movers=(world.storyObjects??[]).map((o,i)=>({o,base:o.position.clone(),phase:o.userData.shakePhase??i*1.73}));this.baseLight=scene.environmentIntensity;
  this.dust=new T.Points(new T.BufferGeometry(),new T.PointsMaterial({color:0xcfc6b6,size:.012,transparent:true,opacity:0,depthWrite:false}));const p=new Float32Array(96*3);for(let i=0;i<96;i++){p[i*3]=-3.7+Math.random()*7.2;p[i*3+1]=4.6+Math.random()*2.65;p[i*3+2]=-9.6+Math.random()*9.2;}this.dust.geometry.setAttribute('position',new T.BufferAttribute(p,3));this.dust.visible=false;scene.add(this.dust);
  this.head=new T.Vector3();this.forward=new T.Vector3();this.pos=new T.Vector3();this.normal=new T.Vector3();this.q=new T.Quaternion();
 }
 start(){this.audio.unlock();this.started=true;}
 reset(){this.clock.reset();this.raised=false;this.raise=0;this.dwell=0;this.phone.draw('peaceful');this.restore();this.audio.reset();}
 event(e){if(e==='alert'){this.phone.draw('alert');this.audio.alert();this.notify(this.renderer.xr.isPresenting?'재난문자가 도착했습니다. 오른손을 들어 화면을 바라보세요.':'재난문자가 도착했습니다. E 키로 스마트폰을 확인하세요.');const source=this.vr.rightHand?.source;const actuator=source?.gamepad?.hapticActuators?.[0]??source?.gamepad?.vibrationActuator;try{const result=actuator?.pulse?actuator.pulse(.45,180):actuator?.playEffect?.('dual-rumble',{duration:180,strongMagnitude:.45,weakMagnitude:.3});result?.catch(()=>{});}catch{}}
  if(e==='confirmed'){this.phone.draw('confirmed');this.notify('재난문자를 확인했습니다.');}
  if(e==='earthquake'){this.raised=false;this.notify('지진 발생 · 주변 물체가 흔들리고 있습니다.');}
 }
 handlePC(){if(!this.started)return false;if(this.clock.phase==='alert'){this.raised=true;return true;}if(this.raised){this.raised=false;return true;}return false;}
 get hint(){return this.clock.phase==='alert'?(this.raised?'재난문자 확인 중…':'E · 스마트폰 재난문자 확인'):this.raised?'E · 스마트폰 내리기':'';}
 restore(){for(const m of this.movers)m.o.position.copy(m.base);this.scene.environmentIntensity=this.baseLight;this.dust.visible=false;}
 update(dt,active){
  const phaseBefore=this.clock.phase,wasActive=this.active;this.active=active&&this.started;if(!wasActive)dt=0;this.clock.update(dt,this.active);const xr=this.renderer.xr.isPresenting,phone=this.phone.root,hand=this.vr.rightHand;
  if(xr&&hand){if(phone.parent!==hand.grip){hand.grip.add(phone);phone.position.set(0,.055,-.07);phone.rotation.set(-.45,0,0);phone.scale.setScalar(1);}}
  else if(!xr){if(phone.parent!==this.camera){this.camera.add(phone);phone.rotation.set(0,0,0);}this.raise=T.MathUtils.damp(this.raise,this.raised?1:0,9,dt);const aspect=this.camera.aspect,lowerX=Math.min(.38,.55*Math.tan(T.MathUtils.degToRad(35))*aspect*.65);phone.position.set(T.MathUtils.lerp(lowerX,.085,this.raise),T.MathUtils.lerp(-.20,-.015,this.raise),T.MathUtils.lerp(-.55,-.31,this.raise));phone.scale.setScalar(T.MathUtils.lerp(1,1.4,this.raise));}
  phone.visible=this.active&&(!xr||!!hand);
  let looking=false;
  if(this.active){
   if(xr&&hand&&hand.grip.visible){this.scene.updateMatrixWorld(true);const head=this.renderer.xr.getCamera();head.getWorldPosition(this.head);head.getWorldDirection(this.forward);phone.getWorldPosition(this.pos);phone.getWorldQuaternion(this.q);this.normal.set(0,0,1).applyQuaternion(this.q);looking=phoneInView(this.head,this.forward,this.pos,this.normal);}
   else looking=this.raised&&this.raise>.95;
   this.reading=looking;if(this.clock.phase==='alert'){this.dwell=looking?this.dwell+(phaseBefore==='alert'?dt:0):0;if(this.dwell>=.75)this.clock.confirm();}
  }
  const quake=this.clock.phase==='earthquake',t=this.clock.quakeTime,envelope=Math.min(1,t/1.5)*(this.quakeScale??1);
  if(this.active&&quake){for(const m of this.movers){m.o.position.x=m.base.x+envelope*(m.o.userData.shakeKind==='locker'?.014:.008)*Math.sin(t*(m.o.userData.shakeKind==='locker'?9:23)+m.phase);m.o.position.z=m.base.z+envelope*.006*Math.sin(t*29+m.phase);}
   this.scene.environmentIntensity=this.baseLight*(1-envelope*(.045+.025*Math.sin(t*11)));this.dust.visible=envelope>0&&this.world.zone(this.world.player??this.world.spawn).includes('교실');this.dust.material.opacity=.15*envelope;this.dust.position.x=.025*Math.sin(t*.7);this.dust.position.y=-.025*(t%7);
  }
  this.audio.update(this.active,quake,t,this.quakeScale??1);
 }
 dispose(){this.restore();this.phone.root.removeFromParent();this.phone.dispose();this.dust.geometry.dispose();this.dust.material.dispose();this.dust.removeFromParent();this.audio.dispose();}
}
