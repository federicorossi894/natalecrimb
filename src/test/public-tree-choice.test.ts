import { describe, expect, it } from 'vitest';
import { resolvePublicTreeChoice } from '@/lib/public-tree-choice';

const base = {
  gift: true,
  reusePersonalText: true,
  personalMessage: 'Per te, Pino',
  personalSignature: 'Federico',
  treeMessage: 'Un saluto da Monza',
  treeSignature: 'CRI',
  publishOnTree: false,
};

describe('private and public dedication separation',()=>{
  it('keeps the public tree anonymous by default, even when the same-text box is checked',()=>{
    expect(resolvePublicTreeChoice(base)).toEqual({dedica:'',firma:'',consent:false});
  });
  it('copies both text and signature only after explicit publication consent',()=>{
    expect(resolvePublicTreeChoice({...base,publishOnTree:true})).toEqual({dedica:'Per te, Pino',firma:'Federico',consent:true});
  });
  it('lets both public text and signature differ from the recipient card',()=>{
    expect(resolvePublicTreeChoice({...base,publishOnTree:true,reusePersonalText:false})).toEqual({dedica:'Un saluto da Monza',firma:'CRI',consent:true});
  });
  it('lets the city gift use only its explicitly public message, never a stale personal recipient',()=>{
    expect(resolvePublicTreeChoice({...base,gift:false,publishOnTree:true})).toEqual({dedica:'Un saluto da Monza',firma:'CRI',consent:true});
  });
});
