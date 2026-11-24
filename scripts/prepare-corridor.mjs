// Produce a reversible, separate glTF derivative. Originals are never overwritten.
// Polygon clipping interpolates every vertex attribute, including UVs and tangents.
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import * as THREE from 'three';
const source=new URL('../public/models/corridor/original/',import.meta.url);
const out=new URL('../public/models/corridor/connected/',import.meta.url);
const gltf=JSON.parse(fs.readFileSync(new URL('scene.gltf',source)));
const buffers=gltf.buffers.map(b=>fs.readFileSync(new URL(b.uri,source)));
const derived=structuredClone(gltf);derived.buffers.forEach(b=>b.uri='../original/'+b.uri);derived.images.forEach(i=>i.uri='../original/'+i.uri);
const counts={SCALAR:1,VEC2:2,VEC3:3,VEC4:4},size={5126:4,5125:4,5123:2,5121:1},read={5126:'readFloatLE',5125:'readUInt32LE',5123:'readUInt16LE',5121:'readUInt8'};
function accessor(index){const a=gltf.accessors[index],view=gltf.bufferViews[a.bufferView],data=buffers[view.buffer],components=counts[a.type],stride=view.byteStride??components*size[a.componentType];return Array.from({length:a.count},(_,i)=>Array.from({length:components},(_,j)=>data[read[a.componentType]]((view.byteOffset??0)+(a.byteOffset??0)+i*stride+j*size[a.componentType])));}
const matrices=new Map();function walk(index,parent){const n=gltf.nodes[index],m=new THREE.Matrix4();if(n.matrix)m.fromArray(n.matrix);else m.compose(new THREE.Vector3(...(n.translation??[0,0,0])),new THREE.Quaternion(...(n.rotation??[0,0,0,1])),new THREE.Vector3(...(n.scale??[1,1,1])));m.premultiply(parent);matrices.set(index,m);for(const c of n.children??[])walk(c,m);}
for(const n of gltf.scenes[gltf.scene??0].nodes)walk(n,new THREE.Matrix4());
const chunks=[];let byteLength=0;const modified=[];
function addAttribute(values,type){const buffer=Buffer.alloc(values.length*values[0].length*4);let offset=0;for(const value of values)for(const n of value){buffer.writeFloatLE(n,offset);offset+=4;}const view=derived.bufferViews.length;derived.bufferViews.push({buffer:gltf.buffers.length,byteOffset:byteLength,byteLength:buffer.length,target:34962});chunks.push(buffer);byteLength+=buffer.length;const index=derived.accessors.length;const a={bufferView:view,componentType:5126,count:values.length,type};if(type==='VEC3'){a.min=[0,1,2].map(j=>values.reduce((min,v)=>Math.min(min,v[j]),Infinity));a.max=[0,1,2].map(j=>values.reduce((max,v)=>Math.max(max,v[j]),-Infinity));}derived.accessors.push(a);return index;}
function interpolate(a,b,t){const result={};for(const key of Object.keys(a))result[key]=a[key].map((v,j)=>v+(b[key][j]-v)*t);return result;}
function half(poly,axis,value,insideGreater){const result=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=(a.WORLD[axis]-value)*(insideGreater?1:-1),db=(b.WORLD[axis]-value)*(insideGreater?1:-1);if(da>=-1e-8)result.push(a);if((da>1e-8&&db< -1e-8)||(da< -1e-8&&db>1e-8))result.push(interpolate(a,b,da/(da-db)));}return result;}
function subtract(poly,box){let inside=poly;const kept=[];for(const [axis,value,greater] of [[0,box.min[0],true],[0,box.max[0],false],[1,box.min[1],true],[1,box.max[1],false],[2,box.min[2],true],[2,box.max[2],false]]){if(inside.length<3)break;const outside=half(inside,axis,value,!greater);if(outside.length>=3)kept.push(outside);inside=half(inside,axis,value,greater);}return kept;}
function edit(nodeIndex,box,reason){const node=gltf.nodes[nodeIndex],matrix=matrices.get(nodeIndex);const primitives=[];let before=0,after=0;
 for(const primitive of gltf.meshes[node.mesh].primitives){const attrs=Object.fromEntries(Object.entries(primitive.attributes).map(([k,i])=>[k,accessor(i)])),indices=accessor(primitive.indices).flat();const output=Object.fromEntries(Object.keys(attrs).map(k=>[k,[]]));before+=indices.length/3;
  for(let i=0;i<indices.length;i+=3){const triangle=indices.slice(i,i+3).map(index=>{const v=Object.fromEntries(Object.entries(attrs).map(([k,list])=>[k,list[index]]));v.WORLD=new THREE.Vector3(...v.POSITION).applyMatrix4(matrix).toArray();return v;});
   for(const polygon of subtract(triangle,box))for(let j=1;j<polygon.length-1;j++){const tri=[polygon[0],polygon[j],polygon[j+1]];const a=new THREE.Vector3(...tri[0].WORLD),b=new THREE.Vector3(...tri[1].WORLD),c=new THREE.Vector3(...tri[2].WORLD);if(b.sub(a).cross(c.sub(a)).lengthSq()<1e-18)continue;after++;for(const v of tri)for(const key of Object.keys(output))output[key].push(v[key]);}
  }
  const attributes={};for(const [key,values] of Object.entries(output))attributes[key]=addAttribute(values,gltf.accessors[primitive.attributes[key]].type);
  primitives.push({attributes,material:primitive.material,mode:4});
 }
 derived.meshes[node.mesh].primitives=primitives;modified.push({nodeIndex,name:node.name,reason,beforeTriangles:before,afterTriangles:after,cutBox:box});
}
// Classroom right wall and its two original wooden/glazed doors occupy this span.
// Keep the corridor's upper wall band; replace only the shared facade region.
edit(5,{min:[-100,-.1,-4.226616207],max:[100,2.94,4.226617399]},'Replace shared corridor facade with unchanged Korean classroom wall and doors');
// Use the existing evacuation stair at the positive end. Keep the opposite original stair.
edit(8,{min:[-100,-.1,11.62590],max:[100,100,100]},'Positive-end stair replaced by relocated existing evacuation stair; no extra door');
// Close only the depth of the recessed shared facade. These three plain wall
// returns join the existing wall edges; they are not door leaves or door frames.
// Use the existing corridor Wall material, without inventing a new material.
const x0=-2.3378366901464,x1=-2.0782098305625496,y=2.94,z0=-4.226616207,z1=4.226617399;
const inverse=matrices.get(3).clone().invert();
const capPositions=[],capNormals=[],capUVs=[];
for(const quad of [
 [[x0,y,z0],[x1,y,z0],[x1,y,z1],[x0,y,z1]],
 [[x0,0,z0],[x1,0,z0],[x1,y,z0],[x0,y,z0]],
 [[x1,0,z1],[x0,0,z1],[x0,y,z1],[x1,y,z1]],
]){
 const v=quad.map(p=>new THREE.Vector3(...p).applyMatrix4(inverse));
 const normal=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])).normalize().toArray();
 const uv=[[.08,.2],[.12,.2],[.12,.5],[.08,.5]];
 for(const i of [0,1,2,0,2,3]){capPositions.push(v[i].toArray());capNormals.push(normal);capUVs.push(uv[i]);}
}
const capMesh=derived.meshes.length;
derived.meshes.push({name:'Shared_facade_returns',primitives:[{attributes:{POSITION:addAttribute(capPositions,'VEC3'),NORMAL:addAttribute(capNormals,'VEC3'),TEXCOORD_0:addAttribute(capUVs,'VEC2')},material:1,mode:4}]});
const capNode=derived.nodes.length;derived.nodes.push({name:'Shared_facade_returns',mesh:capMesh});derived.nodes[3].children.push(capNode);
derived.buffers.push({byteLength,uri:'connection.bin'});
derived.asset.extras={...derived.asset.extras,derivative:'Connected classroom facade cut; source geometry and textures preserved under ../original',modifications:modified};
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(new URL('scene.gltf',out),JSON.stringify(derived,null,2));fs.writeFileSync(new URL('connection.bin',out),Buffer.concat(chunks));
fs.writeFileSync(new URL('../docs/corridor-edit-report.json',import.meta.url),JSON.stringify({source:'public/models/corridor/original/scene.gltf',output:'public/models/corridor/connected/scene.gltf',modified,added:'Three shallow wall returns at shared facade edges (existing Wall material); no door geometry added',unchangedMeshes:[0,2,3],originalMaterialsPreserved:true,originalImagesPreserved:true},null,2));
console.log(JSON.stringify({output:fileURLToPath(out),modified},null,2));
