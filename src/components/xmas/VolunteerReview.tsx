import { useRef, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Bell, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { volunteerReviewList, volunteerReviewDecide } from '@/lib/volunteer-session.functions';
import { useResilientPoll } from '@/lib/resilient-poll';
import type { ReviewList } from '@/lib/volunteer-review-policy';
export function VolunteerReview() {
  const list=useServerFn(volunteerReviewList),decide=useServerFn(volunteerReviewDecide);
  const poll=useResilientPoll(async()=>list(),{count:0,items:[]} as ReviewList,4000);
  const [open,setOpen]=useState(false),[busy,setBusy]=useState<string|null>(null),[message,setMessage]=useState('');
  const pending=useRef(false);
  return <section className="mt-4 border-y border-border py-4" data-testid="volunteer-review">
    <Button variant="outline" className="h-auto w-full justify-between whitespace-normal py-3" onClick={()=>setOpen(v=>!v)}><Bell/><span>Da approvare · {poll.data.count}</span></Button>
    <p role="status" className="mt-2 text-sm text-gold">{poll.error||poll.stale?'Lista in ripristino':poll.data.count?`${poll.data.count} auguri e dediche in attesa di lettura`: 'Nessun messaggio in attesa'}</p>
    {open&&!poll.error&&poll.data.items.map(item=><article key={item.id} className="mt-4 border-b border-border pb-4" data-testid="review-item">
      <p className="text-xs text-muted-foreground">{item.type==='wish'?'Augurio':'Dedica'} · {new Date(item.created_at).toLocaleString('it-IT')}</p>
      <p className="my-3 whitespace-pre-wrap break-words font-display text-xl">{item.body}</p>
      {item.nickname&&<p className="text-sm">— {item.nickname}</p>}
      {!!item.flags.length&&<p className="mt-2 text-sm text-destructive">Da verificare con un moderatore: {item.flags.join(', ')}</p>}
      <div className="mt-3 flex gap-2">{(['approved','rejected'] as const).map(decision=><Button key={decision} variant={decision==='approved'?'default':'outline'} disabled={!!busy||poll.error||(decision==='approved'&&!!item.flags.length)} onClick={async()=>{
        if(pending.current)return;pending.current=true;setBusy(item.id);
        try{const r=await decide({data:{type:item.type,id:item.id,decision}});setMessage(({approved:'Approvato: presto sulla TV.',rejected:'Rifiutato: non sarà pubblico.',already_processed:'Già letto da un altro volontario.',escalate:'Serve un moderatore per questo testo.',rate_limited:'Troppe decisioni: attendi un minuto.'} as Record<string,string>)[r.result]??'Operazione non completata.');await poll.refresh();}catch{setMessage('Operazione non completata. Controlla la connessione.');}finally{pending.current=false;setBusy(null);}
      }}>{decision==='approved'?<Check/>:<X/>}{decision==='approved'?'Approva':'Rifiuta'}</Button>)}</div>
    </article>)}
    {message&&<p role="status" className="mt-3 text-sm">{message}</p>}
  </section>;
}