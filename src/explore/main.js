import{installElevator}from './ElevatorSystem.js';
import{loadPackedModel}from './loadPackedModel.js';
import{DAYLIGHT,applySurfaceStability,isStableShell,daylightLights}from './RenderAppearance.js';
import{gunzipSync}from'three/addons/libs/fflate.module.js';
import{MeshoptDecoder}from'meshoptimizer';
import * as T from 'three';
import {GLTFLoader}from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment}from 'three/addons/environments/RoomEnvironment.js';
import {PCInput}from '../input/PCInput.js';
import {ExploreInteraction}from './ExploreInteraction.js';
import {CompactCollider}from './CompactCollider.js';
import {ExploreCollision}from './ExploreCollision.js';
import {installDoors}from './HingedDoors.js';
import {SmoothEye}from './SmoothEye.js';
import {OcclusionCuller}from './OcclusionCuller.js';
import './style.css';
const $=s=>document.querySelector(s);let noticeTimer;function notify(message){$('#notice').textContent=message;$('#notice').classList.add('visible');clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('#notice').classList.remove('visible'),4500);}
const EYE=1.6;const loading=(text,p)=>{$('#load-status').textContent=text;if(p!==undefined)$('#progress').style.width=`${p}%`;};
async function main(){
 const canvas=$('#scene'),renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=DAYLIGHT.exposure;renderer.localClippingEnabled=true;
 const scene=new T.Scene();scene.background=new T.Color('#c8d9df');const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment();scene.environment=pmrem.fromScene(room,.04).texture;scene.environmentIntensity=DAYLIGHT.environment;room.dispose();pmrem.dispose();scene.add(...daylightLights());
 const rig=new T.Group(),tracking=new T.Group(),camera=new T.PerspectiveCamera(70,innerWidth/innerHeight,DAYLIGHT.near,DAYLIGHT.far);scene.add(rig);rig.add(tracking);tracking.add(camera);camera.position.y=EYE;rig.position.set(40.4,5.7496,-9.486);camera.rotation.y=Math.PI/2;
 renderer.setAnimationLoop(()=>renderer.render(scene,camera));
 const collision=new ExploreCollision();let ready=false,world;
 function showPlaying(active){document.body.classList.toggle('playing',active);$('#menu').hidden=active;$('#hud').hidden=!active;$('#footer').hidden=active;}
 const modelBase=new URL('models/explore/',document.baseURI).href;
 const navigationPromise=fetch(modelBase+'navigation.json').then(r=>{if(!r.ok)throw Error('계단 경로 정보를 읽지 못했습니다.');return r.json();});
 const manifestPromise=fetch(modelBase+'doors.json').then(r=>{if(!r.ok)throw Error('문 분석 정보를 읽지 못했습니다.');return r.json();});const colliderPromise=fetch(modelBase+'collision.bin.gz').then(r=>{if(!r.ok)throw Error('충돌 데이터를 읽지 못했습니다.');return r.arrayBuffer().then(b=>gunzipSync(new Uint8Array(b)).buffer);});
 loading('학교 GLB를 불러오는 중… 처음 실행할 때는 시간이 걸릴 수 있습니다.',3);
 const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);const gltf=import.meta.env.VITE_PACKAGED_SCHOOL==='1'?await loadPackedModel(loader,modelBase,loading):await loader.loadAsync(modelBase+'render.glb',e=>{if(e.total)loading(`학교 GLB 불러오는 중 · ${Math.round(e.loaded/e.total*100)}%`,5+e.loaded/e.total*72);});
 applySurfaceStability(gltf.scene);const sampledTextures=new Set();gltf.scene.traverse(o=>{for(const m of(o.isMesh?(Array.isArray(o.material)?o.material:[o.material]):[]))for(const value of Object.values(m))if(value?.isTexture&&!sampledTextures.has(value)){sampledTextures.add(value);value.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);}});
 scene.add(gltf.scene);gltf.scene.updateMatrixWorld(true);loading('벽·바닥 충돌과 문을 연결하는 중…',82);await new Promise(requestAnimationFrame);
 const [manifest,colliderBuffer,navigation]=await Promise.all([manifestPromise,colliderPromise,navigationPromise]);collision.navigation=navigation;const collider=new CompactCollider(new Float32Array(colliderBuffer));collision.staticCollider=collider;collision.meshes.push(collider);
 const elevator=await installElevator({root:gltf.scene,scene,collision,rig,notify,assetURL:modelBase+'elevator.json'});
 const nodeObjects=new Map();gltf.scene.traverse(o=>{if(o.userData.originalNodeIndex!==undefined)nodeObjects.set(o.userData.originalNodeIndex,o);});const doors=installDoors(gltf.scene,manifest,nodeObjects,collision,notify),occluders=[];gltf.scene.traverse(o=>{if(o.isMesh&&!doors.movingMeshes.has(o))occluders.push(o);});
 // Original render data is not edited. Far-away batches are only culled while
 // walking; returning to the area restores them, like ordinary frustum culling.
 const bounds=occluders.map(o=>({o,box:new T.Box3().setFromObject(o,true)}));const spawn=new T.Vector3(...(new URLSearchParams(location.search).has('elevatorPreview')?[37.82,5.7496,10.8]:[36,5.7496,-6])),ground=collision.floorAt(spawn.x,spawn.z,spawn.y);if(ground!==null)spawn.y=ground;if(ground===null||collision.blocked(...spawn.toArray()))throw Error('안전한 교실 시작 위치를 확인하지 못했습니다.');rig.position.copy(spawn);
 world={root:gltf.scene,targets:[...doors.targets,...elevator.targets],ignoreOccluderHit:elevator.ignoreHit,occluders,doors:doors.doors,spawn,zone:p=>{const level=Math.max(1,Math.min(4,Math.round((p.y-2.6956)/3.05)+1));const room=p.z> -16&&p.z< -.2&&p.x>30&&p.x<42?(p.x>=38.72?'복도':'교실'):'학교 내부';return `${level}층 · ${collision.nearStair(p.x,p.z,p.y)?'계단':room}`;},update:doors.update,resetDoors:doors.reset};
 const occlusion=new OcclusionCuller(renderer,new URLSearchParams(location.search).get('occlusion')==='0'?[]:bounds.filter(({o})=>!isStableShell(o)));renderer.info.autoReset=false;
 const smoothEye=new SmoothEye(EYE);smoothEye.reset(spawn.y);
 const interaction=new ExploreInteraction(world,notify);interaction.ray.far=2.5;
 const posture={updatePC(p,c){collision.height=1.7;c.position.y=EYE;},toggle(){},reset(){collision.height=1.7;}};
 const pc=new PCInput(camera,canvas,interaction,showPlaying,posture);pc.yaw=new URLSearchParams(location.search).has('elevatorPreview')?Math.PI:0;pc.pitch=0;pc.onProtection=()=>true;pc.applyView();
 function reset(){smoothEye.reset(spawn.y);doors.reset();rig.position.copy(spawn);rig.rotation.set(0,0,0);tracking.position.set(0,0,0);posture.reset();pc.keys.clear();pc.yaw=new URLSearchParams(location.search).has('elevatorPreview')?Math.PI:0;pc.pitch=0;camera.position.set(0,EYE,0);pc.applyView();notify('교실 시작 위치로 돌아왔습니다.');}
 $('#pc').onclick=async()=>{if(!ready)return;posture.reset();const locked=await pc.start();if(!locked)notify('화면을 드래그해 시점을 돌릴 수 있습니다. Chrome·Edge에서는 마우스 잠금을 지원합니다.');};$('#reset').onclick=reset;document.addEventListener('keydown',e=>{if(e.code==='KeyR'&&pc.active&&!e.repeat)reset();});
 loading('화면과 셰이더를 준비하는 중…',95);await renderer.compileAsync(scene,camera);
 ready=true;$('#pc').disabled=false;$('#pc').textContent='시작하기';$('#loading').hidden=true;loading('준비 완료 · 교실에서 탐색을 시작합니다.',100);$('#door-report').textContent=`교실 출입문 ${doors.doors.filter(d=>d.config.motion!=='hinge').length}곳 · 외부 출입문 ${doors.doors.filter(d=>d.config.motion==='hinge').length}곳 · 원본 문짝으로 열기 / 닫기`;let previous=performance.now(),cullTimer=0;const diagnostics=new URLSearchParams(location.search).has('diagnostics'),drawScene=!(diagnostics&&new URLSearchParams(location.search).get('render')==='off');let perf=null,frameTimes=[];const gl=renderer.getContext(),gpuExtension=gl.getExtension('WEBGL_debug_renderer_info'),gpu=gpuExtension?gl.getParameter(gpuExtension.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);if(diagnostics){perf=document.createElement('output');perf.id='diagnostics';perf.style.cssText='position:fixed;right:15px;top:15px;z-index:99;background:#001c;color:#fff;padding:12px;font:12px monospace';document.body.append(perf);}
 renderer.setAnimationLoop(time=>{const elapsed=Math.max((time-previous)/1000,0),dt=Math.min(elapsed,.05);previous=time;const cpuStart=performance.now();pc.update(dt,rig,collision);smoothEye.update(dt,rig.position.y,camera);const body=rig.position;camera.updateMatrixWorld(true);const target=pc.active?interaction.fromCamera(camera):null;$('#hint').textContent=target?target.userData.interactionLabel():'';
 const physicsMs=performance.now()-cpuStart;doors.update(dt,body);elevator.update(dt,body,delta=>{smoothEye.reset(rig.position.y);});$('#zone').textContent=world.zone(body)+(new URLSearchParams(location.search).has('diagnostics')?` (${body.x.toFixed(2)},${body.y.toFixed(2)},${body.z.toFixed(2)}) ${pc.yaw.toFixed(2)} ${elevator.state.phase}`:'');if((cullTimer-=dt)<=0){cullTimer=.3;const p=camera.getWorldPosition(new T.Vector3());for(let{o,box}of bounds){const limit=100;o.userData.distanceVisible=o.material.opacity>0&&box.distanceToPoint(p)<limit+(o.userData.distanceVisible!==false?10:0);o.visible=o.userData.distanceVisible&&(o.userData.occlusionCell?.visible??true);}}occlusion.setEnabled(drawScene);if(drawScene)occlusion.update(camera,doors.doors.some(d=>Math.abs(d.progress-(d.open?1:0))>.001));renderer.info.reset();if(drawScene)renderer.render(scene,camera);if(drawScene)occlusion.render(camera);if(perf){if(elapsed>0&&elapsed<1)frameTimes.push(elapsed);if(frameTimes.length>120)frameTimes.shift();const avg=frameTimes.reduce((a,b)=>a+b,0)/frameTimes.length;perf.textContent=`${(1/avg).toFixed(1)} FPS · ${renderer.info.render.calls} calls · ${renderer.info.render.triangles.toLocaleString()} triangles · CPU ${(performance.now()-cpuStart).toFixed(1)}ms / 이동 ${physicsMs.toFixed(1)}ms · 발높이 ${body.y.toFixed(3)}m · ${document.visibilityState}/${document.hasFocus()?'focus':'unfocused'} · ${gpu}`;}});
 window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});window.schoolExplore={renderer,scene,rig,camera,collision,world,interaction,pc,doors,elevator,reset};
}
main().catch(e=>{console.error(e);$('#loading').hidden=false;loading(`불러오기 실패 · ${e.message}`,0);$('#support').textContent='로컬 서버와 모델 파일 경로를 확인한 뒤 다시 불러와 주세요.';$('#pc').disabled=true;$('#retry').hidden=false;});$('#retry').onclick=()=>location.reload();
