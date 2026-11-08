export const TV_ORNAMENT_LIMIT = 300;
export const TV_TREE_COLUMNS = 'id,kind,x,y,firma,dedica,publish_consent,status,created_at';
export type TvTreeRow = { id: string; kind: string; x: number; y: number; firma: string | null; dedica: string | null; publish_consent: boolean; status: string; created_at: string };
/** Count is independent of the bounded GPU window. Only consented approved text leaves the server. */
export function tvTreeSummary(rows: TvTreeRow[], count: number) {
  return { count, rows: rows.filter(o => o.status !== 'rejected').slice(0, TV_ORNAMENT_LIMIT).map(o => ({ id:o.id,kind:o.kind,x:o.x,y:o.y,created_at:o.created_at,firma:o.publish_consent && o.status==='approved' ? o.firma : null,dedica:o.publish_consent && o.status==='approved' ? o.dedica : null })) };
}