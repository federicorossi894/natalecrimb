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

- Demo-only build: all payments/emails/bookings are simulated in UI with local mock data in src/lib/data.ts; no backend.

- Shared demo tree lives in Lovable Cloud table demo_ornaments; visitors write/read only via security-definer RPCs (hang_ornament, public_tree, my_ornaments), moderators (user_roles admin/moderator) read/update via RLS — keeps private dedicas and counts tamper-proof.
