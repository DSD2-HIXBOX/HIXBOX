// Offline derivative builder. Never writes to source folders or legacy assets.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import crypto from 'node:crypto';
import * as T from 'three';
import {MeshoptSimplifier} from 'meshoptimizer';
await MeshoptSimplifier.ready;
const sources=process.env.SCHOOL_SOURCE_ROOT??'source-models/legacy';
const outRoot='public/models/unified';
const report={sourcesUnchanged:true,models:{},placements:{classroom:{translation:[96.5433,4.4,0]},hallway:{translation:[-65.58,4.395,0]},stairs:{translation:[87.684,4.395,36.525],rotationY:Math.PI},entrance:{translation:[-4.98,.05,30.019]}}};
const kinds={classroom:'school_class_room',hallway:'school_hallway',stairs:'school_stairs',entrance:'school_entrance'};
const doorIDs=new Map([[30,[0,1]],[41,[0,1]],[64,[0,1]],[32,[0,-1]],[43,[0,-1]],[66,[0,-1]],[34,[1,-1]],[53,[1,-1]],[68,[1,-1]],[36,[1,1]],[55,[1,1]],[62,[1,1]]]);
const hallDrop=new Set([21,23,32,50,53,58,64,66,70,72,83,85,87,89,124,126,128,130,132,134,136,138,233,235,237,239,241]);
const sizes={SCALAR:1,VEC2:2,VEC3:3,VEC4:4};
for(const [kind,folder] of Object.entries(kinds)){
 const dir=path.join(sources,folder),g=JSON.parse(fs.readFileSync(path.join(dir,'scene.gltf'))),bins=g.buffers.map(b=>fs.readFileSync(path.join(dir,b.uri)));
 const matrices=new Map(),paths=new Map();
 function walk(i,parent,role){const n=g.nodes[i],m=n.matrix?new T.Matrix4().fromArray(n.matrix):new T.Matrix4().compose(new T.Vector3(...n.translation??[0,0,0]),new T.Quaternion(...n.rotation??[0,0,0,1]),new T.Vector3(...n.scale??[1,1,1]));m.premultiply(parent);matrices.set(i,m);paths.set(i,role+'/'+n.name);for(const c of n.children??[])walk(c,m,role+'/'+n.name);}
 const placement=report.placements[kind],pm=new T.Matrix4().makeRotationY(placement.rotationY??0);pm.setPosition(...placement.translation);
 for(const i of g.scenes[g.scene??0].nodes)walk(i,pm,'');
 function read(ai){const a=g.accessors[ai],v=g.bufferViews[a.bufferView],b=bins[v.buffer],n=sizes[a.type],bytes={5126:4,5125:4,5123:2,5121:1}[a.componentType],method={5126:'readFloatLE',5125:'readUInt32LE',5123:'readUInt16LE',5121:'readUInt8'}[a.componentType],r=new Float32Array(a.count*n);for(let i=0;i<a.count;i++)for(let j=0;j<n;j++)r[i*n+j]=b[method]((v.byteOffset??0)+(a.byteOffset??0)+i*(v.byteStride??n*bytes)+j*bytes);return r;}
 const o={asset:{...g.asset,extras:{...g.asset.extras,derivative:'Offline simplified / connected; original source files preserved',placement}},scene:0,scenes:[{nodes:[]}],nodes:[],meshes:[],materials:g.materials,accessors:[],bufferViews:[],buffers:[],images:g.images??[],textures:g.textures??[],samplers:g.samplers??[]};
 const chunks=[],cache=new Map();let length=0,before=0,after=0,modified=0;
 function add(data,type){const aligned=(length+3)&~3;if(aligned>length)chunks.push(Buffer.alloc(aligned-length));length=aligned;const bytes=Buffer.from(data.buffer,data.byteOffset,data.byteLength),vi=o.bufferViews.length;o.bufferViews.push({buffer:0,byteOffset:length,byteLength:bytes.length});chunks.push(bytes);length+=bytes.length;const a={bufferView:vi,componentType:data instanceof Uint32Array?5125:5126,count:data.length/sizes[type],type};if(type==='VEC3'){a.min=[Infinity,Infinity,Infinity];a.max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<data.length;i++){const j=i%3;a.min[j]=Math.min(a.min[j],data[i]);a.max[j]=Math.max(a.max[j],data[i]);}}o.accessors.push(a);return o.accessors.length-1;}
 function half(poly,axis,value,sign){const kept=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=(a.p[axis]-value)*sign,db=(b.p[axis]-value)*sign;if(da>=-1e-7)kept.push(a);if(da>1e-7&&db< -1e-7||da< -1e-7&&db>1e-7){const t=da/(da-db),v={};for(const k of Object.keys(a))v[k]=a[k].map((x,j)=>x+(b[k][j]-x)*t);kept.push(v);}}return kept;}
 function subtract(poly,box){if([0,1,2].some(a=>poly.every(v=>v.p[a]<box[a]-1e-7)||poly.every(v=>v.p[a]>box[a+3]+1e-7)))return [poly];let inside=poly,kept=[];for(const [ax,val,sign]of[[0,box[0],1],[0,box[3],-1],[1,box[1],1],[1,box[4],-1],[2,box[2],1],[2,box[5],-1]]){if(inside.length<3)break;const outer=half(inside,ax,val,-sign);if(outer.length>=3)kept.push(outer);inside=half(inside,ax,val,sign);}return kept;}
 for(const [ni,node]of g.nodes.entries()){
  if(node.mesh===undefined||kind==='hallway'&&hallDrop.has(ni))continue;
  const role=paths.get(ni),m=matrices.get(ni),normal=new T.Matrix3().getNormalMatrix(m),prims=[];
  for(const prim of g.meshes[node.mesh].primitives){
   let p=read(prim.attributes.POSITION),n=prim.attributes.NORMAL!==undefined?read(prim.attributes.NORMAL):null,uv=prim.attributes.TEXCOORD_0!==undefined?read(prim.attributes.TEXCOORD_0):null,idx=prim.indices!==undefined?Uint32Array.from(read(prim.indices)):Uint32Array.from({length:p.length/3},(_,i)=>i);before+=idx.length/3;
   const v=new T.Vector3();for(let i=0;i<p.length;i+=3){v.fromArray(p,i).applyMatrix4(m).toArray(p,i);if(n)v.fromArray(n,i).applyMatrix3(normal).normalize().toArray(n,i);}
   // Correct the author's 5 mm classroom/hall slab discrepancy only at its edge.
   if(kind==='classroom'&&ni===21)for(let i=0;i<p.length;i+=3)if(p[i]<-4.14)p[i]=-4.1517;
   // Cut only actual shared passage volumes; preserve jambs and lintels.
   const cuts=[];
   if(kind==='hallway')cuts.push([-6.95,4.401,46.47,-3.05,6.9,46.70]);
   if(kind==='stairs')cuts.push([-6.95,.001,49.15,-3.05,2.5,49.6]);
   if(kind==='entrance')cuts.push([-6.95,.001,49.15,-3.05,2.5,49.3]);
   const bounds=[Infinity,Infinity,Infinity,-Infinity,-Infinity,-Infinity];for(let i=0;i<p.length;i++){const a=i%3;bounds[a]=Math.min(bounds[a],p[i]);bounds[a+3]=Math.max(bounds[a+3],p[i]);}const relevant=cuts.filter(box=>[0,1,2].every(a=>bounds[a]<=box[a+3]&&bounds[a+3]>=box[a]));if(relevant.length){let polys=[];for(let i=0;i<idx.length;i+=3)polys.push([0,1,2].map(j=>{const a=idx[i+j];return{p:Array.from(p.slice(a*3,a*3+3)),...(n?{n:Array.from(n.slice(a*3,a*3+3))}:{}),...(uv?{uv:Array.from(uv.slice(a*2,a*2+2))}:{})};}));for(const box of relevant)polys=polys.flatMap(poly=>subtract(poly,box));const pp=[],nn=[],uu=[];for(const poly of polys)for(let j=1;j<poly.length-1;j++)for(const a of[poly[0],poly[j],poly[j+1]]){pp.push(...a.p);if(n)nn.push(...a.n);if(uv)uu.push(...a.uv);}p=Float32Array.from(pp);if(n)n=Float32Array.from(nn);if(uv)uv=Float32Array.from(uu);idx=Uint32Array.from({length:p.length/3},(_,i)=>i);modified++;}
   if(!idx.length)continue;
   // Only reduce dense curved furniture / tubes. Architecture, UVs and doors stay intact.
   if(idx.length>3000&&kind==='classroom'&&!doorIDs.has(ni)){
    const attrs=new Float32Array(p.length/3*(uv?5:3));for(let i=0;i<p.length/3;i++){attrs.set(n?.slice(i*3,i*3+3)??[0,1,0],i*(uv?5:3));if(uv)attrs.set(uv.slice(i*2,i*2+2),i*5+3);}
    [idx]=MeshoptSimplifier.simplifyWithAttributes(idx,p,3,attrs,uv?5:3,uv?[.15,.15,.15,.1,.1]:[.15,.15,.15],null,Math.max(600,Math.floor(idx.length*.035/3)*3),.003,['ErrorAbsolute','Permissive']);
   }
   const remap=new Map(),pp=[],nn=[],uu=[];for(let i=0;i<idx.length;i++){const old=idx[i];if(!remap.has(old)){remap.set(old,remap.size);pp.push(...p.slice(old*3,old*3+3));if(n)nn.push(...n.slice(old*3,old*3+3));if(uv)uu.push(...uv.slice(old*2,old*2+2));}idx[i]=remap.get(old);}p=Float32Array.from(pp);n=n?Float32Array.from(nn):null;uv=uv?Float32Array.from(uu):null;
   // Local centering enables identical furniture geometry to share GPU buffers.
   const center=[0,1,2].map(a=>{let lo=Infinity,hi=-Infinity;for(let i=a;i<p.length;i+=3){lo=Math.min(lo,p[i]);hi=Math.max(hi,p[i]);}return(lo+hi)/2;});for(let i=0;i<p.length;i++)p[i]=Math.round((p[i]-center[i%3])*1e5)/1e5;
   const hash=crypto.createHash('sha256').update(Buffer.from(p.buffer)).update(Buffer.from(idx.buffer));if(n)hash.update(Buffer.from(n.buffer));if(uv)hash.update(Buffer.from(uv.buffer));const key=hash.digest('hex')+':'+prim.material;
   let mi=cache.get(key);if(mi===undefined){const attributes={POSITION:add(p,'VEC3')};if(n)attributes.NORMAL=add(n,'VEC3');if(uv)attributes.TEXCOORD_0=add(uv,'VEC2');mi=o.meshes.length;const low=idx.length>3000?MeshoptSimplifier.simplify(idx,p,3,Math.max(300,Math.floor(idx.length*.15/3)*3),.008,['ErrorAbsolute','LockBorder'])[0]:null;o.meshes.push({primitives:[{attributes,indices:add(idx,'SCALAR'),material:prim.material,mode:4}],...(low?{extras:{collisionIndices:Array.from(low)}}:{})});cache.set(key,mi);}
   const extras={sourceNode:ni,role,kind,...(kind==='classroom'&&doorIDs.has(ni)?{door:doorIDs.get(ni)}:{})};
   o.scenes[0].nodes.push(o.nodes.length);o.nodes.push({name:kind+'_'+ni,mesh:mi,translation:center,extras});after+=idx.length/3;
  }
 }
 o.buffers=[{uri:'scene.bin',byteLength:length}];const out=path.join(outRoot,kind);fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'scene.gltf'),JSON.stringify(o));fs.writeFileSync(path.join(out,'scene.bin'),Buffer.concat(chunks));for(const image of o.images){const target=path.join(out,image.uri);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(dir,image.uri),target);execFileSync('sips',['-Z','2048',target],{stdio:'ignore'});}fs.copyFileSync(path.join(dir,'license.txt'),path.join(out,'license.txt'));
 report.models[kind]={source:dir,beforeTriangles:before,afterTriangles:after,bufferBytes:length,meshCount:o.meshes.length,nodeCount:o.nodes.length,cuts:modified};console.log(kind,report.models[kind]);
}
fs.writeFileSync('docs/unified-build-report.json',JSON.stringify(report,null,2));
