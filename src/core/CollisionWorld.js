import {MeshCollider} from './MeshCollider.js';
// All coordinates are metres. Feet position + a vertical capsule approximation.
export class CollisionWorld {
  constructor(){this.boxes=[];this.meshes=[];this.surfaces=[];this.radius=.18;this.height=1.7;}
  addBox(min,max){const box={min,max,enabled:true};this.boxes.push(box);return box;}
  addMesh(mesh){const collider=new MeshCollider(mesh);this.meshes.push(collider);return collider;}
  setHeight(position,height){const old=this.height;this.height=height;if(this.blocked(position.x,position.y,position.z)){this.height=old;return false;}return true;}
  addSurface(x0,x1,z0,z1,height){this.surfaces.push({x0,x1,z0,z1,height});}
  floorAt(x,z,currentY){let best=null;for(const s of this.surfaces){if(x>=s.x0&&x<=s.x1&&z>=s.z0&&z<=s.z1){if(s.triangle&&!insideTriangle(x,z,s.triangle))continue;const y=typeof s.height==='function'?s.height(x,z):s.height;if(Math.abs(y-currentY)<=.36&&(best===null||y>best))best=y;}}return best;}
  blocked(x,y,z){const radius=this.height<.6?Math.min(this.radius,.15):this.radius;return this.meshes.some(m=>m.intersects(x,y,z,this.height,radius))||this.boxes.some(b=>{if(!b.enabled||y+.08>=b.max.y||y+this.height<=b.min.y)return false;const nx=Math.max(b.min.x,Math.min(x,b.max.x)),nz=Math.max(b.min.z,Math.min(z,b.max.z));return (x-nx)**2+(z-nz)**2<radius**2;});}
  move(position,dx,dz){
    const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.08));
    for(let i=0;i<steps;i++)for(const axis of ['x','z']){
      const delta=axis==='x'?dx/steps:dz/steps;
      if(!delta)continue;
      const x=position.x+(axis==='x'?delta:0),z=position.z+(axis==='z'?delta:0);
      let y=this.floorAt(x,z,position.y);if(y===null)continue;
      if(this.blocked(x,y,z)){
        // Keep the trailing foot supported until the body clears a low edge.
        if(y<position.y&&position.y-y<=.24&&!this.blocked(x,position.y,z))y=position.y;
        else {
          const ahead=this.floorAt(x+(axis==='x'?Math.sign(delta)*this.radius:0),z+(axis==='z'?Math.sign(delta)*this.radius:0),position.y);
          if(ahead===null||ahead<=position.y||ahead-position.y>.24||this.blocked(x,ahead,z))continue;
          y=ahead;
        }
      }
      position.x=x;position.y=y;position.z=z;
    }
    return position;
  }
}

function insideTriangle(x,z,[a,b,c]){const side=(p,q)=>(x-q.x)*(p.z-q.z)-(p.x-q.x)*(z-q.z);const d=[side(a,b),side(b,c),side(c,a)];return !(d.some(v=>v<-.0001)&&d.some(v=>v>.0001));}
