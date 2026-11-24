import * as T from 'three';
// Camera-relative arms animate around the head; the camera never moves.
export class HeadProtection {
 constructor(camera){
  this.root=new T.Group();this.root.name='양팔 머리 보호';camera.add(this.root);this.progress=0;this.arms=[];
  const sleeve=new T.MeshStandardMaterial({color:0x58636a,roughness:.9}),skin=new T.MeshStandardMaterial({color:0xc99d80,roughness:.85});this.materials=[sleeve,skin];
  for(const side of [-1,1]){const upper=new T.Mesh(new T.CylinderGeometry(.036,.043,1,8),sleeve),fore=new T.Mesh(new T.CylinderGeometry(.027,.034,1,8),sleeve),hand=new T.Mesh(new T.SphereGeometry(1,10,8),skin);hand.scale.set(.045,.026,.065);this.root.add(upper,fore,hand);this.arms.push({side,upper,fore,hand});}
  this.axis=new T.Vector3(0,1,0);this.direction=new T.Vector3();this.root.visible=false;
 }
 segment(mesh,a,b){mesh.position.copy(a).add(b).multiplyScalar(.5);this.direction.copy(b).sub(a);mesh.scale.y=this.direction.length();mesh.quaternion.setFromUnitVectors(this.axis,this.direction.normalize());}
 update(dt,protecting,visible=true){this.progress=T.MathUtils.damp(this.progress,protecting?1:0,11,dt);if(this.progress<.001)this.progress=0;this.root.visible=visible&&this.progress>0;
  for(const {side,upper,fore,hand} of this.arms){const shoulder=new T.Vector3(side*.23,-.26,-.065),elbow=new T.Vector3(side*.29,T.MathUtils.lerp(-.36,-.055,this.progress),-.27),wrist=new T.Vector3(side*T.MathUtils.lerp(.23,.08,this.progress),T.MathUtils.lerp(-.43,.115,this.progress),T.MathUtils.lerp(-.35,-.25,this.progress));this.segment(upper,shoulder,elbow);this.segment(fore,elbow,wrist);hand.position.copy(wrist);hand.rotation.set(-.25,side*.4,side*.4);}
 }
 reset(){this.progress=0;this.root.visible=false;}
 dispose(){this.root.traverse(o=>o.geometry?.dispose());this.materials.forEach(m=>m.dispose());this.root.removeFromParent();}
}
