import type { Project } from './data';
import { CAMPAIGN } from './campaign';
import { drawBauble } from './postcard-share';
import rossoLogo from '@/assets/cri-rosso-orizzontale.png.asset.json';

/** An original story-format image: public campaign facts only, never a recipient, amount or private message. */
export function socialStoryText() {
  return 'Ho fatto un dono solidale con Croce Rossa Monza. Fallo anche tu: https://natale.crimonza.org';
}

function officialMark(src: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const image = new Image();
    const timer = setTimeout(() => { image.onload = null; image.onerror = null; resolve(null); }, 7000);
    image.crossOrigin = 'anonymous';
    image.onload = () => { clearTimeout(timer); resolve(image); };
    image.onerror = () => { clearTimeout(timer); resolve(null); };
    image.src = src;
  });
}

export async function renderSolidarityStory(project: Project): Promise<File | null> {
  const width = 1080, height = 1920;
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  await document.fonts?.ready;

  const background = ctx.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, '#102c2b');
  background.addColorStop(.58, '#1a4534');
  background.addColorStop(1, '#0b2425');
  ctx.fillStyle = background; ctx.fillRect(0, 0, width, height);

  // Golden light and a restrained night-sky texture, echoing the original site illustrations.
  const halo = ctx.createRadialGradient(540, 770, 80, 540, 830, 720);
  halo.addColorStop(0, 'rgba(255,219,155,.27)');
  halo.addColorStop(.65, 'rgba(228,183,113,.07)');
  halo.addColorStop(1, 'rgba(228,183,113,0)');
  ctx.fillStyle = halo; ctx.fillRect(0, 0, width, height);
  for (let i=0; i<95; i++) {
    const x = 70+(i*293)%940, y=100+(i*199)%1700;
    ctx.fillStyle = 'rgba(250,224,173,.3)';
    ctx.beginPath(); ctx.arc(x,y,i%9===0?2.5:1,0,Math.PI*2);ctx.fill();
  }

  ctx.fillStyle = '#f8f1e4';
  ctx.beginPath();ctx.roundRect(78,165,924,1590,35);ctx.fill();
  ctx.strokeStyle = '#b99654';ctx.lineWidth=3;
  ctx.beginPath();ctx.roundRect(97,183,886,1554,24);ctx.stroke();

  const logo = await officialMark(rossoLogo.url);
  if (logo) {
    const maxW=535, maxH=110, ratio=Math.min(maxW/logo.width,maxH/logo.height);
    const w=logo.width*ratio, h=logo.height*ratio;
    ctx.drawImage(logo,(width-w)/2,248,w,h);
  } else {
    ctx.fillStyle='#b42438';ctx.textAlign='center';ctx.font='700 29px Manrope, Arial, sans-serif';
    ctx.fillText('CROCE ROSSA ITALIANA',width/2,300);
  }
  ctx.textAlign='center'; ctx.fillStyle='#274936';
  ctx.font='600 26px Manrope, Arial, sans-serif';ctx.fillText('COMITATO DI MONZA',540,400);
  ctx.strokeStyle='#c9ad76';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(344,446);ctx.lineTo(736,446);ctx.stroke();

  drawBauble(ctx,project.ornament,540,765,192);
  ctx.fillStyle='#8b1c30';ctx.font='700 22px Manrope, Arial, sans-serif';
  ctx.fillText('IL NATALE CHE FA BENE',540,1074);

  ctx.fillStyle='#203b2e';ctx.font='600 69px Fraunces, Georgia, serif';
  ctx.fillText('Ho fatto un',540,1182);
  ctx.fillText('dono solidale.',540,1273);

  ctx.fillStyle='#445a4b';ctx.font='400 34px Manrope, Arial, sans-serif';
  ctx.fillText('Un piccolo gesto, un aiuto concreto.',540,1360);
  ctx.fillText('Questo Natale fallo anche tu.',540,1416);

  ctx.fillStyle='#ab2235';ctx.beginPath();ctx.roundRect(194,1474,692,96,48);ctx.fill();
  ctx.fillStyle='#fffaf0';ctx.font='700 36px Manrope, Arial, sans-serif';
  ctx.fillText('natale.crimonza.org',540,1535);

  ctx.fillStyle='#54675b';ctx.font='500 22px Manrope, Arial, sans-serif';
  ctx.fillText('Una pallina sull’Albero di Monza, un gesto che conta.',540,1667);
  if (CAMPAIGN.demo) {
    ctx.fillStyle='#f0ce88';ctx.font='700 23px Manrope, Arial, sans-serif';
    ctx.fillText('PROVA DEMO · nessuna donazione reale',540,1830);
  } else {
    ctx.fillStyle='#f0ce88';ctx.font='500 23px Manrope, Arial, sans-serif';
    ctx.fillText('Croce Rossa Italiana · Comitato di Monza',540,1830);
  }
  const blob = await new Promise<Blob|null>(resolve => canvas.toBlob(resolve,'image/png'));
  return blob ? new File([blob],'il-natale-che-fa-bene-storia.png',{type:'image/png'}) : null;
}
