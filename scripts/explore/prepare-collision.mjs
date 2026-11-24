import{repairCorridorWalls}from './repair-corridor-walls.mjs';
import{matchLevels}from './match-levels.mjs';
import{applyBoardRestoration}from './board-restoration.mjs';
import{gzipSync,gunzipSync}from'node:zlib';
import{isAnnex}from './building-scope.mjs';
import fs from 'node:fs';import * as T from 'three';import{loadGLB as load,readAccessor as read}from '../lib/glb.mjs';
const s=load('public/models/explore/repaired-source.glb'),manifest=JSON.parse(fs.readFileSync('public/models/explore/doors.json')),dynamic=new Set(manifest.doors.flatMap(d=>d.leaves.flatMap(l=>l.nodeIndices))),chunks=[];let count=0;const region=new T.Box3(new T.Vector3(-46,1,-50),new T.Vector3(46,21,54));
applyBoardRestoration(s);matchLevels(s);repairCorridorWalls(s);
for(let [i,m]of s.world){let n=s.g.nodes[i];if(n.mesh===undefined||dynamic.has(i))continue;for(let pr of s.g.meshes[n.mesh].primitives){let a=s.g.accessors[pr.attributes.POSITION],bb=new T.Box3(new T.Vector3(...a.min),new T.Vector3(...a.max)).applyMatrix4(m);if(isAnnex(bb)||!bb.intersectsBox(region))continue;let pp=read(s,pr.attributes.POSITION),ix=pr.indices===undefined?Array.from({length:pp.length/3},(_,i)=>i):read(s,pr.indices),out=[];const flipped=m.determinant()<0;for(let k=0;k<ix.length;k+=3){let v=[0,1,2].map(j=>new T.Vector3().fromArray(pp,ix[k+(flipped?(j===1?2:j===2?1:0):j)]*3).applyMatrix4(m)),b=new T.Box3().setFromPoints(v);if(!b.intersectsBox(region))continue;const cross=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0]));if(cross.lengthSq()<1e-10)continue;out.push(...v[0].toArray(),...v[1].toArray(),...v[2].toArray());}if(out.length){let f=Float32Array.from(out);chunks.push(Buffer.from(f.buffer));count+=out.length/9;}}}
const buf=Buffer.concat(chunks);fs.writeFileSync('public/models/explore/collision.bin',buf);fs.writeFileSync('docs/explore/collision-report.json',JSON.stringify({triangles:count,bytes:buf.length,dynamicNodes:dynamic.size,region:[region.min.toArray(),region.max.toArray()]},null,2));console.log('Collision triangles',count,'bytes',buf.length);

const packed=gzipSync(buf,{level:9});if(!gunzipSync(packed).equals(buf))throw Error('Collision compression mismatch');fs.writeFileSync('public/models/explore/collision.bin.gz',packed);console.log('Lossless compressed collision bytes',packed.length);
