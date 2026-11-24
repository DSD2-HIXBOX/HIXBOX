// Both input modes use the same height checks. Never stand through a desktop.
export const STANDING_HEIGHT=1.7;
export const CRAWL_HEIGHT=.46;
export const CRAWL_EYE=.40;
export class PlayerPosture {
 constructor(collision){this.collision=collision;this.requested=false;this.crouched=false;}
 toggle(){this.requested=!this.requested;}
 updatePC(position,camera,dt){const desired=this.requested?CRAWL_HEIGHT:STANDING_HEIGHT;const changed=this.collision.setHeight(position,desired);this.crouched=this.collision.height<1;const eye=this.crouched?CRAWL_EYE:1.65;
 // Drop immediately before moving under furniture; rise smoothly after clearance.
 camera.position.y=eye<camera.position.y?eye:Math.min(eye,camera.position.y+dt*3);return changed;
 }
 updateVR(position,headHeight){const height=Math.max(.38,Math.min(2.2,headHeight+.055));return this.collision.setHeight(position,height);}
 reset(){this.requested=false;this.crouched=false;this.collision.height=STANDING_HEIGHT;}
}
