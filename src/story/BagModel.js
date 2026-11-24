import * as T from 'three';
export class BagModel {
 constructor(){this.root=new T.Group();this.root.name='대피용 가방';const cloth=new T.MeshStandardMaterial({color:0x38474e,roughness:.94}),trim=new T.MeshStandardMaterial({color:0x222b2f,roughness:.8});
  const add=(geometry,material,p)=>{const m=new T.Mesh(geometry,material);m.position.set(...p);this.root.add(m);return m;};
  add(new T.BoxGeometry(.28,.34,.13),cloth,[0,0,0]);add(new T.BoxGeometry(.23,.15,.045),cloth,[0,-.065,.08]);add(new T.BoxGeometry(.22,.006,.008),trim,[0,.013,.108]);
  for(const x of[-.09,.09])add(new T.TorusGeometry(.07,.012,6,12,Math.PI),trim,[x,-.015,-.075]).scale.set(.45,1.7,1);
  add(new T.TorusGeometry(.042,.009,6,12,Math.PI),trim,[0,.17,0]);this.root.visible=false;
 }
 dispose(){const materials=new Set();this.root.traverse(o=>{o.geometry?.dispose();if(o.material)materials.add(o.material);});materials.forEach(m=>m.dispose());this.root.removeFromParent();}
}
