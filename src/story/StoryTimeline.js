// Deterministic, active-time clock: no setTimeout or dependence on frame rate.
export class StoryTimeline {
 constructor(onEvent=()=>{}){this.onEvent=onEvent;this.reset();}
 reset(){this.phase='peaceful';this.elapsed=0;this.confirmedAt=null;this.quakeTime=0;}
 update(dt,active){if(!active)return;this.elapsed+=Math.max(0,dt);if(this.phase==='peaceful'&&this.elapsed>=3){this.phase='alert';this.onEvent('alert');}if(this.phase==='confirmed'&&this.elapsed-this.confirmedAt>=2){this.phase='earthquake';this.onEvent('earthquake');}if(this.phase==='earthquake')this.quakeTime=Math.max(0,this.elapsed-this.confirmedAt-2);}
 confirm(){if(this.phase!=='alert')return false;this.phase='confirmed';this.confirmedAt=this.elapsed;this.onEvent('confirmed');return true;}
}
export function phoneInView(head,forward,phone,normal){
 const dx=phone.x-head.x,dy=phone.y-head.y,dz=phone.z-head.z,d=Math.hypot(dx,dy,dz);
 if(d<.22||d>.85||dy<-.45)return false;
 return (forward.x*dx+forward.y*dy+forward.z*dz)/d>Math.cos(14*Math.PI/180)&&-(normal.x*dx+normal.y*dy+normal.z*dz)/d>.5;
}
