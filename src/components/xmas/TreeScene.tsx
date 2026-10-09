import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, OrbitControls } from '@react-three/drei';
import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsType } from 'three-stdlib';
import { ArtTree } from './ArtTree';
import type { TreeOrnament } from '@/lib/data';
import { ornamentAnchor, treeHeight } from '@/lib/tree-layout';

type Palette = Record<'night'|'fir'|'needle'|'bark'|'gold'|'red'|'snow'|'ground'|'rim', string>;
type Props = { ornaments: TreeOrnament[]; selected: TreeOrnament | null; onPick?: (o: TreeOrnament) => void; tv?: boolean; arrivingId?: string | number | null; resetKey?: number; reduced: boolean };

class SceneBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  override render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
function TreeStar({height,palette}:{height:number;palette:Palette}) {
  const shape=useMemo(()=>{const s=new THREE.Shape();for(let i=0;i<10;i++){const a=Math.PI/2+i*Math.PI/5,r=i%2===0?0.18:0.078;const x=Math.cos(a)*r,y=Math.sin(a)*r;i===0?s.moveTo(x,y):s.lineTo(x,y);}s.closePath();return s;},[]);
  return <group position={[0,height+0.08,0]}><mesh castShadow><extrudeGeometry args={[shape,{depth:0.045,bevelEnabled:true,bevelSize:0.018,bevelThickness:0.018,bevelSegments:2,steps:1}]} /><meshStandardMaterial color={palette.gold} emissive={palette.gold} emissiveIntensity={0.25} metalness={0.75} roughness={0.22} /></mesh><pointLight color={palette.gold} intensity={1.6} distance={1.5} /></group>;
}
function Decorations(props:Props & {height:number;palette:Palette}) {
  return <ArtTree ornaments={props.ornaments} height={props.height} palette={props.palette} selected={props.selected} onPick={props.onPick} arrivingId={props.arrivingId} reduced={props.reduced} />;
}
function CameraRig({height,selected,tv,reduced,resetKey}: {height:number;selected:TreeOrnament|null;tv?:boolean|undefined;reduced:boolean;resetKey?:number|undefined}) {
  const controls=useRef<OrbitControlsType>(null);
  const { camera, gl, size }=useThree();
  const moving=useRef(false);
  const clock=useRef(0);
  const target=useMemo(()=>new THREE.Vector3(),[]);
  useEffect(()=>{
    if(tv){if(!selected){camera.position.set(0,height*0.75,height*1.72);camera.lookAt(0,height*0.45,0);}return;}
    const c=controls.current;if(!c)return;
    const p=selected ? ornamentAnchor(selected,height):[0,height*0.46,0];
    c.target.set(p[0]??0,p[1]??0,p[2]??0);
    if(selected){const angle=Math.atan2(p[0]??0,p[2]??0);camera.position.set((p[0]??0)+Math.sin(angle)*2,(p[1]??0)+0.35,(p[2]??0)+Math.cos(angle)*2);}else camera.position.set(0,height*0.65,height*(size.width/size.height<0.7?1.95:1.65));
    c.update();moving.current=false;
  },[selected,resetKey,height,tv,camera,size.width,size.height]);
  useEffect(()=>{ const stop=()=>{moving.current=true;};gl.domElement.addEventListener('pointerdown',stop);return()=>gl.domElement.removeEventListener('pointerdown',stop);},[gl]);
  useFrame((_,delta)=>{
    if(!tv)return;
    const dt=Math.min(delta,0.05);if(!reduced)clock.current+=dt;
    const p=selected?ornamentAnchor(selected,height):[0,height*0.45,0];
    const a=selected?Math.atan2(p[0]??0,p[2]??0):clock.current*0.075;
    const d=selected?2.5:height*1.72;
    target.set((p[0]??0)+Math.sin(a)*d,(p[1]??0)+(selected?0.6:1.1),(p[2]??0)+Math.cos(a)*d);
    camera.position.lerp(target,1-Math.exp(-1.5*dt));camera.lookAt(p[0]??0,p[1]??0,p[2]??0);
  });
  return tv?null:<OrbitControls ref={controls} makeDefault enablePan={false} enableDamping minDistance={1.5} maxDistance={10} minPolarAngle={0.22} maxPolarAngle={Math.PI*0.63} />;
}
function Ground({palette}:{palette:Palette}) {
  const texture=useMemo(()=>{
    const data=new Uint8Array(128*128*4);const c=new THREE.Color(palette.ground);
    for(let i=0;i<128*128;i++){const n=0.85+0.15*(Math.sin(i*23.7)*0.5+0.5);data[i*4]=c.r*255*n;data[i*4+1]=c.g*255*n;data[i*4+2]=c.b*255*n;data[i*4+3]=255;}
    const tex=new THREE.DataTexture(data,128,128);tex.needsUpdate=true;tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(12,12);return tex;
  },[palette]);
  useEffect(()=>()=>texture.dispose(),[texture]);
  return <mesh rotation-x={-Math.PI/2} receiveShadow><planeGeometry args={[200,200]} /><meshStandardMaterial map={texture} color={palette.snow} roughness={0.7} metalness={0.15} /></mesh>;
}
export default function TreeScene(props:Props) {
  const [palette,setPalette]=useState<Palette|null>(null);
  const [supported,setSupported]=useState(true);
  useEffect(()=>{
    const s=getComputedStyle(document.documentElement);const p={} as Palette;
    for(const k of ['night','fir','needle','bark','gold','red','snow','ground','rim'] as const)p[k]=s.getPropertyValue(`--scene-${k}`).trim();setPalette(p);
    const c=document.createElement('canvas');setSupported(Boolean(c.getContext('webgl2')||c.getContext('webgl')));
  },[]);
  const fallback=<div className="flex h-full items-center justify-center px-6 text-center text-muted-foreground">Vista 3D non disponibile. Gli addobbi sono nell’elenco qui sotto.</div>;
  if(!supported)return <div className="tree-stage">{fallback}</div>;
  if(!palette)return <div className="tree-stage" aria-busy="true" />;
  const h=treeHeight(props.ornaments.length);
  return <div className="tree-stage" aria-label="Albero dei Regali tridimensionale" data-ornament-count={props.ornaments.length} data-tree-height={h.toFixed(2)}>
    <SceneBoundary fallback={fallback}><Canvas shadows dpr={[1,1.5]} camera={{position:[0,2.7,5.2],fov:42}} gl={{antialias:true}} onCreated={({gl})=>{gl.domElement.addEventListener('webglcontextlost',()=>setSupported(false));}}>
      <color attach="background" args={[palette.night]} /><fog attach="fog" args={[palette.night,9,27]} />
      <ambientLight intensity={0.65} /><hemisphereLight args={[palette.rim,palette.ground,1.2]} />
      <directionalLight position={[3,6,5]} intensity={2.4} color={palette.snow} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <pointLight position={[-2,3,-2]} intensity={12} color={palette.gold} />
      <Environment resolution={64}><Lightformer intensity={2} position={[0,5,0]} scale={[8,8,1]} /><Lightformer intensity={3} color={palette.gold} position={[-4,2,1]} rotation-y={Math.PI/2} scale={[6,4,1]} /></Environment>
      <Ground palette={palette} />
      
      <Decorations {...props} height={h} palette={palette} />
      <TreeStar height={h} palette={palette} />
      <CameraRig height={h} selected={props.selected} tv={props.tv} reduced={props.reduced} resetKey={props.resetKey} />
    </Canvas></SceneBoundary>
  </div>;
}
