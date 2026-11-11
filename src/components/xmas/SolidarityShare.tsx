import { useEffect, useState } from 'react';
import { Download, Share2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Project } from '@/lib/data';
import { renderSolidarityStory, socialStoryText } from '@/lib/social-share';

export function SolidarityShare({ project }: { project: Project }) {
  const [file,setFile]=useState<File|null>(null);
  const [src,setSrc]=useState<string|null>(null);
  const [status,setStatus]=useState('');
  const [error,setError]=useState(false);
  const [retry,setRetry]=useState(0);
  useEffect(()=>{
    let active=true,objectUrl:string|null=null;
    setFile(null);setSrc(null);setError(false);
    void renderSolidarityStory(project).then(image=>{
      if(!active)return;
      if(!image){setError(true);return;}
      objectUrl=URL.createObjectURL(image);
      setFile(image);setSrc(objectUrl);
    }).catch(()=>{if(active)setError(true);});
    return ()=>{active=false;if(objectUrl)URL.revokeObjectURL(objectUrl);};
  },[project,retry]);
  const save=()=>{
    if(!file)return;
    const url=URL.createObjectURL(file);
    const a=document.createElement('a');a.href=url;a.download=file.name;
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),30000);
    setStatus('Grafica salvata: puoi aggiungerla a una storia o a un post.');
  };
  const share=async()=>{
    if(!file)return;
    if(navigator.canShare?.({files:[file]})){
      try{
        await navigator.share({files:[file],title:'Il Natale che fa bene',text:socialStoryText()});
        setStatus('La grafica è pronta. Grazie per aver condiviso la solidarietà!');
        return;
      }catch(e){
        if(e instanceof Error && e.name==='AbortError')return;
      }
    }
    save();
  };
  return <section className="mx-auto mt-9 max-w-3xl rounded-3xl border border-gold/40 bg-secondary/60 p-5 sm:p-8" data-testid="solidarity-share">
    <div className="text-center">
      <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.17em] text-gold"><Sparkles className="h-4 w-4"/>Il bene si condivide</span>
      <h2 className="mt-3 font-display text-2xl sm:text-3xl">Raccontalo anche agli amici</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">Una piccola grafica per le tue storie o i tuoi social: invita altre persone a fare un regalo solidale. Non contiene nomi, importi né dediche private.</p>
    </div>
    <div className="mx-auto mt-5 max-w-[250px] overflow-hidden rounded-[18px] border border-gold/40 shadow-deep sm:max-w-[280px]">
      {src ? <img src={src} alt="Grafica natalizia per i social: Ho fatto un dono solidale. Fallo anche tu su natale.crimonza.org" className="h-auto w-full" data-testid="social-story-image"/> :
      <div className="flex aspect-[9/16] items-center justify-center bg-background p-5 text-center text-sm text-muted-foreground" role="status">{error?'Non riesco a preparare la grafica.':'Preparo la tua storia natalizia…'}</div>}
    </div>
    <div className="mx-auto mt-5 flex max-w-xl flex-col gap-3 sm:flex-row">
      {error ? <Button variant="outline" className="w-full" onClick={()=>setRetry(n=>n+1)}>Riprova</Button> :
      <>
        <Button onClick={()=>void share()} disabled={!file} className="h-auto w-full py-4 shadow-deep"><Share2 className="h-4 w-4"/>Condividi la grafica</Button>
        <Button variant="outline" onClick={save} disabled={!file} className="h-auto w-full py-4"><Download className="h-4 w-4"/>Salva l’immagine</Button>
      </>}
    </div>
    {status && <p className="mt-3 text-center text-xs text-muted-foreground" role="status">{status}</p>}
  </section>;
}
