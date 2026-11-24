// Headless geometry inspection only. Runtime GLTFLoader loads the original textures.
import fs from 'node:fs';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
export async function readModel(relative='classroom/'){
 const dir=new URL('../public/models/'+relative,import.meta.url),data=JSON.parse(fs.readFileSync(new URL('scene.gltf',dir)));
 for(const b of data.buffers)b.uri=`data:application/octet-stream;base64,${fs.readFileSync(new URL(b.uri,dir)).toString('base64')}`;
 data.images=[];data.textures=[];data.materials=data.materials.map(m=>({name:m.name,doubleSided:true}));
 globalThis.ProgressEvent??=class{constructor(type,options){this.type=type;Object.assign(this,options);}};
 return new GLTFLoader().parseAsync(JSON.stringify(data),'');
}
export const readClassroom=()=>readModel('classroom/');
