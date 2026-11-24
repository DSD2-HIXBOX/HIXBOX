import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
export function buildSchool(collision,{includeClassroom=true,includeCorridor=true}={}){
 const root=new THREE.Group();root.name='Procedural Korean school';const targets=[];
 const mats={wall:new THREE.MeshStandardMaterial({color:0xe4e2d5,roughness:.92}),floor:new THREE.MeshStandardMaterial({color:0xb6a58c,roughness:.78}),trim:new THREE.MeshStandardMaterial({color:0x82948a,roughness:.7}),wood:new THREE.MeshStandardMaterial({color:0xb7986d,roughness:.63}),metal:new THREE.MeshStandardMaterial({color:0x657068,roughness:.55,metalness:.3}),board:new THREE.MeshStandardMaterial({color:0x26483f,roughness:.94}),glass:new THREE.MeshStandardMaterial({color:0xc5dce0,transparent:true,opacity:.18,roughness:.15}),leaf:new THREE.MeshStandardMaterial({color:0x6d805e,roughness:1}),ground:new THREE.MeshStandardMaterial({color:0xb3a186,roughness:1}),white:new THREE.MeshStandardMaterial({color:0xf1eee3,roughness:.8})};
 function box(x,y,z,w,h,d,mat='wall',solid=true){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mats[mat]);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);if(solid)collision.addBox({x:x-w/2,y:y-h/2,z:z-d/2},{x:x+w/2,y:y+h/2,z:z+d/2});return mesh;}
 function label(text,x,y,z,ry=0,width=1.6){const c=document.createElement('canvas');c.width=768;c.height=192;const ctx=c.getContext('2d');ctx.fillStyle='#e9eadd';ctx.fillRect(0,0,768,192);ctx.fillStyle='#304d40';ctx.font='bold 54px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,384,96);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(width,width/4),new THREE.MeshBasicMaterial({map:tex}));m.position.set(x,y,z);m.rotation.y=ry;root.add(m);return m;}
 function sign(text,detail,x,y,z,ry=0){const m=label(text,x,y,z,ry);m.userData={interaction:detail};targets.push(m);}
 function floor(x,z,w,d,y,mat='floor'){box(x,y-.1,z,w,.2,d,mat,false);collision.addSurface(x-w/2,x+w/2,z-d/2,z+d/2,y);}
 // 2F: classroom x=-5..5, z=-5..5. Corridor x=5..8; stair x=8..11.
 if(includeClassroom)floor(0,0,10,10,3.2);if(includeCorridor)floor(6.5,0,3,16,3.2);floor(9.5,6.5,3,3,3.2);
 if(includeClassroom)box(0,6.5,0,10,.16,10,'white',false);if(includeCorridor)box(6.5,6.5,0,3,.16,16,'white',false);
 if(includeClassroom){
 box(0,4.85,-5,10,3.3,.18);box(0,4.85,5,10,3.3,.18);
 // Corridor-side wall with two permanently open, 1.5m-wide doorways.
 for(const [z,d] of [[-4.5,1], [0,5], [4.5,1]])box(5,4.85,z,.18,3.3,d);
 for(const z of [-3.25,3.25]){box(5,6.05,z,.2,.9,1.5);for(const zz of [z-.8,z+.8])box(5,4.45,zz,.24,2.5,.09,'trim');}
 // Window wall. Low parapet, glass, mullions and lintel.
 box(-5,3.65,0,.18,.9,10);box(-5,6.2,0,.18,.6,10);
 for(let z=-4.8;z<5;z+=1.6){box(-5,4.95,z,.16,1.7,.07,'white');box(-5,4.95,z+.75,.04,1.65,1.45,'glass');}
 // Invisible glass collision remains solid even though transparent.
 collision.addBox({x:-5.1,y:3.2,z:-5},{x:-4.9,y:6.5,z:5});
 box(0,4.85,-4.84,4.6,1.35,.08,'board');box(0,4.13,-4.69,4.8,.08,.23,'trim');
 label('서로 배려하는 우리 교실',0,5.9,-4.73,0,3.2);
 box(-2.5,3.95,-3.7,1.2,.08,.65,'wood');box(-2.5,3.57,-3.7,1,.7,.5,'metal');
 for(let row=0;row<4;row++)for(let col=0;col<4;col++){
 const x=-3.3+col*1.7,z=-1.9+row*1.5;
 box(x,3.94,z,.68,.065,.48,'wood');
 for(const dx of [-.27,.27])for(const dz of [-.17,.17])box(x+dx,3.56,z+dz,.035,.7,.035,'metal',false);
 collision.addBox({x:x-.34,y:3.2,z:z-.24},{x:x+.34,y:3.98,z:z+.24});
 box(x,3.65,z+.53,.42,.06,.42,'wood');box(x,3.94,z+.73,.42,.52,.045,'wood');
 for(const dx of [-.16,.16])for(const dz of [-.15,.15])box(x+dx,3.42,z+.53+dz,.03,.44,.03,'metal',false);
 collision.addBox({x:x-.23,y:3.2,z:z+.29},{x:x+.23,y:4.22,z:z+.77});
 }
 for(let i=0;i<8;i++){const x=-3.8+i*.85;box(x,3.85,4.7,.8,1.3,.48,'trim');box(x,3.85,4.44,.72,1.2,.03,'white',false);box(x+.25,3.85,4.4,.025,.12,.035,'metal',false);}
 }
 // Corridor outer wall opens toward stair landing at z=5..8.
 if(includeCorridor){box(8,4.85,-1.5,.16,3.3,13);box(6.5,4.85,-8,3,3.3,.16);box(8,4.85,8,6,3.3,.16);}
 if(includeClassroom)sign('2학년 3반','교실입니다. 열린 문을 지나 복도 오른쪽 끝의 계단으로 이동하세요.',4.87,5.45,3.25,-Math.PI/2);
 if(includeCorridor)sign('계단 →','계단은 복도 끝에 있습니다. 천천히 내려가 1층 출입구로 이동하세요.',7.88,4.8,4, -Math.PI/2);
 // Straight 20-step stair, 16cm rise, 30cm tread. Walk surface follows same incline.
 for(let i=0;i<20;i++){const z=-.85+i*.3,h=(i+1)*.16;box(9.5,h/2,z,3,h,.3,'floor',false);}
 collision.addSurface(8,11,-1,5,(x,z)=>Math.max(0,Math.min(3.2,(z+1)/6*3.2)));
 // Stair rails and enclosure do not block the top / bottom openings.
 for(const x of [8.05,10.95]){box(x,1.6,2,.1,3.2,6,'wall');}
 box(11.1,4.85,6.5,.16,3.3,3);
 floor(9.5,-2.5,3,3,0,'floor');floor(9.5,-6,3,4,0,'floor');
 box(8,1.65,-4.5,.16,3.3,7);box(11,1.65,-4.5,.16,3.3,7);
 box(9.5,3.3,-5,3,.16,6,'white',false);
 // Entrance facing the playground; open centre, framed side panels.
 for(const x of [8.2,10.8])box(x,1.4,-8,.35,2.8,.16,'trim');box(9.5,2.9,-8,3,.3,.18,'trim');
 sign('운동장 ↑','1층 출입구입니다. 앞쪽의 운동장까지 자유롭게 탐색할 수 있습니다.',9.5,2.55,-7.88,0);
 floor(6,-19,30,22,0,'ground');
 // Boundary fence / hedges keep users inside the authored space.
 for(const [x,z,w,d] of [[-9,-19,.25,22],[21,-19,.25,22],[6,-30,30,.25],[-.5,-8,17,.25],[16.25,-8,9.5,.25]])box(x,.55,z,w,1.1,d,'trim');
 // Track and court markings.
 for(const [x,z,w,d] of [[6,-12,16,.07],[6,-25,16,.07],[-2,-18.5,.07,13],[14,-18.5,.07,13],[6,-18.5,16,.05]])box(x,.012,z,w,.024,d,'white',false);
 const ring=new THREE.Mesh(new THREE.RingGeometry(2.9,2.95,48),mats.white);ring.rotation.x=-Math.PI/2;ring.position.set(6,.025,-18.5);root.add(ring);
 // Low cost tree canopies beyond walk area.
 for(const x of [-11,23])for(let z=-10;z>-32;z-=5){box(x,1.5,z,.25,3,.25,'wood',false);const tree=new THREE.Mesh(new THREE.IcosahedronGeometry(1.6,1),mats.leaf);tree.position.set(x,3.2,z);tree.castShadow=true;root.add(tree);}
 // Exterior facade below classroom, seen from the yard.
 box(0,1.5,-5,10,3,.2);for(let x=-4;x<5;x+=2){box(x,1.8,-5.13,1.5,1.5,.04,'glass',false);}
 if(includeClassroom)for(const z of [-2,2]){box(0,6.38,z,4,.035,.32,'white',false);const light=new THREE.PointLight(0xfff3dd,8,8,2);light.position.set(0,6,z);root.add(light);}
 // Batch static geometry by material; interactive labels remain separate.
 root.updateMatrixWorld(true);
 for(const material of Object.values(mats)){
   const meshes=root.children.filter(o=>o.isMesh&&o.material===material);
   if(!meshes.length)continue;
   const geometries=meshes.map(mesh=>mesh.geometry.clone().applyMatrix4(mesh.matrixWorld));
   // Icosahedron geometry is non-indexed, while boxes are indexed. Each material
   // uses a consistent primitive type here, so they can be merged directly.
   const merged=mergeGeometries(geometries);
   if(merged){for(const mesh of meshes){root.remove(mesh);mesh.geometry.dispose();}const batch=new THREE.Mesh(merged,material);batch.castShadow=material!==mats.glass;batch.receiveShadow=true;root.add(batch);}
   geometries.forEach(g=>g.dispose());
 }
 const spawn=new THREE.Vector3(3.8,3.2,2.4);
 return {root,targets,spawn,zone:p=>p.y>2.9?(p.x<5?'2층 교실':p.x<8?'2층 복도':'계단 상부'):p.x>=8&&p.z>-1?'계단':p.z>-8?'1층 출입구':'운동장',dispose(){root.traverse(o=>{o.geometry?.dispose();});}};
}
