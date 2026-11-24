// Repair inward-wound side returns of previously audited corridor pilasters.
import fs from'node:fs';import * as T from'three';import{loadGLB,readAccessor as read}from'../lib/glb.mjs';
const path=process.argv[2]??'public/models/explore/render.glb',s=loadGLB(path),g=s.g;
if(g.extensionsRequired?.includes('EXT_meshopt_compression'))throw Error('Use uncompressed GLB');
const audit=JSON.parse(fs.readFileSync('docs/explore/v1.6/corridor-wall-repair.json'));
const volumes=audit.patches.filter(p=>!p.attachedSkirting).map(p=>{const min=[...p.min],max=[...p.max];min[p.axis]=p.min[p.axis]-Math.max(0,p.desiredSign)*.5-.003;max[p.axis]=p.max[p.axis]-Math.min(0,p.desiredSign)*.5+.003;min[1]-=.12;return{axis:p.axis,min,max};});
let fixes=[];const changedNormals=new Set();
for(const[ni,m]of s.world){const node=g.nodes[ni];if(node.mesh===undefined)continue;for(const[pi,p]of g.meshes[node.mesh].primitives.entries()){
 if(![12,181,182].includes(p.material))continue;
 const a=read(s,p.attributes.POSITION),ix=p.indices===undefined?Array.from({length:a.length/3},(_,j)=>j):read(s,p.indices);
 for(let k=0;k<ix.length;k+=3){const v=[0,1,2].map(j=>new T.Vector3().fromArray(a,ix[k+j]*3).applyMatrix4(m)),b=new T.Box3().setFromPoints(v),normal=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])).normalize();if(Math.abs(normal.y)>.01||b.max.y-b.min.y<.05)continue;
 let desired;for(const vol of volumes){const u=vol.axis===0?2:0;if(Math.abs(normal.getComponent(u))<.9999)continue;if(b.min.x<vol.min[0]-.004||b.max.x>vol.max[0]+.004||b.min.y<vol.min[1]-.004||b.max.y>vol.max[1]+.004||b.min.z<vol.min[2]-.004||b.max.z>vol.max[2]+.004)continue;const plane=(b.min.getComponent(u)+b.max.getComponent(u))/2;const sign=Math.abs(plane-vol.min[u])<.004?-1:Math.abs(plane-vol.max[u])<.004?1:0;if(sign&&normal.getComponent(u)*sign<-.9999){desired={axis:u,sign};break;}}
 if(!desired)continue;
 if(p.indices!==undefined){const ac=g.accessors[p.indices],view=g.bufferViews[ac.bufferView],bytes=ac.componentType===5125?4:2,fn=bytes===4?'writeUInt32LE':'writeUInt16LE',off=(view.byteOffset??0)+(ac.byteOffset??0);s.bin[fn](ix[k+2],off+(k+1)*bytes);s.bin[fn](ix[k+1],off+(k+2)*bytes);}else throw Error('Expected indexed current batch');
 if(p.attributes.NORMAL!==undefined){const ac=g.accessors[p.attributes.NORMAL],view=g.bufferViews[ac.bufferView];for(let j=0;j<3;j++){const id=ix[k+j],key=p.attributes.NORMAL+':'+id;if(changedNormals.has(key))continue;changedNormals.add(key);const off=(view.byteOffset??0)+(ac.byteOffset??0)+id*(view.byteStride??12);for(let c=0;c<3;c++)s.bin.writeFloatLE(-s.bin.readFloatLE(off+c*4),off+c*4);}}
 fixes.push({node:ni,primitive:pi,triangle:k/3,...desired,min:b.min.toArray(),max:b.max.toArray()});
 }
}}
const bytes=fs.readFileSync(path),jsonLength=bytes.readUInt32LE(12),binOffset=28+jsonLength;s.bin.copy(bytes,binOffset);fs.writeFileSync(path,bytes);fs.mkdirSync('docs/explore/v1.8',{recursive:true});fs.writeFileSync('docs/explore/v1.8/wall-sides.json',JSON.stringify({triangles:fixes.length,positionsUnchanged:true,collisionUnchanged:true,fixes},null,2));console.log('Repaired pilaster side triangles:',fixes.length);
