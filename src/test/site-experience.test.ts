import { describe,it,expect } from 'vitest';
import { SITE_EXPERIENCE,experienceRouteAllowed,assertFullExperience,projectOnly } from '@/lib/site-experience';
import { ACTIVE_CAMPAIGN_MODE, campaignCapabilities, assertCampaignPayment } from '@/lib/campaign';
import { onlineGiftInput } from '@/lib/online-gift.functions';
describe('Independent experience and campaign axes',()=>{
  it('defaults to online DEMO without LIVE',()=>{expect(SITE_EXPERIENCE).toBe('ONLINE_GIFT');expect(ACTIVE_CAMPAIGN_MODE).toBe('DEMO');expect(campaignCapabilities('DEMO').livePayments).toBe(false);expect(()=>assertCampaignPayment('paypal','live')).toThrow();});
  it.each(['/piazza','/albero-live','/tv-preview','/volontari','/auguri','/augurio/abc','/moderazione','/babbo-natale'])('blocks %s online and preserves FULL',path=>{expect(experienceRouteAllowed(path,'ONLINE_GIFT')).toBe(false);expect(experienceRouteAllowed(path,'FULL')).toBe(true);});
  it.each(['/calendario','/piccoli-volontari','/giochi','/casetta'])('restores %s online and preserves FULL',path=>{expect(experienceRouteAllowed(path,'ONLINE_GIFT')).toBe(true);expect(experienceRouteAllowed(path,'FULL')).toBe(true);});
  it.each(['/','/regali','/regali/prossimita','/albero','/email-qa'])('keeps %s available',path=>expect(experienceRouteAllowed(path,'ONLINE_GIFT')).toBe(true));
  it('rejects legacy server operations online',()=>{expect(()=>assertFullExperience('ONLINE_GIFT')).toThrow();expect(()=>assertFullExperience('FULL')).not.toThrow();});
  it('redacts even approved or pending text',()=>{expect(projectOnly({id:'1',firma:'private',dedica:'pending',kind:'calore'})).toEqual({id:'1',firma:undefined,dedica:undefined,kind:'calore'});});
  it('requires 5 whole euros and accepts only safe public dedication',()=>{const d={requestId:'00000000-0000-4000-8000-000000000001',client:'00000000-0000-4000-8000-000000000002',kind:'calore',amount:5,provider:'paypal'};expect(onlineGiftInput.safeParse(d).success).toBe(true);expect(onlineGiftInput.safeParse({...d,amount:4}).success).toBe(false);expect(onlineGiftInput.safeParse({...d,amount:5.5}).success).toBe(false);expect(onlineGiftInput.safeParse({...d,dedica:'Per Monza',consent:true}).success).toBe(true);expect(onlineGiftInput.safeParse({...d,dedica:'<b>x</b>'}).success).toBe(false);expect(onlineGiftInput.safeParse({...d,to:'x'}).success).toBe(false);});
});