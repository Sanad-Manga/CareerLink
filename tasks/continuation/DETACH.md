# How to continue this project in the new repo (CareerLink)

New repo: **https://github.com/Sanad-Manga/CareerLink.git**

## The idea, plainly

A Git repository *is* its commit history — every commit with its author, date and
message. "Moving" to a new repo does **not** re-upload files or start fresh: you
push the existing commit history to a second remote. CareerLink ends up with the
**exact same history** — same commit IDs, same 9 authors on the contributor
graph, the `v1.0` tag included.

After the push you simply **stop using the old repo** (it stays frozen at `v1.0`)
and do all new work — including the rename/rebrand — as normal commits *on top of*
that history in CareerLink.

- No **Fork** button (de-emphasised on profiles, stays tethered, contributions
  don't count).
- No author rewriting (`filter-repo` / `filter-branch`) — the whole point is that
  the original authorship is untouched and verifiable.
- The rebrand (product name, README, package.json, email templates…) is just new
  commits after the migration — the old commits never change.

## Gates before this is public

1. Quick informal "yeah, fine" from the other 6 original authors (Ali, Baraa,
   Eyad, Mohamed Walid, Mohamed Nazmy, Mostafa).
2. Check the GIU program's academic-integrity / IP policy allows continuing a
   submitted group project publicly.

Keep CareerLink **private** until both are done.

## Steps

### 1. One-time: create the empty repo
On GitHub: **New repository → `CareerLink`**, **Private**, **no** README /
`.gitignore` / license. (Already created — the URL above.)

### 2. Push the full history (one person, ~2 min)
```bash
git checkout main && git pull
git remote add careerlink https://github.com/Sanad-Manga/CareerLink.git
git push careerlink --all      # every branch, full history
git push careerlink --tags     # the v1.0 tag
```

### 3. Verify it all came across
```bash
git ls-remote --heads careerlink        # branches present
git ls-remote --tags  careerlink        # v1.0 present
git shortlog -sne --no-merges --all     # 9 people (via .mailmap) + 1 bot
```
On GitHub: open CareerLink → **Insights → Contributors** → all 9 show up.

### 4. Repo settings on CareerLink
- **Settings → Branches**: default branch `main`.
- **Branch protection** on `main`: require the `Test` status check + 1 approving
  review; block direct pushes and force-pushes.
- **Settings → Secrets → Actions**: add the new host's deploy token (see
  `docs/plans/hosting-migration.md`), plus Vercel.
- **Settings → Actions**: enable Actions.

### 5. Switch your local clone over (each person, when ready)
```bash
git remote remove origin
git remote rename careerlink origin
git branch --set-upstream-to=origin/main main
```
Or just re-clone: `git clone https://github.com/Sanad-Manga/CareerLink.git`.

### 6. Then rebrand
Split across the three of us — see the per-person files in this folder. The
rebrand is normal PRs against CareerLink's `main`.

## After it's live

- Add a note to the old `Sanad-Manga/GIU-Nexus` README: "Frozen at `v1.0`.
  Development continues at Sanad-Manga/CareerLink." (or archive it).
- `docs/DETACH-PLAN.md` has the full rebrand file checklist and the drafted
  README "History & Attribution" section.
