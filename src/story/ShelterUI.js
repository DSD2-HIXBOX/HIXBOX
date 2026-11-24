import * as T from 'three';
export class ShelterUI {
 constructor(camera,onRetry){
  this.element=document.createElement('section');this.element.id='step2-ui';this.element.setAttribute('aria-live','polite');this.element.innerHTML='<div class="step2-banner"><small>STEP 02 · 교실 내 안전 행동</small><p></p><span class="step2-time"></span><button type="button">다시 선택하기</button></div>';document.body.append(this.element);this.element.querySelector('button').onclick=onRetry;
  this.canvas=document.createElement('canvas');this.canvas.width=1024;this.canvas.height=512;this.texture=new T.CanvasTexture(this.canvas);this.texture.colorSpace=T.SRGBColorSpace;
  this.panel=new T.Mesh(new T.PlaneGeometry(1.25,.625),new T.MeshBasicMaterial({map:this.texture,transparent:true,depthTest:false,toneMapped:false}));this.panel.position.set(0,.15,-1.6);this.panel.renderOrder=1001;camera.add(this.panel);
  this.retry=new T.Mesh(new T.PlaneGeometry(.6,.14),new T.MeshBasicMaterial({transparent:true,opacity:0,depthTest:false}));this.retry.position.set(0,-.065,-1.59);camera.add(this.retry);this.retry.visible=false;this.ray=new T.Raycaster();this.ray.far=3;
 }
 update(state,xr,active,hint=''){const visible=state.phase!=='idle'&&active;this.element.hidden=!visible||xr;this.panel.visible=visible&&xr;this.retry.visible=visible&&xr&&state.phase==='failed';const key=state.phase+':'+state.message+':'+Math.ceil(state.remaining)+':'+hint;if(key===this.last)return;this.last=key;
  const failed=state.phase==='failed',success=['sheltered','settling','ready'].includes(state.phase);this.element.dataset.tone=failed?'danger':success?'safe':'neutral';this.element.querySelector('p').textContent=state.message;this.element.querySelector('.step2-time').textContent=state.phase==='choosing'?`남은 시간 ${Math.ceil(state.remaining)}초`:'';this.element.querySelector('button').hidden=!failed;
  const c=this.canvas.getContext('2d');c.clearRect(0,0,1024,512);c.fillStyle=failed?'rgba(75,30,27,.94)':success?'rgba(29,65,47,.92)':'rgba(28,39,42,.90)';c.fillRect(0,0,1024,failed?512:hint?360:250);c.fillStyle='#f1f1e9';c.font='24px sans-serif';c.fillText(`STEP 02${state.phase==='choosing'?` · ${Math.ceil(state.remaining)}초`:''}`,35,42);c.font='32px sans-serif';let line='',y=100;for(const ch of state.message){if(c.measureText(line+ch).width>950){c.fillText(line,35,y);line='';y+=44;}line+=ch;}c.fillText(line,35,y);
  if(!hint&&state.phase==='choosing'){c.font='22px sans-serif';c.fillText('스틱 이동 · X 몸 낮추기 · 트리거 상호작용',35,230);}
  if(hint&&!failed){c.font='26px sans-serif';let text='',row=285;for(const ch of hint){if(c.measureText(text+ch).width>950){c.fillText(text,35,row);text='';row+=34;}text+=ch;}c.fillText(text,35,row);}
  if(failed){c.fillStyle='#eeeadd';c.fillRect(268,376,488,108);c.fillStyle='#422e2a';c.textAlign='center';c.fillText('다시 선택하기',512,444);c.textAlign='left';}this.texture.needsUpdate=true;
 }
 hitRetry(controller){if(!this.retry.visible)return false;this.retry.updateWorldMatrix(true,false);const p=new T.Vector3(),q=new T.Quaternion();controller.getWorldPosition(p);controller.getWorldQuaternion(q);this.ray.set(p,new T.Vector3(0,0,-1).applyQuaternion(q));return this.ray.intersectObject(this.retry).length>0;}
 dispose(){this.element.remove();this.panel.removeFromParent();this.retry.removeFromParent();this.panel.geometry.dispose();this.panel.material.dispose();this.retry.geometry.dispose();this.retry.material.dispose();this.texture.dispose();}
}
