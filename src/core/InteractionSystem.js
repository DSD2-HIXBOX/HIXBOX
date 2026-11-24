import * as THREE from 'three';
export class InteractionSystem {
 constructor(world,notify){this.world=world;this.notify=notify;this.ray=new THREE.Raycaster();this.ray.far=2.5;this.current=null;}
 fromCamera(camera){this.ray.setFromCamera(new THREE.Vector2(),camera);return this.query();}
 fromController(controller){const origin=new THREE.Vector3(),q=new THREE.Quaternion();controller.getWorldPosition(origin);controller.getWorldQuaternion(q);this.ray.set(origin,new THREE.Vector3(0,0,-1).applyQuaternion(q));return this.query();}
 query(){// Test the entire scene so walls cannot be interacted through.
 this.current=null;const candidates=this.ray.intersectObjects(this.world.targets??[],true);if(!candidates.length)return null;const hits=this.world.occluders?[...candidates,...this.ray.intersectObjects(this.world.occluders,false)].sort((a,b)=>a.distance-b.distance):this.ray.intersectObject(this.world.root,true);
 for(const hit of hits){if(this.world.ignoreOccluderHit?.(hit))continue;if(hit.object.material?.transparent&&hit.object.material.opacity<.3)continue;let o=hit.object;while(o&&!o.userData.interaction)o=o.parent;if(o)this.current=o;break;}return this.current;}
 activate(target=this.current){if(target){if(target.userData.onInteract)target.userData.onInteract(this.notify);else this.notify(target.userData.interaction);}}
}
