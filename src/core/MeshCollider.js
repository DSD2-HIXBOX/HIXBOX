import * as THREE from 'three';
// A static triangle collider preserves open space between desk legs and braces.
// Broad phase per mesh + triangle bounds keeps narrow phase local.
export class MeshCollider {
 constructor(mesh){this.name=mesh.name;
  mesh.updateWorldMatrix(true,false);this.bounds=new THREE.Box3().setFromObject(mesh,true);this.triangles=[];
  const p=mesh.geometry.attributes.position,indices=mesh.geometry.index;
  const vertex=i=>new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);
  for(let i=0;i<(indices?.count??p.count);i+=3){const v=[0,1,2].map(j=>vertex(indices?indices.getX(i+j):i+j));const triangle=new THREE.Triangle(...v);this.triangles.push({triangle,bounds:new THREE.Box3().setFromPoints(v)});}
 }
 intersects(x,y,z,height,radius){
  const body=new THREE.Box3(new THREE.Vector3(x-radius,y+.025,z-radius),new THREE.Vector3(x+radius,y+height,z+radius));
  if(!this.bounds.intersectsBox(body))return false;
  const a=new THREE.Vector3(x,y+radius,z),b=new THREE.Vector3(x,y+Math.max(radius,height-radius),z),line=new THREE.Line3(a,b);
  const point=new THREE.Vector3(),normal=new THREE.Vector3(),plane=new THREE.Plane();
  for(const item of this.triangles){if(!item.bounds.intersectsBox(body))continue;const t=item.triangle;t.getPlane(plane);if(plane.intersectLine(line,point)&&t.containsPoint(point))return true;
   if(t.closestPointToPoint(a,point).distanceToSquared(a)<radius*radius-1e-7||t.closestPointToPoint(b,point).distanceToSquared(b)<radius*radius-1e-7)return true;
   for(const [c,d] of [[t.a,t.b],[t.b,t.c],[t.c,t.a]])if(segmentDistanceSquared(a,b,c,d)<radius*radius-1e-7)return true;
  }return false;
 }
}
// Closest distance between two finite line segments (including degenerate edges).
function segmentDistanceSquared(p1,q1,p2,q2){
 const d1=q1.clone().sub(p1),d2=q2.clone().sub(p2),r=p1.clone().sub(p2),a=d1.lengthSq(),e=d2.lengthSq(),f=d2.dot(r);let s=0,t=0;
 if(a<=1e-12&&e<=1e-12)return r.lengthSq();
 if(a<=1e-12)t=THREE.MathUtils.clamp(f/e,0,1);
 else{const c=d1.dot(r);if(e<=1e-12)s=THREE.MathUtils.clamp(-c/a,0,1);else{const b=d1.dot(d2),denom=a*e-b*b;s=denom!==0?THREE.MathUtils.clamp((b*f-c*e)/denom,0,1):0;t=(b*s+f)/e;if(t<0){t=0;s=THREE.MathUtils.clamp(-c/a,0,1);}else if(t>1){t=1;s=THREE.MathUtils.clamp((b-c)/a,0,1);}}}
 return p1.clone().addScaledVector(d1,s).distanceToSquared(p2.clone().addScaledVector(d2,t));
}
