import { describe, expect, it } from 'vitest';
import { socialStoryText } from '@/lib/social-share';

describe('public story share copy',()=>{
  it('invites to the official site and contains no personal details or donation amounts',()=>{
    const text=socialStoryText();
    expect(text).toContain('natale.crimonza.org');
    expect(text).toContain('dono solidale');
    expect(text).not.toContain('€');
    expect(text).not.toContain('destinatario');
  });
});
