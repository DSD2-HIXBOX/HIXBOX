import * as T from 'three';
export class ShelterEffects {
 constructor(scene,world){this.scene=scene;this.lockers=(world.storyObjects??[]).filter(o=>o.userData.shakeKind==='locker').map(o=>({o,rotation:o.rotation.clone()}));this.fragments=[];const geometry=new T.BoxGeometry(.13,.018,.11),material=new T.MeshStandardMaterial({color:0xbcb9ad,roughness:.95});for(let i=0;i<4;i++){const mesh=new T.Mesh(geometry,material);mesh.visible=false;scene.add(mesh);this.fragments.push(mesh);}this.geometry=geometry;this.material=material;this.reset();}
 warnDoor(door){this.drop={x:door.plane-.65,z:(door.z0+door.z1)/2,time:0};}
 reset(){this.drop=null;this.lean=0;for(const f of this.fragments){f.visible=false;f.position.set(0,0,0);f.rotation.set(0,0,0);}for(const {o,rotation}of this.lockers)o.rotation.copy(rotation);}
 update(dt,state,time){const target=state.phase==='failed'&&state.reason==='locker'?.09:0;this.lean=T.MathUtils.damp(this.lean,target,5,dt);for(const {o,rotation}of this.lockers){o.rotation.copy(rotation);o.rotation.x+=this.lean+(state.phase!=='ready'?.0025*Math.sin(time*7):0);}
  if(this.drop){this.drop.time+=dt;for(let i=0;i<this.fragments.length;i++){const mesh=this.fragments[i],t=Math.max(0,this.drop.time-i*.13);mesh.visible=true;mesh.position.set(this.drop.x+(i%2)*.17,Math.max(4.43,7.05-3.8*t*t),this.drop.z+(i-1.5)*.18);mesh.rotation.set(t*.8,t*.5,0);}}
 }
 dispose(){this.reset();for(const f of this.fragments)f.removeFromParent();this.geometry.dispose();this.material.dispose();}
}
