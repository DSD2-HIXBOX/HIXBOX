import * as T from 'three';
// Extract the largest horizontal wooden face per actual desk assembly. Chair
// seats/backrests in the same source mesh are lower/smaller and are not shelters.
export function buildSafetyGeometry(meshes,collision){
 const desks=[],lockerBounds=new T.Box3(),v=new T.Vector3();
 for(const mesh of meshes){if(mesh.userData.kind!=='classroom')continue;
  if(/\/Locker_/.test(mesh.userData.role))lockerBounds.union(new T.Box3().setFromObject(mesh,true));
  if(!/\/Desk_/.test(mesh.userData.role)||mesh.material.name!=='CR_wood_Laminate_C01_120cm')continue;
  const p=mesh.geometry.attributes.position,idx=mesh.geometry.index,bins=new Map();
  for(let i=0;i<idx.count;i+=3){const a=new T.Vector3().fromBufferAttribute(p,idx.getX(i)).applyMatrix4(mesh.matrixWorld),b=new T.Vector3().fromBufferAttribute(p,idx.getX(i+1)).applyMatrix4(mesh.matrixWorld),c=new T.Vector3().fromBufferAttribute(p,idx.getX(i+2)).applyMatrix4(mesh.matrixWorld),n=b.clone().sub(a).cross(c.clone().sub(a));if(n.y<=0||n.y/n.length()<.98)continue;const y=(a.y+b.y+c.y)/3;if(y<4.95||y>5.35)continue;const key=Math.round(y*100),bin=bins.get(key)??{area:0,bounds:new T.Box3(),y};bin.area+=n.length()/2;bin.bounds.expandByPoint(a).expandByPoint(b).expandByPoint(c);bins.set(key,bin);}
  const top=[...bins.values()].sort((a,b)=>b.area-a.area)[0];if(!top||top.area<.18)continue;
  const box=top.bounds,center=box.getCenter(new T.Vector3()),floor=collision.floorAt(center.x,center.z,4.4);if(floor===null||top.y-floor<.62)continue;
  const old=collision.height;collision.height=.46;const safePoint=[0,.04,.07,-.04].map(dz=>({x:center.x,z:center.z+dz})).find(p=>p.z>box.min.z+.11&&p.z<box.max.z-.11&&!collision.blocked(p.x,floor,p.z));const clear=!!safePoint;collision.height=old;if(!clear)continue;
  // Original rubber foot vertices locate the leg shafts; do not invent legs.
  const feet=meshes.filter(o=>o.userData.role.slice(0,o.userData.role.lastIndexOf('/'))===mesh.userData.role.slice(0,mesh.userData.role.lastIndexOf('/'))&&o.material.name==='CR_blackPla'),points=[];
  for(const foot of feet){const attr=foot.geometry.attributes.position;for(let i=0;i<attr.count;i++){v.fromBufferAttribute(attr,i).applyMatrix4(foot.matrixWorld);if(v.y>floor+.055||v.x<box.min.x-.025||v.x>box.max.x+.025||v.z<box.min.z-.025||v.z>box.max.z+.025)continue;let cluster=points.find(p=>Math.hypot(p.x-v.x,p.z-v.z)<.07);if(!cluster)points.push(cluster={x:v.x,z:v.z,count:1});else{cluster.x+=(v.x-cluster.x)/++cluster.count;cluster.z+=(v.z-cluster.z)/cluster.count;}}}
  const tableFeet=points.filter(p=>Math.min(p.x-box.min.x,box.max.x-p.x)<.09);if(!tableFeet.length)continue;
  desks.push({id:`desk-${mesh.userData.sourceNode}`,minX:box.min.x,maxX:box.max.x,minZ:box.min.z,maxZ:box.max.z,safePoint,top:top.y,underside:top.y-.04,floor,legs:tableFeet.map(p=>({x:p.x,z:p.z,y0:floor+.06,y1:top.y-.07}))});
 }
 return {desks,lockers:lockerBounds.isEmpty()?[]:[{id:'rear-lockers',min:lockerBounds.min.clone(),max:lockerBounds.max.clone()}]};
}
