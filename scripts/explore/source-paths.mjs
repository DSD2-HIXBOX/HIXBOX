import fs from'node:fs';import{fileURLToPath}from'node:url';
export const EXTERIOR_GLB=process.env.SCHOOL_EXTERIOR_GLB??fileURLToPath(new URL('../../source-models/exterior.glb',import.meta.url));
export const INTERIOR_GLB=process.env.SCHOOL_INTERIOR_GLB??fileURLToPath(new URL('../../source-models/interior.glb',import.meta.url));
for(const path of[EXTERIOR_GLB,INTERIOR_GLB])if(!fs.existsSync(path))throw Error('원본 모델이 없습니다: '+path+' — 프로젝트의 source-models 폴더를 확인하세요.');
