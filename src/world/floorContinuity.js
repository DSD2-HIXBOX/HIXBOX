import * as THREE from 'three';

export function classroomFloor(gltf){
 let floor;
 gltf.parser.associations.forEach((a,o)=>{if(a.nodes===4)floor=o;});
 if(!floor?.isMesh)throw new Error('Classroom floor node 4 is missing.');
 return floor;
}
// Supported GLTFLoader material hook: reuse before loading unused corridor maps.
export function reuseFloorMaterial(material){
 return parser=>({name:'SchoolSharedFloor',loadMaterial(index){
  return parser.json.materials[index]?.name==='Floor'?Promise.resolve(material):null;
 }});
}

// Preserve the original classroom's slightly uneven UV rows. A single affine
// projection would slip at the two doors because those rows are not equidistant.
export function floorProjection(source){
 source.updateWorldMatrix(true,false);
 const p=source.geometry.attributes.position,uv=source.geometry.attributes.uv;
 const bounds=new THREE.Box3().setFromObject(source,true),rows=[];
 for(let i=0;i<p.count;i++){
  const v=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(source.matrixWorld);
  if(Math.abs(v.x-bounds.max.x)<1e-5)rows.push({z:v.z,v:uv.getY(i)});
 }
 rows.sort((a,b)=>a.z-b.z);
 const unique=rows.filter((r,i)=>i===0||Math.abs(r.z-rows[i-1].z)>1e-6);
 if(unique.length<2)throw new Error('Classroom floor UV edge requires at least two rows.');
 function at(x,z){
  let i=0;while(i<unique.length-2&&z>unique[i+1].z)i++;
  const a=unique[i],b=unique[i+1],t=(z-a.z)/(b.z-a.z);
  return new THREE.Vector2((x-bounds.min.x)/(bounds.max.x-bounds.min.x),THREE.MathUtils.lerp(a.v,b.v,t));
 }
 return {bounds,rows:unique,at};
}
function split(poly,z,positive){
 const result=[];
 for(let i=0;i<poly.length;i++){
  const a=poly[i],b=poly[(i+1)%poly.length],da=(a.z-z)*(positive?1:-1),db=(b.z-z)*(positive?1:-1);
  if(da>=-1e-9)result.push(a);
  if((da>1e-9&&db< -1e-9)||(da< -1e-9&&db>1e-9))result.push(a.clone().lerp(b,da/(da-db)));
 }return result;
}
export function matchCorridorFloor(source,target,{height=3.2,maxAnisotropy=4}={}){
 const projection=floorProjection(source);
 target.updateWorldMatrix(true,false);
 const original=target.geometry,p=original.attributes.position,index=original.index;
 const bounds=new THREE.Box3().setFromObject(target,true),inverse=target.matrixWorld.clone().invert();
 const worldNormal=new THREE.Vector3(0,1,0),localNormal=worldNormal.clone().applyMatrix3(new THREE.Matrix3().getNormalMatrix(target.matrixWorld).invert()).normalize();
 const positions=[],normals=[],uvs=[],cuts=projection.rows.map(r=>r.z);
 const vertices=Array.from({length:p.count},(_,i)=>{
  const v=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(target.matrixWorld);
  // Correct only micrometre-scale source export drift. Keep the corridor outline.
  if(Math.abs(v.x-bounds.min.x)<1e-5)v.x=projection.bounds.max.x;
  if(Math.abs(v.x-bounds.max.x)<1e-5)v.x=bounds.max.x;
  v.y=height;return v;
 });
 // Weld export's sub-micrometre cracks between its three original floor strips.
 const levels=[];
 for(const vertex of vertices){const level=levels.find(z=>Math.abs(z-vertex.z)<1e-5);if(level===undefined)levels.push(vertex.z);else vertex.z=level;}
 for(let i=0;i<(index?.count??p.count);i+=3){let polygons=[[0,1,2].map(j=>vertices[index?index.getX(i+j):i+j])];
  for(const z of cuts){polygons=polygons.flatMap(poly=>{
   if(poly.every(v=>v.z>=z-1e-8)||poly.every(v=>v.z<=z+1e-8))return [poly];
   return [split(poly,z,true),split(poly,z,false)].filter(poly=>poly.length>=3);
  });}
  for(const poly of polygons)for(let j=1;j<poly.length-1;j++){
   const tri=[poly[0],poly[j],poly[j+1]];
   if(new THREE.Triangle(...tri).getArea()<1e-10)continue;
   for(const world of tri){const local=world.clone().applyMatrix4(inverse),uv=projection.at(world.x,world.z);positions.push(...local.toArray());normals.push(...localNormal.toArray());uvs.push(uv.x,uv.y);}
  }
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.computeBoundingBox();geometry.computeBoundingSphere();
 target.geometry=geometry;target.material=source.material;target.receiveShadow=source.receiveShadow=true;
 // One existing 512px image/material; no duplicate maps, shaders or draw calls.
 const map=source.material.map;if(map){const anisotropy=Math.max(1,Math.min(4,maxAnisotropy));if(map.anisotropy!==anisotropy){map.anisotropy=anisotropy;map.needsUpdate=true;}}
 return {source,target,projection,height,triangles:positions.length/9,sourceGeometry:original,
  material:source.material,textureSize:map?.image?{width:map.image.width,height:map.image.height}:null};
}
