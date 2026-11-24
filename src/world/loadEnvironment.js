import {loadUnifiedSchool} from './unifiedSchool.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';
import { buildSchool } from './procedural.js';
// Visual assets and navigation data are independent. See public/models/README.md.
export async function loadEnvironment(collision, config={}) {
 if(config.procedural)return buildSchool(collision);
 if(!config.modelUrl)return loadUnifiedSchool(collision,config);
 const gltf=await new GLTFLoader().loadAsync(config.modelUrl);
 gltf.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
 for(const b of config.colliders??[])collision.addBox(b.min,b.max);
 for(const s of config.surfaces??[])collision.addSurface(s.x0,s.x1,s.z0,s.z1,s.height);
 if(!collision.surfaces.length)throw new Error('GLB 환경에는 보행면 surfaces를 지정해야 합니다.');
 const targets=[];gltf.scene.traverse(o=>{if(o.userData.interaction)targets.push(o);});
 return {root:gltf.scene,targets,spawn:new THREE.Vector3(...(config.spawn??[0,0,0])),zone:config.zone??(()=> '학교'),dispose(){gltf.scene.traverse(o=>o.geometry?.dispose());}};
}
