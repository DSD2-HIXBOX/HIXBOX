import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import './style.css';
import {EvacuationStep} from './story/EvacuationStep.js';
import {HeadProtection} from './story/HeadProtection.js';
import {ShelterStep} from './story/ShelterStep.js';
import {EarthquakeStory} from './story/EarthquakeStory.js';
import {CollisionWorld} from './core/CollisionWorld.js';
import {InteractionSystem} from './core/InteractionSystem.js';
import {loadEnvironment} from './world/loadEnvironment.js';
import {PCInput} from './input/PCInput.js';
import {PlayerPosture} from './core/PlayerPosture.js';
import {VRInput} from './input/VRInput.js';
const $=s=>document.querySelector(s),canvas=$('#scene');
let timer;function notify(message){$('#notice').textContent=message;$('#notice').classList.add('visible');clearTimeout(timer);timer=setTimeout(()=>$('#notice').classList.remove('visible'),6500);}
async function main(){
 const quest=/OculusBrowser|Quest/i.test(navigator.userAgent);const renderer=new THREE.WebGLRenderer({canvas,antialias:!quest,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=!quest;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;renderer.xr.enabled=true;renderer.xr.setReferenceSpaceType('local-floor');renderer.xr.setFramebufferScaleFactor(.9);
 const scene=new THREE.Scene();const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();scene.environment=pmrem.fromScene(room,.04, .1,100).texture;scene.environmentIntensity=.5;room.dispose();pmrem.dispose();scene.background=new THREE.Color(0xc6d5d9);scene.fog=new THREE.Fog(0xc6d5d9,40,95);
 // Shared ambient fill softens the contrast across the common doorway. No
 // zone-specific exposure or extra dynamic lights are needed on Quest.
 scene.add(new THREE.HemisphereLight(0xe8f2ff,0xa59980,2.3));const sun=new THREE.DirectionalLight(0xfff0d3,2.8);sun.position.set(12,24,15);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-23,right:23,top:23,bottom:-23,near:.5,far:70});sun.shadow.normalBias=.035;sun.shadow.bias=-.0003;sun.target.position.set(-3,4.4,12);scene.add(sun,sun.target);
 $('#pc').disabled=true;$('#pc').textContent='학교 공간 로딩 중…';
 const collision=new CollisionWorld();const world=await loadEnvironment(collision,{maxAnisotropy:renderer.capabilities.getMaxAnisotropy(),textureSize:quest?1024:2048});$('#pc').disabled=false;$('#pc').innerHTML='PC 체험 시작 <span>↗</span>';scene.add(world.root);
 const rig=new THREE.Group();scene.add(rig);const camera=new THREE.PerspectiveCamera(70,innerWidth/innerHeight,.05,120);camera.position.y=1.65;const trackingOrigin=new THREE.Group();rig.add(trackingOrigin);trackingOrigin.add(camera);rig.position.copy(world.spawn);
 const interaction=new InteractionSystem(world,notify);
 function showPlaying(active){document.body.classList.toggle('playing',active);$('#menu').hidden=active;$('#hud').hidden=!active;$('#footer').hidden=active;}
 const posture=new PlayerPosture(collision);const pc=new PCInput(camera,canvas,interaction,showPlaying,posture);pc.yaw=world.spawnYaw??.65;pc.pitch=world.spawnPitch??-.06;pc.applyView();const vr=new VRInput(renderer,rig,camera,collision,interaction,notify,posture,trackingOrigin);
 const protection=new HeadProtection(camera);const story=new EarthquakeStory({scene,camera,renderer,world,vr,notify});const step2=new ShelterStep({scene,camera,renderer,world,vr,pc,rig,collision,posture,story,onFailure(){if(!renderer.xr.isPresenting){pc.keys.clear();pc.dragMode=true;document.exitPointerLock();showPlaying(true);}},onRetry(){clearTimeout(timer);$('#notice').classList.remove('visible');story.audio.unlock();if(!renderer.xr.isPresenting)pc.start();}});const step3=new EvacuationStep({scene,camera,renderer,world,vr,pc,rig,collision,step2,story,notify});pc.onProtection=()=>step3.handleF();pc.onPrimary=()=>step2.failed||step2.handlePC()||story.handlePC();vr.onPrimary=(controller,index)=>step3.handleXR(controller,index)||step2.handleXR(controller,index);
 function reset(){clearTimeout(timer);$('#notice').classList.remove('visible');pc.resetProtection();protection.reset();step3.reset();story.reset();step2.reset();world.resetDoors?.();rig.position.copy(world.spawn);rig.rotation.set(0,0,0);posture.reset();camera.position.y=1.65;pc.yaw=world.spawnYaw??.65;pc.pitch=world.spawnPitch??-.06;if(!renderer.xr.isPresenting)pc.applyView();vr.reset();}
 document.addEventListener('keydown',e=>{if(e.code==='KeyR'&&pc.active&&!e.repeat)reset();});
 $('#pc').onclick=()=>{story.start();return pc.start().then(locked=>{if(!locked)notify('마우스 잠금이 제한되어 드래그 시점 모드로 시작합니다. 화면을 드래그해 둘러보세요. Chrome/Edge에서는 일반 FPS 조작을 사용할 수 있습니다.');});};$('#reset').onclick=reset;
 let supported=false;async function checkXR(){try{supported=!!navigator.xr&&await navigator.xr.isSessionSupported('immersive-vr');$('#vr').disabled=!supported;$('#vr').textContent=supported?'VR 체험 시작 ↗':'VR 지원 환경 필요';$('#support').textContent=supported?'헤드셋을 착용하고 VR 체험을 시작하세요.':!isSecureContext?'VR은 HTTPS 또는 localhost에서 실행해야 합니다.':'Meta Quest 브라우저에서 HTTPS 주소를 열면 VR을 시작할 수 있습니다.';}catch{ $('#vr').textContent='VR 사용 불가';}}await checkXR();navigator.xr?.addEventListener('devicechange',checkXR);
 $('#vr').onclick=async()=>{if(!supported)return;story.audio.unlock();try{pc.dragMode=false;document.exitPointerLock();const session=await navigator.xr.requestSession('immersive-vr',{requiredFeatures:['local-floor'],optionalFeatures:['bounded-floor']});reset();camera.position.set(0,0,0);camera.rotation.set(0,0,0);await renderer.xr.setSession(session);story.start();showPlaying(true);$('#hud').hidden=true;}catch(e){camera.position.y=1.65;showPlaying(false);notify(`VR을 시작할 수 없습니다: ${e.message}`);}};
 renderer.xr.addEventListener('sessionstart',()=>{renderer.setPixelRatio(1);renderer.shadowMap.enabled=false;vr.reset();});renderer.xr.addEventListener('sessionend',()=>{camera.position.set(0,1.65,0);renderer.shadowMap.enabled=!quest;renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));reset();showPlaying(false);});
 // Text feedback is also shown inside the headset, not only in the DOM overlay.
 const c=document.createElement('canvas');c.width=1024;c.height=256;const ctx=c.getContext('2d'),texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;const panel=new THREE.Mesh(new THREE.PlaneGeometry(1.35,.3375),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthTest:false}));panel.position.set(0,-.38,-1.5);panel.renderOrder=999;camera.add(panel);let lastText='';
 function vrText(text){if(text===lastText)return;lastText=text;ctx.clearRect(0,0,1024,256);ctx.fillStyle='rgba(25,43,35,.9)';ctx.fillRect(0,0,1024,256);ctx.fillStyle='#edf2e7';ctx.font='30px sans-serif';ctx.textAlign='center';const chars=[...text];let line='',lines=[];for(const ch of chars){if(ctx.measureText(line+ch).width>950){lines.push(line);line='';}line+=ch;}lines.push(line);lines.slice(0,5).forEach((l,i)=>ctx.fillText(l,512,48+i*40));texture.needsUpdate=true;}
 let previous=0;renderer.setAnimationLoop(time=>{const elapsed=Math.min((time-previous)/1000,1),dt=Math.min(elapsed,.05);previous=time;
 if(renderer.xr.isPresenting){vr.update(dt);panel.visible=!step2.active&&!story.raised&&!story.reading;vrText($('#notice').classList.contains('visible')?$('#notice').textContent:`${world.zone(vr.lastSafe)} · ${world.navigationHint?.(vr.lastSafe)||'왼쪽 스틱 이동 / 오른쪽 스틱 30° 회전 / 트리거 문 열기 / X 숙이기'}`);}else{panel.visible=false;if(!step2.failed)pc.update(dt,rig,collision);camera.updateMatrixWorld(true);const target=interaction.fromCamera(camera);$('#hint').textContent=pc.active?(story.hint|| (target?`E · ${target.userData.interactionLabel?.()??'안내 확인'}`:world.navigationHint?.(rig.position)||'')):'';}
 world.update?.(dt,renderer.xr.isPresenting?vr.lastSafe:rig.position);
 story.update(elapsed,(renderer.xr.isPresenting?renderer.xr.getSession()?.visibilityState==='visible':pc.active&&document.hasFocus())&&!document.hidden);
 protection.update(dt,pc.headProtected,pc.active&&!renderer.xr.isPresenting);$('#protection-status').hidden=!pc.headProtected||!pc.active||renderer.xr.isPresenting;
 step2.update(elapsed,story.active);step3.update(elapsed,story.active);if(pc.active&&!step3.active&&step2.hint)$('#hint').textContent=step2.hint;
 if(step3.active){if(pc.active&&step3.hint)$('#hint').textContent=step3.hint;$('#protection-status').hidden=!story.active||!step3.state.protected;$('#protection-status').firstChild.textContent='가방으로 머리 보호 중 ';$('#protection-status small').textContent=step3.state.phase==='corridor'?'가방 보호 유지':'F · 가방 내리기';}else{$('#protection-status').firstChild.textContent='머리 보호 중 ';$('#protection-status small').textContent='F · 보호 해제';}
 $('#story-state').textContent=step3.active?(step3.state.phase==='corridor'?'STEP 04 · 복도 진입':'STEP 03 · 가방 보호와 교실 탈출'):step2.active?({choosing:'STEP 02 · 안전 행동 선택',sheltered:'책상 아래 · 보호 자세 유지',settling:'흔들림이 약해지는 중',ready:'STEP 02 완료 · 다음 안내 대기',failed:'다시 선택하기'})[step2.state.phase]:({peaceful:'평온한 교실',alert:'긴급재난문자 · 스마트폰 확인',confirmed:'재난문자 확인 완료',earthquake:'지진 발생'})[story.clock.phase];
 $('#posture').textContent=collision.height<1?'숙인 상태 · 책상 아래 이동 가능':'서 있는 상태';
 $('#zone').textContent=world.zone(rig.position);renderer.render(scene,camera);
 });window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
 // Small read-only inspection hook for scene QA.
 window.schoolDebug={renderer,scene,rig,camera,collision,world,posture,story,step2,step3,protection};
}
main().catch(error=>{console.error(error);$('#support').textContent=`초기화 실패: ${error.message}`;$('#pc').disabled=true;$('#vr').disabled=true;});
