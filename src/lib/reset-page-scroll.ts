/** Reset scroll only after the destination has mounted.
 * The old smooth-scroll call ran before React replaced checkout/detail content,
 * occasionally leaving iOS Safari halfway down the new screen.
 */
export function resetPageScroll() {
  if (typeof window === "undefined") return;
  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
}
