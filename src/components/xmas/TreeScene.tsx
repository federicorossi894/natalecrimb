import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Html, Lightformer, OrbitControls, useGLTF } from '@react-three/drei';
import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsType } from 'three-stdlib';
import firAsset from '@/assets/christmas-fir-single.glb.asset.json';
import type { TreeOrnament } from '@/lib/data';
import { ornamentAnchor, treeHeight } from '@/lib/tree-layout';

type Palette = Record<'night'|'fir'|'needle'|'bark'|'gold'|'red'|'snow'|'ground'|'rim', string>;
type Props = { ornaments: TreeOrnament[]; selected: TreeOrnament | null; onPick?: (o: TreeOrnament) => void; tv?: boolean; arrivingId?: string | number | null; resetKey?: number; reduced: boolean };

class SceneBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  override render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
function Fir({ height }: { height: number }) {
  const { scene } = useGLTF(firAsset.url, false);
  const model = useMemo(() => {
    const clone = scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const scale = 1 / Math.max(size.y, 0.001);
    clone.scale.setScalar(scale);
    clone.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
    clone.traverse(o => { if (o instanceof THREE.Mesh) { o.castShadow = true; o.receiveShadow = true; } });
    return clone;
  }, [scene]);
  const fuller=useMemo(()=>model.clone(true),[model]);
  return <group scale={height}><primitive object={model} /><group rotation-y={Math.PI*0.72}><primitive object={fuller} /></group></group>;
}
function TreeStar({height,palette}:{height:number;palette:Palette}){
  const shape=useMemo(()=>{const s=new THREE.Shape();for(let i=0;i<10;i++){const a=Math.PI/2+i*Math.PI/5;const r=i%2===0?0.13:0.057;const x=Math.cos(a)*r,y=Math.sin(a)*r;if(i===0)s.moveTo(x,y);else s.lineTo(x,y);}s.closePath();return s;},[]);
  return <mesh position={[0,height+0.07,0]}><extrudeGeometry args={[shape,{depth:0.025,bevelEnabled:true,bevelSize:0.01,bevelThickness:0.01,bevelSegments:1,steps:1}]} /><meshStandardMaterial color={palette.gold} emissive={palette.gold} emissiveIntensity={0.35} metalness={0.8} roughness={0.25} /></mesh>;
}
function Decorations({ ornaments, height, palette, selected, onPick, arrivingId, reduced, tv }: Props & { height: number; palette: Palette }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const bulbs = useRef<THREE.InstancedMesh>(null);
  const caps = useRef<THREE.InstancedMesh>(null);
  const t = useRef(0);
  const points = useMemo(() => ornaments.map(o => ornamentAnchor(o, height)), [ornaments, height]);
  useEffect(() => {
    t.current = 0;
    const m = mesh.current;
    if (!m) return;
    ornaments.forEach((o,i) => m.setColorAt(i,new THREE.Color(o.kind === 'dae' ? palette.fir : o.kind === 'prossimita' ? palette.gold : o.kind === 'calore' ? palette.snow : palette.red)));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [ornaments, palette, arrivingId, selected]);
  useEffect(() => {
    const m = bulbs.current;
    if (!m) return;
    const dummy = new THREE.Object3D();
    for (let i=0;i<100;i++) {
      const y = 0.12 + i/100*0.82, a=i*0.57, r=height*0.30*(1-y);
      dummy.position.set(Math.sin(a)*r,y*height,Math.cos(a)*r);
      dummy.scale.setScalar(0.016); dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  }, [height]);
  useFrame((_,delta) => {
    t.current += Math.min(delta,0.05);
    const m=mesh.current;if(!m)return;
    const dummy=new THREE.Object3D();
    points.forEach((p,i) => {
      const o=ornaments[i];if(!o)return;
      const entering = o.id===arrivingId && !reduced ? Math.max(0,1-t.current/2.4) : 0;
      dummy.position.set(p[0],p[1]+entering*height,p[2]+entering*1.2);
      dummy.rotation.set(0,o.id===selected?.id ? Math.min(Math.PI,t.current*2) : 0,0);
      dummy.scale.setScalar((o.id===selected?.id?0.13:0.095)*(1-entering*0.6));
      dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix);
      dummy.position.y+=0.10;dummy.scale.set(0.023,0.05,0.023);dummy.updateMatrix();caps.current?.setMatrixAt(i,dummy.matrix);
    });m.instanceMatrix.needsUpdate=true;
    if(caps.current)caps.current.instanceMatrix.needsUpdate=true;
  });
  return <>
    <instancedMesh ref={mesh} args={[undefined,undefined,Math.max(1,ornaments.length)]} count={ornaments.length} onClick={e => {e.stopPropagation();if(e.delta>6)return;const o=ornaments[e.instanceId ?? -1];if(o)onPick?.(o);}}>
      <sphereGeometry args={[1,20,14]} /><meshStandardMaterial metalness={0.65} roughness={0.24} />
    </instancedMesh>
    <instancedMesh ref={bulbs} args={[undefined,undefined,100]}><sphereGeometry args={[1,8,6]} /><meshBasicMaterial color={palette.gold} toneMapped={false} /></instancedMesh>
    <instancedMesh ref={caps} args={[undefined,undefined,Math.max(1,ornaments.length)]} count={ornaments.length}><cylinderGeometry args={[1,1,1,6]} /><meshStandardMaterial color={palette.gold} metalness={0.8} roughness={0.3} /></instancedMesh>
    {selected && !tv && <Html position={ornamentAnchor(selected,height)} center distanceFactor={1.5} zIndexRange={[20,0]}><div className="tree-tag pointer-events-none w-48 text-center"><p className="text-[9px] font-semibold uppercase text-primary">Regalo DEMO</p><p className="mt-2 font-display text-sm">{selected.dedica?`“${selected.dedica}”`:'Un regalo per Monza.'}</p><p className="mt-2 text-[10px]">— {selected.firma??'Anonimo'}</p></div></Html>}
  </>;
}
function CameraRig({height,selected,tv,reduced,resetKey}: {height:number;selected:TreeOrnament|null;tv?:boolean|undefined;reduced:boolean;resetKey?:number|undefined}) {
  const controls=useRef<OrbitControlsType>(null);
  const { camera, gl }=useThree();
  const moving=useRef(false);
  const clock=useRef(0);
  const target=useMemo(()=>new THREE.Vector3(),[]);
  useEffect(()=>{
    if(tv)return;
    const c=controls.current;if(!c)return;
    const p=selected ? ornamentAnchor(selected,height):[0,height*0.46,0];
    c.target.set(p[0]??0,p[1]??0,p[2]??0);
    if(selected){const angle=Math.atan2(p[0]??0,p[2]??0);camera.position.set((p[0]??0)+Math.sin(angle)*2,(p[1]??0)+0.35,(p[2]??0)+Math.cos(angle)*2);}else camera.position.set(0,height*0.65,Math.max(4.8,height*1.85));
    c.update();moving.current=false;
  },[selected,resetKey,height,tv,camera]);
  useEffect(()=>{ const stop=()=>{moving.current=true;};gl.domElement.addEventListener('pointerdown',stop);return()=>gl.domElement.removeEventListener('pointerdown',stop);},[gl]);
  useFrame((_,delta)=>{
    if(!tv)return;
    const dt=Math.min(delta,0.05);if(!reduced)clock.current+=dt;
    const p=selected?ornamentAnchor(selected,height):[0,height*0.45,0];
    const a=selected?Math.atan2(p[0]??0,p[2]??0):clock.current*0.075;
    const d=selected?2.5:Math.max(5.8,height*2.15);
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
    <SceneBoundary fallback={fallback}><Canvas shadows dpr={[1,1.5]} camera={{position:[0,2.7,6.9],fov:42}} gl={{antialias:true}} onCreated={({gl})=>{gl.domElement.addEventListener('webglcontextlost',()=>setSupported(false));}}>
      <color attach="background" args={[palette.night]} /><fog attach="fog" args={[palette.night,9,27]} />
      <ambientLight intensity={0.65} /><hemisphereLight args={[palette.rim,palette.ground,1.2]} />
      <directionalLight position={[3,6,5]} intensity={3} color={palette.snow} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <pointLight position={[-2,3,-2]} intensity={12} color={palette.gold} />
      <Environment resolution={64}><Lightformer intensity={2} position={[0,5,0]} scale={[8,8,1]} /><Lightformer intensity={3} color={palette.gold} position={[-4,2,1]} rotation-y={Math.PI/2} scale={[6,4,1]} /></Environment>
      <Ground palette={palette} />
      <Suspense fallback={null}><Fir height={h} /></Suspense>
      <Decorations {...props} height={h} palette={palette} />
      <TreeStar height={h} palette={palette} />
      <CameraRig height={h} selected={props.selected} tv={props.tv} reduced={props.reduced} resetKey={props.resetKey} />
    </Canvas></SceneBoundary>
  </div>;
}
