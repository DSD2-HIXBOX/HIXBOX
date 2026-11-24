import fs from 'node:fs';
import * as T from 'three';
const file=new URL('../public/models/classroom/scene.gltf',import.meta.url);
const g=JSON.parse(fs.readFileSync(file,'utf8'));
const rows=[];
function visit(i,parent,path){const n=g.nodes[i],m=new T.Matrix4();if(n.matrix)m.fromArray(n.matrix);else m.compose(new T.Vector3(...(n.translation??[0,0,0])),new T.Quaternion(...(n.rotation??[0,0,0,1])),new T.Vector3(...(n.scale??[1,1,1])));m.premultiply(parent);const b=new T.Box3(),name=n.name??`node${i}`,p=[...path,name];let triangles=0;
 if(n.mesh!==undefined)for(const primitive of g.meshes[n.mesh].primitives){const a=g.accessors[primitive.attributes.POSITION];b.union(new T.Box3(new T.Vector3(...a.min),new T.Vector3(...a.max)).applyMatrix4(m));triangles+=(g.accessors[primitive.indices??primitive.attributes.POSITION].count/3);}
 for(const c of n.children??[])b.union(visit(c,m,p));
 const round=v=>v.toArray().map(x=>+x.toFixed(7));
 rows.push({index:i,name,path:p.join('/'),mesh:n.mesh,min:round(b.min),max:round(b.max),triangles});return b;
}
const bounds=new T.Box3();for(const i of g.scenes[g.scene??0].nodes)bounds.union(visit(i,new T.Matrix4(),[]));
const report={asset:g.asset,animations:g.animations?.length??0,materials:g.materials.length,images:g.images.length,triangles:rows.reduce((n,r)=>n+r.triangles,0),bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},nodes:rows};
if(process.argv.includes('--json'))console.log(JSON.stringify(report,null,2));else{console.log(JSON.stringify({...report,nodes:undefined},null,2));for(const r of rows.filter(r=>r.mesh!==undefined&&(!r.path.includes('/desk/')&&!r.path.includes('/desk1/')&&!r.path.includes('/desk2/'))))console.log(r.index,r.path,JSON.stringify({min:r.min,max:r.max}));}
