export const VOLUNTEER_HOST = 'volontari.natale.crimonza.org';
export const VOLUNTEER_URL = `https://${VOLUNTEER_HOST}`;
export const VOLUNTEER_FALLBACK_URL = 'https://natalecrimb.lovable.app/volontari';
export const isVolunteerHost = (hostname: string) => hostname.toLowerCase() === VOLUNTEER_HOST;
