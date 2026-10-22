import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { TreeOrnament, OrnamentKind } from '@/lib/data';
import { canopyTiers, treeLayout, type Placement } from '@/lib/tree-layout';

export type ScenePalette = Record<'night'|'fir'|'needle'|'bark'|'gold'|'red'|'snow'|'ground'|'rim'|'ivory'|'burgundy'|'forest'|'crimson', string>;
type ArtProps = { ornaments: TreeOrnament[]; height: number; palette: ScenePalette; selected: TreeOrnament|null; onPick?: ((o:TreeOrnament)=>void)|undefined; arrivingId?: string|number|null|undefined; reduced: boolean };

const KINDS: OrnamentKind[] = ['calore','dae','prossimita','cuore'];
const shade=(hex:string,amount:number)=>{const c=new THREE.Color(hex);return '#'+(amount<0?c.lerp(new THREE.Color(0,0,0),-amount):c.lerp(new THREE.Color(1,1,1),amount)).getHexString();};
/** Bauble palettes mirror the gift boxes: red/ivory, forest/gold, ivory/burgundy, burgundy/gold. */
function baubleStyle(kind:OrnamentKind,p:ScenePalette){
  if(kind==='calore')return {base:p.crimson,motif:p.ivory,ribbon:p.ivory,accent:p.gold};
  if(kind==='dae')return {base:p.forest,motif:p.red,ribbon:p.gold,accent:p.ivory};
  if(kind==='prossimita')return {base:p.ivory,motif:p.burgundy,ribbon:p.burgundy,accent:p.gold};
  return {base:p.burgundy,motif:p.gold,ribbon:p.gold,accent:p.ivory};
}
function heartPath(g:CanvasRenderingContext2D,x:number,y:number,s:number){g.beginPath();g.moveTo(x,y+s*0.9);g.bezierCurveTo(x-s*1.7,y-s*0.15,x-s*0.75,y-s*1.35,x,y-s*0.45);g.bezierCurveTo(x+s*0.75,y-s*1.35,x+s*1.7,y-s*0.15,x,y+s*0.9);g.closePath();}
function sparkle(g:CanvasRenderingContext2D,x:number,y:number,r:number){g.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4,rr=i%2?r*0.28:r;g.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);}g.closePath();g.fill();}
function drawMotif(g:CanvasRenderingContext2D,kind:OrnamentKind,x:number,y:number,st:ReturnType<typeof baubleStyle>,p:ScenePalette){
  g.lineJoin='round';g.lineCap='round';
  if(kind==='calore'){
    const Y=y-18,m=st.motif;
    const tail=(tx:number,ty:number,rot:number,len:number)=>{g.save();g.translate(tx,ty);g.rotate(rot);g.fillStyle=m;g.beginPath();g.roundRect(-19,0,38,len,8);g.fill();g.fillStyle=st.base;g.fillRect(-19,len*0.45,38,7);g.fillRect(-19,len*0.63,38,7);g.strokeStyle=m;g.lineWidth=4;for(let i=0;i<5;i++){g.beginPath();g.moveTo(-15+i*7.5,len);g.lineTo(-15+i*7.5,len+16);g.stroke();}g.restore();};
    tail(x-14,Y+8,0.14,78);
    g.strokeStyle=m;g.lineWidth=38;g.beginPath();g.moveTo(x-66,Y-40);g.quadraticCurveTo(x,Y+42,x+66,Y-40);g.stroke();
    g.strokeStyle=st.base;g.lineWidth=5;for(const o of [-9,9]){g.beginPath();g.moveTo(x-64,Y-40+o);g.quadraticCurveTo(x,Y+42+o,x+64,Y-40+o);g.stroke();}
    tail(x+22,Y+10,-0.2,92);
    g.fillStyle=m;g.beginPath();g.ellipse(x+6,Y+8,25,20,0,0,Math.PI*2);g.fill();
  } else if(kind==='dae'){
    const Y=y+4;
    g.fillStyle=st.motif;g.beginPath();g.roundRect(x-72,Y-62,144,128,20);g.fill();g.strokeStyle=p.ivory;g.lineWidth=6;g.stroke();
    g.lineWidth=9;g.beginPath();g.moveTo(x-26,Y-64);g.lineTo(x-26,Y-84);g.lineTo(x+26,Y-84);g.lineTo(x+26,Y-64);g.stroke();
    g.fillStyle=p.ivory;heartPath(g,x,Y-12,32);g.fill();
    g.fillStyle=p.gold;g.strokeStyle=st.motif;g.lineWidth=2.5;g.beginPath();[[x+7,Y-44],[x-14,Y-8],[x-1,Y-8],[x-8,Y+16],[x+15,Y-19],[x+2,Y-19]].forEach(([px,py],i)=>i?g.lineTo(px!,py!):g.moveTo(px!,py!));g.closePath();g.fill();g.stroke();
    g.fillStyle=p.ivory;g.font='700 30px Georgia, serif';g.textAlign='center';g.textBaseline='middle';g.fillText('DAE',x,Y+44);
  } else if(kind==='prossimita'){
    const Y=y+6,m=st.motif;
    g.fillStyle=m;g.beginPath();g.moveTo(x-92,Y+28);g.lineTo(x-92,Y-46);g.quadraticCurveTo(x-92,Y-54,x-84,Y-54);g.lineTo(x+34,Y-54);g.lineTo(x+70,Y-16);g.lineTo(x+90,Y-10);g.quadraticCurveTo(x+96,Y-8,x+96,Y);g.lineTo(x+96,Y+28);g.closePath();g.fill();
    g.fillStyle=p.ivory;g.beginPath();g.roundRect(x-80,Y-42,44,26,5);g.fill();g.beginPath();g.roundRect(x-28,Y-42,44,26,5);g.fill();
    g.beginPath();g.moveTo(x+26,Y-42);g.lineTo(x+36,Y-42);g.lineTo(x+62,Y-16);g.lineTo(x+26,Y-16);g.closePath();g.fill();
    g.fillStyle=p.gold;g.fillRect(x-92,Y-4,188,7);
    g.fillStyle=p.ivory;heartPath(g,x-40,Y+13,9);g.fill();
    for(const wx of [x-52,x+56]){g.fillStyle=shade(m,-0.6);g.beginPath();g.arc(wx,Y+30,19,0,Math.PI*2);g.fill();g.strokeStyle=st.base;g.lineWidth=5;g.stroke();g.fillStyle=p.gold;g.beginPath();g.arc(wx,Y+30,7,0,Math.PI*2);g.fill();}
  } else {
    const grad=g.createRadialGradient(x-22,y-30,6,x,y,92);grad.addColorStop(0,p.ivory);grad.addColorStop(0.35,p.gold);grad.addColorStop(1,shade(p.gold,-0.35));
    g.fillStyle=grad;heartPath(g,x,y+4,62);g.fill();g.strokeStyle=p.ivory;g.lineWidth=3;heartPath(g,x,y+4,50);g.stroke();
    g.fillStyle=p.ivory;sparkle(g,x+80,y-58,15);sparkle(g,x-84,y+42,11);sparkle(g,x+72,y+62,8);
  }
}
function paintBauble(kind:OrnamentKind,p:ScenePalette){
  const W=1024,H=512,c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');
  if(!g)return new THREE.Texture();
  const st=baubleStyle(kind,p);
  const bg=g.createLinearGradient(0,0,0,H);bg.addColorStop(0,shade(st.base,-0.45));bg.addColorStop(0.5,st.base);bg.addColorStop(1,shade(st.base,-0.5));g.fillStyle=bg;g.fillRect(0,0,W,H);
  // Satin pinstripes and fine gold glitter: a painted, velvety finish rather than a mirror ball.
  g.globalAlpha=0.07;g.fillStyle=st.motif;for(let x=0;x<W;x+=16)g.fillRect(x,0,6,H);
  let seed=kind.length*977+13;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
  g.fillStyle=p.gold;for(let i=0;i<260;i++){g.globalAlpha=0.25+rnd()*0.4;g.beginPath();g.arc(rnd()*W,H*0.2+rnd()*H*0.6,1+rnd()*1.6,0,Math.PI*2);g.fill();}
  g.globalAlpha=1;
  for(const y of [H*0.2,H*0.8]){g.fillStyle=p.gold;g.fillRect(0,y-4,W,8);g.fillStyle=st.accent;for(let x=10;x<W;x+=24){g.beginPath();g.arc(x,y+(y<H/2?18:-18),3.4,0,Math.PI*2);g.fill();}}
  for(const cx of [W*0.25,W*0.75]){
    g.fillStyle=shade(st.base,kind==='prossimita'?-0.05:0.1);g.beginPath();g.arc(cx,H/2,118,0,Math.PI*2);g.fill();
    g.strokeStyle=p.gold;g.lineWidth=7;g.stroke();g.lineWidth=2;g.beginPath();g.arc(cx,H/2,131,0,Math.PI*2);g.stroke();
    drawMotif(g,kind,cx,H/2,st,p);
  }
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;
}
function paintTag(p:ScenePalette){
  const c=document.createElement('canvas');c.width=256;c.height=160;const g=c.getContext('2d');if(!g)return new THREE.Texture();
  g.fillStyle=p.ivory;g.fillRect(0,0,256,160);g.strokeStyle=p.gold;g.lineWidth=7;g.beginPath();g.roundRect(10,10,236,140,14);g.stroke();
  g.fillStyle=shade(p.ivory,-0.3);g.beginPath();g.arc(32,80,9,0,Math.PI*2);g.fill();
  g.fillStyle=p.red;heartPath(g,204,48,15);g.fill();
  g.strokeStyle=p.burgundy;g.globalAlpha=0.75;g.lineWidth=4;g.lineCap='round';
  for(const [y,w] of [[78,150],[102,132],[126,96]] as const){g.beginPath();for(let x=0;x<=w;x+=6)g.lineTo(62+x,y+Math.sin(x*0.22+y)*3);g.stroke();}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
function glowTexture(){
  const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');if(!g)return new THREE.Texture();
  const r=g.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(0.25,'rgba(255,255,255,0.55)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,64,64);
  return new THREE.CanvasTexture(c);
}

/** Stylised drooping fir: stacked scalloped skirts, bough-tip tufts and light strings draped on each tier. */
function buildCanopy(height:number,count:number,p:ScenePalette){
  const n=Math.min(count,200),tiers=canopyTiers(height,count),T=tiers.length,S=96,RING=7;
  const pos:number[]=[],col:number[]=[],idx:number[]=[];
  const deep=new THREE.Color(p.fir).multiplyScalar(0.22),mid=new THREE.Color(p.fir).multiplyScalar(0.46),tip=new THREE.Color(p.needle).multiplyScalar(0.55);
  const tufts:{pos:THREE.Vector3;dir:THREE.Vector3;s:number;c:THREE.Color}[]=[];
  const bulbs:THREE.Vector3[]=[];
  const perLobe=2+n/60;
  for(let k=0;k<T;k++){
    const f=k/(T-1),{yb,th,rl,lobes,phase}=tiers[k]!;
    const base=pos.length/3;
    const at=(a:number,t:number)=>{const lobe=Math.pow(Math.abs(Math.sin((a-phase)*lobes/2)),0.7);const r=rl*Math.pow(t,0.85)*(0.86+0.14*lobe);return {lobe,r,y:yb+th*(1-Math.pow(t,1.5))-th*0.16*lobe*Math.pow(t,3)};};
    for(let j=0;j<=RING;j++){const t=j/RING;for(let s=0;s<=S;s++){const a=phase+s/S*Math.PI*2,{lobe,r,y}=at(a,t);pos.push(Math.sin(a)*r,y,Math.cos(a)*r);const c=deep.clone().lerp(mid,Math.min(1,t*1.4)).lerp(tip,Math.pow(t,3)*(0.35+0.65*lobe)).multiplyScalar(0.9+0.2*f);col.push(c.r,c.g,c.b);}}
    for(let j=0;j<RING;j++)for(let s=0;s<S;s++){const a=base+j*(S+1)+s,b=a+S+1;idx.push(a,b,a+1,b,b+1,a+1);}
    for(let i=0;i<lobes;i++){
      for(const [a,t] of [[phase+(2*i+1)*Math.PI/lobes,1],[phase+2*i*Math.PI/lobes,0.8]] as const){const q=at(a,t);const out=new THREE.Vector3(Math.sin(a),0,Math.cos(a));
        tufts.push({pos:new THREE.Vector3(out.x*q.r,q.y-height*0.008,out.z*q.r),dir:out.clone().multiplyScalar(0.8).add(new THREE.Vector3(0,-0.6,0)).normalize(),s:height*(t===1?0.07:0.055),c:mid.clone().lerp(tip,0.55+0.35*((i*0.618+k*0.3)%1)).multiplyScalar(0.92+0.2*f)});}
    }
    const lights=Math.round(lobes*perLobe);
    for(let i=0;i<lights&&bulbs.length<640;i++){const a=phase+(i+0.5)/lights*Math.PI*2,q=at(a,0.97);bulbs.push(new THREE.Vector3(Math.sin(a)*q.r*1.03,q.y-height*0.012,Math.cos(a)*q.r*1.03));}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(col,3));geometry.setIndex(idx);geometry.computeVertexNormals();
  return {geometry,tufts,bulbs};
}

function Canopy({data}:{data:ReturnType<typeof buildCanopy>}) {
  const tuftRef=useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(()=>{const m=tuftRef.current;if(!m)return;const d=new THREE.Object3D(),up=new THREE.Vector3(0,1,0);data.tufts.forEach((t,i)=>{d.position.copy(t.pos);d.quaternion.setFromUnitVectors(up,t.dir);d.scale.set(t.s*0.34,t.s,t.s*0.34);d.updateMatrix();m.setMatrixAt(i,d.matrix);m.setColorAt(i,t.c);});m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;},[data]);
  return <>
    <mesh geometry={data.geometry} castShadow receiveShadow><meshStandardMaterial vertexColors roughness={0.82} side={THREE.DoubleSide} /></mesh>
    <instancedMesh key={data.tufts.length} ref={tuftRef} args={[undefined,undefined,data.tufts.length]} castShadow><coneGeometry args={[1,1,5,1]} /><meshStandardMaterial roughness={0.8} /></instancedMesh>
  </>;
}

function TreeLights({bulbs,height,palette,reduced}:{bulbs:THREE.Vector3[];height:number;palette:ScenePalette;reduced:boolean}) {
  const cores=useRef<THREE.InstancedMesh>(null);
  const glow=useMemo(()=>glowTexture(),[]);
  const {geometry,base}=useMemo(()=>{
    const warm=new THREE.Color(palette.gold),white=new THREE.Color(palette.ivory),rose=new THREE.Color(palette.red).lerp(white,0.45);
    const base=bulbs.map((_,i)=>i%7===3?rose:i%3===0?white:warm);
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(bulbs.flatMap(b=>[b.x,b.y,b.z]),3));g.setAttribute('color',new THREE.Float32BufferAttribute(base.flatMap(c=>[c.r,c.g,c.b]),3));
    return {geometry:g,base};
  },[bulbs,palette]);
  useEffect(()=>()=>{geometry.dispose();},[geometry]);
  useEffect(()=>()=>glow.dispose(),[glow]);
  useLayoutEffect(()=>{const m=cores.current;if(!m)return;const d=new THREE.Object3D();bulbs.forEach((b,i)=>{d.position.copy(b);d.scale.setScalar(height*0.0085);d.updateMatrix();m.setMatrixAt(i,d.matrix);m.setColorAt(i,base[i]!);});m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;},[bulbs,base,height]);
  useFrame(({clock})=>{if(reduced)return;const attr=geometry.getAttribute('color') as THREE.BufferAttribute,t=clock.elapsedTime;
    for(let i=0;i<base.length;i++){const c=base[i]!,f=0.55+0.45*Math.sin(t*(1.1+(i%5)*0.33)+i*1.7);attr.setXYZ(i,c.r*f,c.g*f,c.b*f);}attr.needsUpdate=true;});
  return <>
    <instancedMesh key={bulbs.length} ref={cores} args={[undefined,undefined,bulbs.length]}><icosahedronGeometry args={[1,0]} /><meshBasicMaterial toneMapped={false} /></instancedMesh>
    <points geometry={geometry}><pointsMaterial size={height*0.065} sizeAttenuation map={glow} vertexColors transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></points>
  </>;
}

function localParts(R:number){
  const m=(p:[number,number,number],s:[number,number,number],rz=0)=>new THREE.Matrix4().compose(new THREE.Vector3(...p),new THREE.Quaternion().setFromEuler(new THREE.Euler(0,0,rz)),new THREE.Vector3(...s));
  const from=new THREE.Vector3(R*0.12,R*1.0,R*0.12),to=new THREE.Vector3(R*0.62,R*0.12,R*0.36),mid=from.clone().add(to).multiplyScalar(0.5);
  const string=new THREE.Matrix4().lookAt(mid,to,new THREE.Vector3(0,1,0));
  const look=new THREE.Object3D();look.position.copy(mid);look.lookAt(to);look.scale.set(R*0.025,R*0.025,from.distanceTo(to));look.updateMatrix();string.copy(look.matrix);
  return {
    bauble:m([0,0,0],[R,R,R]),
    cap:m([0,R*0.97,0],[R*0.3,R*0.2,R*0.3]),
    ribbon:m([0,R*1.5,0],[R*0.1,R*0.95,R*0.025]),
    bowL:m([-R*0.19,R*1.22,R*0.05],[R*0.2,R*0.09,R*0.05],0.45),
    bowR:m([R*0.19,R*1.22,R*0.05],[R*0.2,R*0.09,R*0.05],-0.45),
    knot:m([0,R*1.2,R*0.06],[R*0.075,R*0.075,R*0.075]),
    tag:m([R*1.05,-R*0.12,R*0.38],[R*0.95,R*0.6,R*0.03],0.14),
    string,
    hit:m([0,R*0.3,0],[R*1.3,R*1.3,R*1.3]),
  };
}

type Live={x:number;y:number;z:number;lean:number;theta:number};
function Baubles({ornaments,height,palette,selected,arrivingId,reduced,onPick}:ArtProps) {
  const layout=useMemo(()=>treeLayout(ornaments.length,height),[ornaments.length,height]);
  const textures=useMemo(()=>Object.fromEntries(KINDS.map(k=>[k,paintBauble(k,palette)])) as Record<OrnamentKind,THREE.Texture>,[palette]);
  const tagTex=useMemo(()=>paintTag(palette),[palette]);
  useEffect(()=>()=>{Object.values(textures).forEach(t=>t.dispose());tagTex.dispose();},[textures,tagTex]);
  const byKind=useMemo(()=>Object.fromEntries(KINDS.map(k=>[k,ornaments.filter(o=>o.kind===k)])) as Record<OrnamentKind,TreeOrnament[]>,[ornaments]);
  const tagged=useMemo(()=>ornaments.filter(o=>o.dedica),[ornaments]);
  // Parts are built at unit radius; the live radius is applied per frame so growth eases instead of jumping.
  const local=useMemo(()=>localParts(1),[]);
  const baubleRefs=useRef<Partial<Record<OrnamentKind,THREE.InstancedMesh|null>>>({});
  const cap=useRef<THREE.InstancedMesh>(null),ribbon=useRef<THREE.InstancedMesh>(null),bow=useRef<THREE.InstancedMesh>(null),tag=useRef<THREE.InstancedMesh>(null),string=useRef<THREE.InstancedMesh>(null),hit=useRef<THREE.InstancedMesh>(null);
  const clock=useRef(0),dirty=useRef(true),wasAnimating=useRef(false);
  const live=useRef(new Map<TreeOrnament['id'],Live>()),liveR=useRef(0);
  const tmp=useMemo(()=>({m:new THREE.Matrix4(),out:new THREE.Matrix4(),piv:new THREE.Matrix4(),rz:new THREE.Matrix4(),rx:new THREE.Matrix4(),s:new THREE.Matrix4(),v:new THREE.Vector3()}),[]);
  useEffect(()=>{dirty.current=true;},[ornaments,height,selected,arrivingId,layout]);
  useEffect(()=>{clock.current=0;},[arrivingId,selected?.id]);
  useLayoutEffect(()=>{
    const r=ribbon.current,b=bow.current;if(!r||!b)return;
    ornaments.forEach((o,i)=>{const c=new THREE.Color(baubleStyle(o.kind,palette).ribbon);r.setColorAt(i,c);for(let j=0;j<3;j++)b.setColorAt(i*3+j,c);});
    if(r.instanceColor)r.instanceColor.needsUpdate=true;if(b.instanceColor)b.instanceColor.needsUpdate=true;
  },[ornaments,palette]);
  /** Eases every bauble toward its layout slot; returns true while anything is still settling. */
  const settle=(dt:number)=>{
    const k=reduced?1:1-Math.exp(-4*dt),R=layout[0]?.R??0;let moving=false;
    if(!liveR.current||reduced)liveR.current=R;else{liveR.current+=(R-liveR.current)*k;if(Math.abs(R-liveR.current)>1e-4)moving=true;}
    const seen=new Set<TreeOrnament['id']>();
    ornaments.forEach((o,i)=>{const p:Placement|undefined=layout[i];if(!p)return;seen.add(o.id);const c=live.current.get(o.id);
      if(!c){live.current.set(o.id,{x:p.pos[0],y:p.pos[1],z:p.pos[2],lean:p.lean,theta:p.theta});return;}
      c.x+=(p.pos[0]-c.x)*k;c.y+=(p.pos[1]-c.y)*k;c.z+=(p.pos[2]-c.z)*k;c.lean+=(p.lean-c.lean)*k;c.theta=p.theta;
      if(Math.abs(p.pos[0]-c.x)+Math.abs(p.pos[1]-c.y)+Math.abs(p.pos[2]-c.z)>1e-4)moving=true;});
    for(const id of live.current.keys())if(!seen.has(id))live.current.delete(id);
    return moving;
  };
  const matrixFor=(o:TreeOrnament,t:number)=>{
    const c=live.current.get(o.id),R=liveR.current;if(!c)return tmp.m.identity().clone();
    const len=Math.hypot(c.x,c.z)||1;tmp.v.set(c.x,c.y,c.z);
    let scale=1,sway=0,spin=0;
    if(o.id===arrivingId&&!reduced){const k=Math.min(1,t/2.6),e=1-Math.pow(1-k,3);tmp.v.y+=(1-e)*height*0.7;tmp.v.x+=c.x/len*(1-e)*R*5;tmp.v.z+=c.z/len*(1-e)*R*5;spin=(1-e)*Math.PI*2;scale=0.45+0.55*e+Math.sin(k*Math.PI)*0.18;}
    if(o.id===selected?.id){scale*=1.18;if(!reduced)sway=Math.sin(t*2.2)*0.07;}
    tmp.m.makeRotationY(c.theta+spin).setPosition(tmp.v).multiply(tmp.rx.makeRotationX(-c.lean)).multiply(tmp.s.makeScale(R,R,R));
    tmp.piv.makeTranslation(0,1.9,0);tmp.m.multiply(tmp.piv).multiply(tmp.rz.makeRotationZ(sway));tmp.piv.makeTranslation(0,-1.9,0);tmp.m.multiply(tmp.piv).multiply(tmp.s.makeScale(scale,scale,scale));
    return tmp.m.clone();
  };
  const writeAll=(t:number)=>{
    const mats=new Map<TreeOrnament['id'],THREE.Matrix4>();ornaments.forEach(o=>mats.set(o.id,matrixFor(o,t)));
    const put=(mesh:THREE.InstancedMesh|null|undefined,i:number,base:THREE.Matrix4,part:THREE.Matrix4)=>{if(!mesh)return;tmp.out.multiplyMatrices(base,part);mesh.setMatrixAt(i,tmp.out);};
    for(const k of KINDS){const mesh=baubleRefs.current[k];byKind[k].forEach((o,i)=>put(mesh,i,mats.get(o.id)!,local.bauble));if(mesh)mesh.instanceMatrix.needsUpdate=true;}
    ornaments.forEach((o,i)=>{const M=mats.get(o.id)!;put(cap.current,i,M,local.cap);put(ribbon.current,i,M,local.ribbon);put(bow.current,i*3,M,local.bowL);put(bow.current,i*3+1,M,local.bowR);put(bow.current,i*3+2,M,local.knot);put(hit.current,i,M,local.hit);});
    tagged.forEach((o,i)=>{const M=mats.get(o.id)!;put(tag.current,i,M,local.tag);put(string.current,i,M,local.string);});
    for(const mesh of [cap.current,ribbon.current,bow.current,hit.current,tag.current,string.current])if(mesh){mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();}
  };
  useFrame((_,delta)=>{
    const dt=Math.min(delta,0.05);clock.current+=dt;
    const settling=settle(dt);
    const animating=settling||(arrivingId!=null&&!reduced&&clock.current<2.8)||(selected!=null&&!reduced);
    if(!animating&&!dirty.current&&!wasAnimating.current)return;
    wasAnimating.current=animating;dirty.current=false;writeAll(clock.current);
  });
  const n=ornaments.length,nt=tagged.length;
  return <>
    {KINDS.map(k=><instancedMesh key={`${k}-${byKind[k].length}`} ref={m=>{baubleRefs.current[k]=m;}} args={[undefined,undefined,Math.max(1,byKind[k].length)]} count={byKind[k].length} castShadow frustumCulled={false}>
      <sphereGeometry args={[1,40,28]} />
      <meshPhysicalMaterial map={textures[k]} emissiveMap={textures[k]} emissive="#ffffff" emissiveIntensity={0.14} roughness={0.42} metalness={0.06} clearcoat={0.5} clearcoatRoughness={0.38} />
    </instancedMesh>)}
    <instancedMesh key={`cap-${n}`} ref={cap} args={[undefined,undefined,Math.max(1,n)]} count={n} frustumCulled={false}><cylinderGeometry args={[1,1,1,16]} /><meshStandardMaterial color={palette.gold} metalness={0.85} roughness={0.28} /></instancedMesh>
    <instancedMesh key={`rib-${n}`} ref={ribbon} args={[undefined,undefined,Math.max(1,n)]} count={n} frustumCulled={false}><boxGeometry /><meshStandardMaterial roughness={0.45} metalness={0.15} /></instancedMesh>
    <instancedMesh key={`bow-${n}`} ref={bow} args={[undefined,undefined,Math.max(1,n*3)]} count={n*3} frustumCulled={false}><sphereGeometry args={[1,14,10]} /><meshStandardMaterial roughness={0.42} metalness={0.2} /></instancedMesh>
    <instancedMesh key={`tag-${nt}`} ref={tag} args={[undefined,undefined,Math.max(1,nt)]} count={nt} frustumCulled={false}><boxGeometry /><meshStandardMaterial map={tagTex} emissiveMap={tagTex} emissive="#ffffff" emissiveIntensity={0.18} roughness={0.7} /></instancedMesh>
    <instancedMesh key={`str-${nt}`} ref={string} args={[undefined,undefined,Math.max(1,nt)]} count={nt} frustumCulled={false}><boxGeometry /><meshBasicMaterial color={palette.gold} /></instancedMesh>
    <instancedMesh key={`hit-${n}`} ref={hit} args={[undefined,undefined,Math.max(1,n)]} count={n} frustumCulled={false}
      onClick={e=>{e.stopPropagation();if(e.delta>6)return;const o=ornaments[e.instanceId??-1];if(o)onPick?.(o);}}
      onPointerOver={()=>{document.body.style.cursor='pointer';}} onPointerOut={()=>{document.body.style.cursor='';}}>
      <sphereGeometry args={[1,10,8]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </instancedMesh>
  </>;
}

function BaseGifts({height,count,palette}:{height:number;count:number;palette:ScenePalette}) {
  const box=useRef<THREE.InstancedMesh>(null),band=useRef<THREE.InstancedMesh>(null);
  const items=useMemo(()=>{const styles=[[palette.crimson,palette.ivory],[palette.forest,palette.gold],[palette.ivory,palette.burgundy],[palette.burgundy,palette.gold]] as const;
    return Array.from({length:4+Math.min(6,Math.floor(count/20))},(_,i)=>{const a=i*2.4+0.6,r=height*(0.34+((i*0.37)%1)*0.11),s=height*(0.065+((i*0.61)%1)*0.04);return {x:Math.sin(a)*r,z:Math.cos(a)*r,s,rot:a*1.3,colors:styles[i%4]!};});},[height,count,palette]);
  useLayoutEffect(()=>{const b=box.current,r=band.current;if(!b||!r)return;const d=new THREE.Object3D();
    items.forEach((g,i)=>{d.position.set(g.x,0.085+g.s/2,g.z);d.rotation.set(0,g.rot,0);d.scale.set(g.s*1.15,g.s,g.s);d.updateMatrix();b.setMatrixAt(i,d.matrix);b.setColorAt(i,new THREE.Color(g.colors[0]));
      const rc=new THREE.Color(g.colors[1]);d.scale.set(g.s*1.17,g.s*1.02,g.s*0.16);d.updateMatrix();r.setMatrixAt(i*2,d.matrix);r.setColorAt(i*2,rc);d.scale.set(g.s*0.18,g.s*1.02,g.s*1.02);d.updateMatrix();r.setMatrixAt(i*2+1,d.matrix);r.setColorAt(i*2+1,rc);});
    for(const m of [b,r]){m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;}},[items]);
  return <>
    <instancedMesh key={`gift-${items.length}`} ref={box} args={[undefined,undefined,items.length]} castShadow receiveShadow><boxGeometry /><meshStandardMaterial roughness={0.55} /></instancedMesh>
    <instancedMesh key={`band-${items.length}`} ref={band} args={[undefined,undefined,items.length*2]}><boxGeometry /><meshStandardMaterial roughness={0.35} metalness={0.3} /></instancedMesh>
  </>;
}

export function ArtTree(props:ArtProps) {
  const {height,palette,ornaments,reduced}=props;
  const data=useMemo(()=>buildCanopy(height,ornaments.length,palette),[height,ornaments.length,palette]);
  useEffect(()=>()=>data.geometry.dispose(),[data]);
  return <>
    <Canopy data={data} />
    <TreeLights bulbs={data.bulbs} height={height} palette={palette} reduced={reduced} />
    <mesh position={[0,height*0.07,0]} castShadow><cylinderGeometry args={[height*0.03,height*0.045,height*0.14,12]} /><meshStandardMaterial color={palette.bark} roughness={0.9} /></mesh>
    <mesh position={[0,0.045,0]} receiveShadow><cylinderGeometry args={[height*0.5,height*0.53,0.08,64]} /><meshStandardMaterial color={palette.snow} metalness={0.1} roughness={0.7} /></mesh>
    <BaseGifts height={height} count={ornaments.length} palette={palette} />
    <Baubles {...props} />
  </>;
}
