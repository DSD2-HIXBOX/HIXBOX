// Smooth only virtual PC floor travel. Never filter tracked XR head rotation/pose.
export class SmoothEye {
 constructor(height=1.6){this.height=height;this.eyeY=null;}
 reset(floor){this.eyeY=floor+this.height;}
 update(dt,floor,camera){const target=floor+this.height;if(this.eyeY===null||Math.abs(target-this.eyeY)>1)this.eyeY=target;else this.eyeY+= (target-this.eyeY)*(1-Math.exp(-18*dt));camera.position.y=this.eyeY-floor;}
}
