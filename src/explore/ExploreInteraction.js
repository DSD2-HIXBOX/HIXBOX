import * as T from 'three';
import {InteractionSystem}from '../core/InteractionSystem.js';
// After a door opens, its leaves leave the crosshair. Keep E usable while
// looking at the same clear doorway, so a second press closes it naturally.
export class ExploreInteraction extends InteractionSystem {
 fromCamera(camera){const hit=super.fromCamera(camera);if(hit)return hit;const origin=new T.Vector3(),direction=new T.Vector3();camera.getWorldPosition(origin);camera.getWorldDirection(direction);let best=null,bestDistance=this.ray.far;
 for(const d of this.world.doors??[]){if(!d.open&&d.progress<.01)continue;const cfg=d.config,goal=new T.Vector3(d.openingCenter?.x??(cfg.min[0]+cfg.max[0])/2,T.MathUtils.clamp(origin.y,cfg.min[1]+.15,cfg.max[1]-.15),d.openingCenter?.z??(cfg.min[2]+cfg.max[2])/2),to=goal.clone().sub(origin),distance=to.length();if(distance>bestDistance||distance<.01||direction.dot(to.normalize())<.82)continue;const check=new T.Raycaster(origin,to,0,distance-.04),blocked=check.intersectObjects(this.world.occluders??[],false).some(h=>!(h.object.material?.transparent&&h.object.material.opacity<.3));if(!blocked){bestDistance=distance;best=d.leaves[0].pivot;}}
 this.current=best;return best;
 }
}
