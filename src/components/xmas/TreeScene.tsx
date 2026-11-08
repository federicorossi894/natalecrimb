import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, OrbitControls } from '@react-three/drei';
import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsType } from 'three-stdlib';
import { ArtTree, type ScenePalette } from './ArtTree';
import type { TreeOrnament } from '@/lib/data';
import { ornamentAnchor, treeHeight } from '@/lib/tree-layout';
import { IllustratedTree } from './TreeStage';
import { TV_GPU_RECOVERY } from '@/lib/tv-reliability';
import { tvCameraFrame, type CameraPoint } from '@/lib/tv-camera';

type Palette = ScenePalette;
const PALETTE_KEYS = ['night','fir','needle','bark','gold','red','snow','ground','rim','ivory','burgundy','forest','crimson'] as const;
type Props = { ornaments: TreeOrnament[]; selected: TreeOrnament | null; onPick?: (o: TreeOrnament) => void; tv?: boolean; arrivingId?: string | number | null; resetKey?: number; reduced: boolean; editorialFocus?: boolean; cameraSuspended?: boolean };

class SceneBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  override render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
function TreeStar({height,palette}:{height:number;palette:Palette}) {
  const shape=useMemo(()=>{const s=new THREE.Shape();for(let i=0;i<10;i++){const a=Math.PI/2+i*Math.PI/5,r=i%2===0?0.18:0.078;const x=Math.cos(a)*r,y=Math.sin(a)*r;i===0?s.moveTo(x,y):s.lineTo(x,y);}s.closePath();return s;},[]);
  return <group position={[0,height+0.06,0]} scale={0.85+height*0.12}><mesh castShadow><extrudeGeometry args={[shape,{depth:0.045,bevelEnabled:true,bevelSize:0.018,bevelThickness:0.018,bevelSegments:2,steps:1}]} /><meshStandardMaterial color={palette.gold} emissive={palette.gold} emissiveIntensity={0.25} metalness={0.75} roughness={0.22} /></mesh><pointLight color={palette.gold} intensity={1.6} distance={1.5} /></group>;
}
function Decorations(props:Props & {height:number;palette:Palette}) {
  return <ArtTree ornaments={props.ornaments} height={props.height} palette={props.palette} selected={props.selected} onPick={props.onPick} arrivingId={props.arrivingId} reduced={props.reduced} />;
}
function CameraRig({height,selected,index,count,tv,reduced,resetKey,editorialFocus,cameraSuspended}: {height:number;selected:TreeOrnament|null;index:number;count:number;tv?:boolean|undefined;reduced:boolean;resetKey?:number|undefined;editorialFocus?:boolean|undefined;cameraSuspended?:boolean|undefined}) {
  const controls=useRef<OrbitControlsType>(null);
  const { camera, gl, size }=useThree();
  const moving=useRef(false);
  const clock=useRef(0);
  const target=useMemo(()=>new THREE.Vector3(),[]);
  const look=useMemo(()=>new THREE.Vector3(0,height*0.53,0),[]);
  const lookDesired=useMemo(()=>new THREE.Vector3(),[]);
  const initialized=useRef(false);
  const probeAt=useRef(0);
  useEffect(()=>{
    if(tv){if(!initialized.current){camera.position.set(0,height*0.67,height*1.95);look.set(0,height*0.53,0);camera.lookAt(look);initialized.current=true;}return;}
    const c=controls.current;if(!c)return;
    const p=selected ? ornamentAnchor(selected,height,index,count):[0,height*0.5,0];
    c.target.set(p[0]??0,p[1]??0,p[2]??0);
    if(selected){const angle=Math.atan2(p[0]??0,p[2]??0);camera.position.set((p[0]??0)+Math.sin(angle)*2,(p[1]??0)+0.35,(p[2]??0)+Math.cos(angle)*2);}else camera.position.set(0,height*0.65,height*(size.width/size.height<0.7?2.1:1.65));
    c.update();moving.current=false;
  },[selected,index,count,resetKey,height,tv,camera,size.width,size.height]);
  useEffect(()=>{ const stop=()=>{moving.current=true;};gl.domElement.addEventListener('pointerdown',stop);return()=>gl.domElement.removeEventListener('pointerdown',stop);},[gl]);
  useFrame((_,delta)=>{
    if(!tv)return;
    const dt=Math.min(delta,0.05);
    if(!reduced && !cameraSuspended){
      if(!selected)clock.current+=dt;
      const p=selected?ornamentAnchor(selected,height,index,count) as CameraPoint:null;
      const frame=tvCameraFrame(height,clock.current,p,!!editorialFocus);
      target.fromArray(frame.position);lookDesired.fromArray(frame.look);
      // Both position AND lookAt ease, including return; no selection-change effect can snap the TV camera.
      const ease=1-Math.exp(-1.15*dt);
      camera.position.lerp(target,ease);look.lerp(lookDesired,ease);camera.lookAt(look);
    }
    // Public numeric diagnostics, sampled without React renders, for camera/soak verification.
    probeAt.current+=dt;
    if(probeAt.current>=0.5){
      probeAt.current=0;
      const stage=gl.domElement.closest<HTMLElement>('.tree-stage');
      if(stage){stage.dataset['cameraPosition']=camera.position.toArray().map(n=>n.toFixed(4)).join(',');stage.dataset['cameraLook']=look.toArray().map(n=>n.toFixed(4)).join(',');stage.dataset['cameraSelected']=String(selected?.id??'');stage.dataset['cameraMode']=cameraSuspended?'suspended':reduced?'reduced':editorialFocus?'editorial':selected?'selected':'panorama';}
    }
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
  // R3F forces a context loss ~0.5s after the canvas unmounts: that is not a GPU failure, so it must not reload the TV.
  const mounted=useRef(true);
  const contextCleanup=useRef<(() => void) | null>(null);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;contextCleanup.current?.();};},[]);
  useEffect(()=>{
    const s=getComputedStyle(document.documentElement);const p={} as Palette;
    for(const k of PALETTE_KEYS)p[k]=s.getPropertyValue(`--scene-${k}`).trim();setPalette(p);
    const c=document.createElement('canvas');setSupported(Boolean(c.getContext('webgl2')||c.getContext('webgl')));
  },[]);
  // Same illustrated tree as browsers without WebGL: used if the scene throws or the GPU context is lost.
  const fallback=<IllustratedTree ornaments={props.ornaments} selected={props.selected} {...(props.onPick?{onPick:props.onPick}:{})} {...(props.tv?{tv:true}:{})} arrivingId={props.arrivingId??null} />;
  if(!supported)return fallback;
  if(!palette)return <div className="tree-stage" aria-busy="true" />;
  const h=treeHeight(props.ornaments.length);
  return <div className="tree-stage" aria-label="Albero dei Regali tridimensionale" data-ornament-count={props.ornaments.length} data-tree-height={h.toFixed(2)}>
    <SceneBoundary fallback={fallback}><Canvas shadows dpr={[1,1.5]} camera={{position:[0,2.7,5.2],fov:42}} gl={{antialias:true}} onCreated={({gl})=>{
      contextCleanup.current?.();
      const lost=()=>{if(!mounted.current)return;setSupported(false);if(props.tv)window.dispatchEvent(new Event(TV_GPU_RECOVERY));};
      gl.domElement.addEventListener('webglcontextlost',lost);
      contextCleanup.current=()=>gl.domElement.removeEventListener('webglcontextlost',lost);
    }}>
      <color attach="background" args={[palette.night]} /><fog attach="fog" args={[palette.night,9,27]} />
      <ambientLight intensity={0.65} /><hemisphereLight args={[palette.rim,palette.ground,1.2]} />
      <directionalLight position={[3,6,5]} intensity={2.4} color={palette.snow} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <pointLight position={[-2,3,-2]} intensity={12} color={palette.gold} />
      <Environment resolution={64}><Lightformer intensity={2} position={[0,5,0]} scale={[8,8,1]} /><Lightformer intensity={3} color={palette.gold} position={[-4,2,1]} rotation-y={Math.PI/2} scale={[6,4,1]} /></Environment>
      <Ground palette={palette} />
      
      <Decorations {...props} height={h} palette={palette} />
      <TreeStar height={h} palette={palette} />
      <CameraRig height={h} selected={props.selected} index={props.selected?props.ornaments.findIndex(o=>o.id===props.selected?.id):-1} count={props.ornaments.length} tv={props.tv} reduced={props.reduced} resetKey={props.resetKey} editorialFocus={props.editorialFocus} cameraSuspended={props.cameraSuspended} />
    </Canvas></SceneBoundary>
  </div>;
}
