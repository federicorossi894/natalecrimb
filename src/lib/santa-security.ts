/** Known first-party hosts for Santa's write endpoints.
 * Lovable previews may be served behind an internal proxy, so comparing
 * Origin to getRequest().url alone can reject legitimate same-origin logins.
 * Never derive trust from an arbitrary Host header.
 */
export function santaOriginAllowed(origin:string|null):boolean{
 if(!origin)return false;
 try{
  const u=new URL(origin);
  if(u.protocol!=='https:'||u.port||u.username||u.password||u.pathname!=='/'||u.search||u.hash)
   return false;
  const h=u.hostname.toLowerCase();
  return h==='natale.crimonza.org'||
   h==='natalecrimb.lovable.app'||
   /^id-preview(?:-[0-9]+)?--f6dd90ba-cd6d-4316-8b9b-58f8b12e499e\.lovable\.app$/.test(h);
 }catch{return false;}
}
