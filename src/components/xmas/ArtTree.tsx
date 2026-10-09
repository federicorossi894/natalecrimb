import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { TreeOrnament, OrnamentKind } from '@/lib/data';
import { ornamentAnchor } from '@/lib/tree-layout';

export type ScenePalette = Record<'night'|'fir'|'needle'|'bark'|'gold'|'red'|'snow'|'ground'|'rim', string>;
type ArtProps = { ornaments: TreeOrnament[]; height: number; palette: ScenePalette; selected: TreeOrnament|null; onPick?: ((o:TreeOrnament)=>void)|undefined; arrivingId?: string|number|null|undefined; reduced: boolean };

function colored(g:THREE.BufferGeometry,color:string) {
  const c=new THREE.Color(color), count=g.getAttribute('position').count;
  const colors=new Float32Array(count*3);
  for(let i=0;i<count;i++)colors.set([c.r,c.g,c.b],i*3);
  g.setAttribute('color',new THREE.BufferAttribute(colors,3));return g.toNonIndexed();
}
function join(parts:THREE.BufferGeometry[]) {
  const merged=mergeGeometries(parts);parts.forEach(p=>p.dispose());
  return merged??new THREE.BufferGeometry();
}
function foliage(height:number,count:number,p:ScenePalette) {
  const parts:THREE.BufferGeometry[]=[];
  const tiers=10+Math.floor(Math.min(count,100)/20);
  // Overlapping scalloped boughs form a complete silhouette at every growth stage.
  for(let k=0;k<tiers;k++) {
    const y=0.09+k/tiers*0.82, r=height*0.34*(1-y);
    const g=new THREE.ConeGeometry(r,height*0.26,64,5,true).toNonIndexed();
    const a=g.getAttribute('position');
    for(let i=0;i<a.count;i++) {
      const x=a.getX(i),z=a.getZ(i),angle=Math.atan2(z,x);
      const ripple=1+0.045*Math.sin(angle*13+k*1.7)+0.025*Math.cos(angle*23);
      a.setXYZ(i,x*ripple,a.getY(i)+Math.sin(angle*13)*height*0.012,z*ripple);
    }
    g.computeVertexNormals();g.translate(0,height*(y+0.12),0);parts.push(colored(g,k%3===0?p.needle:p.fir));
  }
  // Thousands of individual tapered needle tips catch the warm side light.
  const pos:number[]=[],colors:number[]=[];
  const dark=new THREE.Color(p.fir),light=new THREE.Color(p.needle);
  for(let i=0;i<6500+Math.min(count,100)*22;i++) {
    const y=0.12+((i*0.6180339)%1)*0.82,a=i*2.3999632;
    const r=height*0.34*(1-y)*(0.82+0.18*((i*0.754877)%1));
    const x=Math.sin(a)*r,z=Math.cos(a)*r,l=height*(0.018+0.012*((i*0.37)%1)),w=l*0.18;
    pos.push(x-Math.cos(a)*w,y*height,z+Math.sin(a)*w,x+Math.cos(a)*w,y*height,z-Math.sin(a)*w,x+Math.sin(a)*l,y*height+l*0.35,z+Math.cos(a)*l);
    const c=dark.clone().lerp(light,(i%7)/6);for(let j=0;j<3;j++)colors.push(c.r,c.g,c.b);
  }
  const needles=new THREE.BufferGeometry();needles.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));needles.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));needles.computeVertexNormals();
  return { canopy:join(parts),needles };
}
function enamel(kind:OrnamentKind,p:ScenePalette) {
  const parts:THREE.BufferGeometry[]=[];
  const box=(w:number,h:number,d:number,x:number,y:number,z:number,c:string)=>{const g=new THREE.BoxGeometry(w,h,d);g.translate(x,y,z);parts.push(colored(g,c));};
  const shape=(points:[number,number][],depth:number,c:string,z=0)=>{const s=new THREE.Shape();points.forEach(([x,y],i)=>i===0?s.moveTo(x,y):s.lineTo(x,y));s.closePath();const g=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSize:0.012,bevelThickness:0.01,bevelSegments:2,steps:1});g.translate(0,0,z);parts.push(colored(g,c));};
  const heart=(scale:number,c:string,z:number)=>{const s=new THREE.Shape();s.moveTo(0,-0.14);s.bezierCurveTo(-0.27,0.03,-0.17,0.24,0,0.10);s.bezierCurveTo(0.17,0.24,0.27,0.03,0,-0.14);const g=new THREE.ExtrudeGeometry(s,{depth:0.065,bevelEnabled:true,bevelSize:0.016,bevelThickness:0.015,bevelSegments:3,steps:1});g.scale(scale,scale,1);g.translate(0,0,z);parts.push(colored(g,c));};
  if(kind==='dae') {
    box(0.32,0.31,0.09,0,0,0,p.red);box(0.13,0.035,0.04,0,0.18,0,p.gold);
    heart(0.65,p.snow,0.05);
    shape([[0.02,0.08],[-0.04,-0.01],[0,-0.01],[-0.02,-0.09],[0.07,0.01],[0.025,0.01]],0.015,p.gold,0.13);
  } else if(kind==='calore') {
    shape([[-0.19,0.13],[0.18,0.13],[0.18,0.035],[-0.19,0.035]],0.07,p.snow);
    shape([[0.025,0.065],[0.14,0.065],[0.11,-0.20],[0.01,-0.20]],0.075,p.red);
    for(let i=0;i<5;i++)box(0.012,0.06,0.016,0.02+i*0.018,-0.22,0.04,p.gold);
    for(let i=0;i<3;i++)box(0.30,0.008,0.012,-0.015,0.06+i*0.025,0.09,p.red);
  } else if(kind==='prossimita') {
    shape([[-0.23,-0.07],[-0.23,0.14],[0.12,0.14],[0.23,0.03],[0.23,-0.07]],0.09,p.snow);
    box(0.45,0.045,0.014,0,-0.025,0.11,p.red);box(0.075,0.07,0.015,0.135,0.08,0.11,p.fir);box(0.12,0.07,0.015,-0.12,0.08,0.11,p.fir);
    for(const x of [-0.14,0.15]) {const g=new THREE.CylinderGeometry(0.055,0.055,0.13,16);g.rotateX(Math.PI/2);g.translate(x,-0.08,0.05);parts.push(colored(g,p.ground));}
  } else heart(1.2,p.red,0);
  // Contrasting hanging loop and tiny satin bow, not an invented CRI insignia.
  box(0.008,0.19,0.008,0,0.29,0,p.gold);
  for(const side of [-1,1])shape([[0,0.21],[side*0.09,0.26],[side*0.085,0.16]],0.025,p.gold,0.07);
  return join(parts);
}
function GiftInstances({kind,...props}:ArtProps & {kind:OrnamentKind}) {
  const ref=useRef<THREE.InstancedMesh>(null),clock=useRef(0);
  const items=useMemo(()=>props.ornaments.filter(o=>o.kind===kind),[props.ornaments,kind]);
  const geometry=useMemo(()=>enamel(kind,props.palette),[kind,props.palette]);
  const dummy=useMemo(()=>new THREE.Object3D(),[]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  useEffect(()=>{clock.current=0;},[props.arrivingId,props.selected?.id]);
  useFrame((_,delta)=>{clock.current+=Math.min(delta,0.05);const m=ref.current;if(!m)return;
    items.forEach((o,i)=>{const a=ornamentAnchor(o,props.height);const entering=o.id===props.arrivingId&&!props.reduced?Math.max(0,1-clock.current/2.4):0;
      dummy.position.set(a[0],a[1]+entering*props.height,a[2]+entering);
      dummy.rotation.set(0,Math.atan2(a[0],a[2]),o.id===props.selected?.id&&!props.reduced?Math.sin(clock.current*2)*0.04:0);
      dummy.scale.setScalar((props.height*0.40)*(o.id===props.selected?.id?1.12:1));dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix);
    });m.instanceMatrix.needsUpdate=true;
  });
  return <instancedMesh ref={ref} args={[geometry,undefined,Math.max(1,items.length)]} count={items.length} frustumCulled={false} onClick={e=>{e.stopPropagation();if(e.delta>6)return;const o=items[e.instanceId??-1];if(o)props.onPick?.(o);}}><meshStandardMaterial vertexColors roughness={kind==='calore'?0.65:0.3} metalness={0.25} emissive={props.palette.gold} emissiveIntensity={0.055} /></instancedMesh>;
}
export function ArtTree(props:ArtProps) {
  const {height,palette,ornaments}=props;
  const geometry=useMemo(()=>foliage(height,ornaments.length,palette),[height,ornaments.length,palette]);
  const bulbs=useRef<THREE.InstancedMesh>(null);
  const lightCount=150+Math.min(ornaments.length,100)*2;
  const curve=useMemo(()=>new THREE.CatmullRomCurve3(Array.from({length:260},(_,i)=>{const y=0.12+i/259*0.81,a=i/259*Math.PI*2*6,r=height*0.355*(1-y)+0.025;return new THREE.Vector3(Math.sin(a)*r,y*height,Math.cos(a)*r);})),[height]);
  useEffect(()=>()=>{geometry.canopy.dispose();geometry.needles.dispose();},[geometry]);
  useEffect(()=>{const m=bulbs.current;if(!m)return;const d=new THREE.Object3D();for(let i=0;i<lightCount;i++){d.position.copy(curve.getPoint(i/(lightCount-1)));d.scale.setScalar(height*0.007);d.updateMatrix();m.setMatrixAt(i,d.matrix);}m.instanceMatrix.needsUpdate=true;},[curve,height,lightCount]);
  return <>
    <mesh geometry={geometry.canopy} castShadow receiveShadow><meshStandardMaterial vertexColors roughness={0.88} side={THREE.DoubleSide} /></mesh>
    <mesh geometry={geometry.needles}><meshStandardMaterial vertexColors roughness={0.72} side={THREE.DoubleSide} /></mesh>
    <mesh><tubeGeometry args={[curve,260,height*0.003,4,false]} /><meshStandardMaterial color={palette.gold} metalness={0.55} roughness={0.35} /></mesh>
    <instancedMesh ref={bulbs} args={[undefined,undefined,lightCount]}><sphereGeometry args={[1,8,6]} /><meshBasicMaterial color={palette.gold} toneMapped={false} /></instancedMesh>
    <mesh position={[0,0.045,0]} receiveShadow><cylinderGeometry args={[height*0.37,height*0.39,0.08,64]} /><meshStandardMaterial color={palette.snow} metalness={0.15} roughness={0.65} /></mesh>
    {(['dae','calore','prossimita','cuore'] as const).map(kind=><GiftInstances key={kind} {...props} kind={kind} />)}
  </>;
}