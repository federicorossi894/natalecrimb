<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Payments, emails and bookings remain UI-only simulations; Cloud persists only the shared demo tree and pending cash-at-the-casetta requests.
- Cash gifts: create_cash_request stores only the SHA-256 of a server-generated one-time 16-char code (2h expiry); only volunteers (user_roles volunteer/moderator/admin via is_volunteer) can look up/confirm through security-definer RPCs, and confirm_cash_request locks the row so a second scan returns the same ornament instead of a duplicate. /volontari is unlinked but protected by auth + roles, not by obscurity. Signed-out visitors get a presentation mode backed by the in-memory sandbox in src/lib/volunteer-demo.ts (same flows, zero Cloud calls) so it can be shown without accounts. Santa booking data lives only in component state (validated by src/lib/santa.ts) and is cleared on simulated confirmation; postcard images are drawn locally on a canvas and shared via the Web Share API or a wa.me link, never uploaded.

- Shared demo tree lives in Lovable Cloud table demo_ornaments; visitors write/read only via security-definer RPCs (hang_ornament, public_tree, my_ornaments), moderators (user_roles admin/moderator) read/update via RLS — keeps private dedicas and counts tamper-proof.
- Mobile and TV share a lazy client-only React Three Fiber scene; ornament slots come from creation order (R2 low-discrepancy best-candidate sampling with a 3D clearance ellipsoid, sized for the count at arrival) and are projected onto the shared canopy profile in src/lib/tree-layout.ts, so baubles never touch, rest on the needles and keep their place as the tree grows wider and taller.
- The tree is one procedural indexed canopy (stacked scalloped skirts) plus instanced tufts, light strings and baubles whose project motifs are painted on canvas textures; everything is instanced with bounded pixel ratio so each growth stage stays complete within mobile GPU budgets.
- Casetta events live in Cloud table casetta_events: anon reads only visible+confirmed+upcoming rows via RLS, moderators manage them from /moderazione; the TV shows labelled DEMO examples when none qualify.
- /albero-live is an autonomous director loop (timers, wake lock, periodic and context-loss reload) with no viewer controls, so it can run unattended.
- The dedication panel uses a same-URL history entry for Back dismissal plus visible close/outside/Escape controls, so opening a gift never traps navigation.
- CriMark/CriLockup embed the official image files untouched; CriLockup adds the territorial line in Arial per CRI manual §1.3 using geometry measured in src/lib/cri-lockup.ts (email uses the HTML twin lockupHtml), so the mark is never redrawn and the composition can be swapped for an official lockup file.
- Tree rendering goes through TreeStage: WebGL is detected before the 3D chunk loads, and missing WebGL, scene errors or context loss fall back to the illustrated Tree with the same shared ornaments, so no browser shows an empty stage.
- Gift amounts are validated by one shared schema (cash.ts amountSchema) and again inside every security-definer RPC that records a gift, so UI bypasses cannot store invalid amounts.
- Post-action confirmations are inline (no full-screen overlays) and the router shows a pending view plus reloads on chunk-load failure, so the previous page never stays on screen under a new URL.
- Kids' mission feedback is rendered only through Kit Bubble/HelperLine inside HelperProvider, so the guide picked in the hub (device-local, no personal data) speaks every hint consistently across missions.
