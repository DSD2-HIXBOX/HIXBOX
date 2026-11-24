import * as T from 'three';
export const ALERT_TEXT='지진 발생. 흔들림에 주의하고 안전한 장소에서 머리와 몸을 보호하세요.';
export class Phone {
 constructor(){
  this.root=new T.Group();this.root.name='오른손 스마트폰';
  const body=new T.Mesh(new T.BoxGeometry(.078,.16,.009),new T.MeshStandardMaterial({color:0x25282b,roughness:.38,metalness:.35}));this.root.add(body);
  this.canvas=document.createElement('canvas');this.canvas.width=512;this.canvas.height=1024;this.texture=new T.CanvasTexture(this.canvas);this.texture.colorSpace=T.SRGBColorSpace;
  const screen=new T.Mesh(new T.PlaneGeometry(.072,.151),new T.MeshBasicMaterial({map:this.texture,toneMapped:false}));screen.position.z=.0047;this.root.add(screen);
  const speaker=new T.Mesh(new T.BoxGeometry(.015,.0015,.0006),new T.MeshBasicMaterial({color:0x14171a}));speaker.position.set(0,.071,.0052);this.root.add(speaker);
  this.draw('peaceful');
 }
 draw(phase){if(this.phase===phase)return;this.phase=phase;const c=this.canvas.getContext('2d');c.fillStyle=phase==='peaceful'?'#10171e':'#dce3e8';c.fillRect(0,0,512,1024);
  if(phase!=='peaceful'){
   c.fillStyle='#273441';c.font='24px sans-serif';c.fillText('9:41',35,65);c.textAlign='right';c.fillText('LTE  ▰',478,65);c.textAlign='left';
   c.font='70px sans-serif';c.fillText('09:41',145,205);c.font='25px sans-serif';c.fillText('안전한 하루를 위해',153,250);
   c.fillStyle='#fafbfc';c.beginPath();c.roundRect(22,310,468,540,24);c.fill();c.fillStyle='#ad4b32';c.font='bold 29px sans-serif';c.fillText('안전 안내 · 지금',47,365);
   c.fillStyle='#17222b';c.font='bold 31px sans-serif';c.fillText('[긴급재난문자]',47,426);c.font='36px sans-serif';let line='',y=486;for(const ch of ALERT_TEXT){if(c.measureText(line+ch).width>418){c.fillText(line,47,y);line='';y+=47;}line+=ch;}c.fillText(line,47,y);
   c.fillStyle='#596670';c.font='24px sans-serif';c.fillText(phase==='alert'?'내용을 확인해 주세요':'확인한 재난문자',47,812);
  }
  c.fillStyle='#77828b';c.beginPath();c.roundRect(170,986,172,6,3);c.fill();this.texture.needsUpdate=true;
 }
 dispose(){this.root.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});this.texture.dispose();}
}
