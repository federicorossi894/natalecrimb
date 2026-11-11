import { describe, expect, it } from 'vitest';
import { canonicalNataleNavigation } from '@/lib/canonical-natale';

const navigate=(url:string,method='GET',accept='text/html')=>
  canonicalNataleNavigation(new Request(url,{method,headers:{accept}}));

describe('canonical Christmas origin',()=>{
  it('redirects legacy homepage and deep gift links with query intact',()=>{
    expect(navigate('https://natalecrimb.lovable.app/')?.href).toBe('https://natale.crimonza.org/');
    expect(navigate('https://natalecrimb.lovable.app/albero?addobbo=123')?.href).toBe('https://natale.crimonza.org/albero?addobbo=123');
    expect(navigate('https://natalecrimb.lovable.app/piccoli-volontari')?.href).toBe('https://natale.crimonza.org/piccoli-volontari');
  });
  it('never redirects already canonical, preview, API or server-function requests',()=>{
    expect(navigate('https://natale.crimonza.org/albero')).toBeNull();
    expect(navigate('https://id-preview--a.lovable.app/')).toBeNull();
    expect(navigate('https://natalecrimb.lovable.app/api/send','POST')).toBeNull();
    expect(navigate('https://natalecrimb.lovable.app/api/send','GET','application/json')).toBeNull();
  });
});
