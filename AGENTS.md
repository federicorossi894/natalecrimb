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

- Payments, emails and bookings remain UI-only simulations; only the shared demo tree uses Cloud persistence. Santa booking data lives only in component state (validated by src/lib/santa.ts) and is cleared on simulated confirmation; postcard images are drawn locally on a canvas and shared via the Web Share API or a wa.me link, never uploaded.

- Shared demo tree lives in Lovable Cloud table demo_ornaments; visitors write/read only via security-definer RPCs (hang_ornament, public_tree, my_ornaments), moderators (user_roles admin/moderator) read/update via RLS — keeps private dedicas and counts tamper-proof.
- Mobile and TV share a lazy client-only React Three Fiber scene; ornament anchors come from creation-order index (golden-ratio sampling over the cone) using only Cloud-added ornaments, so gifts never cluster and keep stable relative places as the tree grows.
- The tree is one procedural indexed canopy (stacked scalloped skirts) plus instanced tufts, light strings and baubles whose project motifs are painted on canvas textures; everything is instanced with bounded pixel ratio so each growth stage stays complete within mobile GPU budgets.
- Casetta events live in Cloud table casetta_events: anon reads only visible+confirmed+upcoming rows via RLS, moderators manage them from /moderazione; the TV shows labelled DEMO examples when none qualify.
- /albero-live is an autonomous director loop (timers, wake lock, periodic and context-loss reload) with no viewer controls, so it can run unattended.
- The dedication panel uses a same-URL history entry for Back dismissal plus visible close/outside/Escape controls, so opening a gift never traps navigation.
- CriMark accepts an official image URL without redrawing or recoloring it and renders no visual mark without that asset, so absent logos cannot be mistaken for official branding.
