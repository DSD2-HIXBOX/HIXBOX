import * as T from 'three';
// Render-only settings: source colors, texture pixels, geometry and collision
// positions are left untouched. Depth bias resolves coincident finish/backing.
export const DAYLIGHT=Object.freeze({exposure:.82,hemisphere:.75,sun:1.15,environment:.16,near:.12,far:160});
export function finishDepthPriority(name=''){
 if(/^\[Wood Floor\]/i.test(name))return -5;
 if(/^floor terrazzo/i.test(name))return -4;
 if(/^\[Color M01\]/i.test(name))return -3;
 if(/^\[Color M03\]/i.test(name))return -2;
 if(/^\[Color M0[45]\]/i.test(name)||/^\[Cladding Stucco White\]/i.test(name)||/Demountable_Ceiling|0009_Linen/i.test(name))return -1;
 return 0;
}
export function applySurfaceStability(root){const seen=new Set();root.traverse(o=>{if(!o.isMesh)return;for(const material of(Array.isArray(o.material)?o.material:[o.material])){if(!material||seen.has(material)||material.transparent||material.opacity<1)continue;seen.add(material);const units=finishDepthPriority(material.name);if(!units)continue;material.polygonOffset=true;material.polygonOffsetFactor=0;material.polygonOffsetUnits=units;material.depthTest=true;material.depthWrite=true;material.needsUpdate=true;}});return seen.size;}
export function isStableShell(o){const materials=Array.isArray(o.material)?o.material:[o.material];return materials.some(m=>m&&(/floor|terrazzo|cladding|brick|ceiling|concrete|Front Default|Color M0|Linen|stair_rail/i.test(m.name)));}
export function daylightLights(){const hemisphere=new T.HemisphereLight(0xe7efff,0xb0a392,DAYLIGHT.hemisphere),sun=new T.DirectionalLight(0xfff4e5,DAYLIGHT.sun);sun.position.set(30,70,40);return[hemisphere,sun];}
