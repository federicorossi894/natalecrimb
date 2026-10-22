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
- Cash gifts: create_cash_request stores only the SHA-256 of a server-generated one-time 16-char code (2h expiry); only volunteers (user_roles volunteer/moderator/admin via is_volunteer) can look up/confirm through security-definer RPCs, and confirm_cash_request locks the row so a second scan returns the same ornament instead of a duplicate. /volontari is unlinked but protected by auth + roles, not by obscurity. Santa booking data lives only in component state (validated by src/lib/santa.ts) and is cleared on simulated confirmation; postcard images are drawn locally on a canvas and shared via the Web Share API or a wa.me link, never uploaded.

- Shared demo tree lives in Lovable Cloud table demo_ornaments; visitors write/read only via security-definer RPCs (hang_ornament, public_tree, my_ornaments), moderators (user_roles admin/moderator) read/update via RLS — keeps private dedicas and counts tamper-proof.
- Mobile and TV share a lazy client-only React Three Fiber scene; ornament slots come from creation order (R2 low-discrepancy best-candidate sampling with a 3D clearance ellipsoid, sized for the count at arrival) and are projected onto the shared canopy profile in src/lib/tree-layout.ts, so baubles never touch, rest on the needles and keep their place as the tree grows wider and taller.
- The tree is one procedural indexed canopy (stacked scalloped skirts) plus instanced tufts, light strings and baubles whose project motifs are painted on canvas textures; everything is instanced with bounded pixel ratio so each growth stage stays complete within mobile GPU budgets.
- Casetta events live in Cloud table casetta_events: anon reads only visible+confirmed+upcoming rows via RLS, moderators manage them from /moderazione; the TV shows labelled DEMO examples when none qualify.
- /albero-live is an autonomous director loop (timers, wake lock, periodic and context-loss reload) with no viewer controls, so it can run unattended.
- The dedication panel uses a same-URL history entry for Back dismissal plus visible close/outside/Escape controls, so opening a gift never traps navigation.
- CriMark accepts an official image URL without redrawing or recoloring it and renders no visual mark without that asset, so absent logos cannot be mistaken for official branding.
