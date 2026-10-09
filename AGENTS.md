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

- Payments, emails and bookings remain UI-only simulations; only the shared demo tree uses Cloud persistence, so personal booking details are never stored.

- Shared demo tree lives in Lovable Cloud table demo_ornaments; visitors write/read only via security-definer RPCs (hang_ornament, public_tree, my_ornaments), moderators (user_roles admin/moderator) read/update via RLS — keeps private dedicas and counts tamper-proof.
- Mobile and TV share a lazy client-only React Three Fiber scene and deterministic ornament layout based exclusively on Cloud-added ornaments, keeping scale and placements consistent without fictional seed counts.
- Use a shared procedural illustrated canopy with merged scalloped foliage and needle geometry, instanced project-shaped ornaments and bounded pixel ratio so every tree growth stage is visually complete within mobile GPU budgets.
- The dedication panel uses a same-URL history entry for Back dismissal plus visible close/outside/Escape controls, so opening a gift never traps navigation.
- CriMark accepts an official image URL without redrawing or recoloring it and renders no visual mark without that asset, so absent logos cannot be mistaken for official branding.
