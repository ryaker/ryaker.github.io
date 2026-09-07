# ryaker.github.io

Source for [ryaker.github.io](https://ryaker.github.io), Richard Yaker's portfolio site.

## How it works

- Single static page, `index.html`, served by GitHub Pages from `main`. No build step, no framework, no dependencies.
- Star and fork counts, plus a 30-week star history sparkline on each featured card, come from `assets/stars.json` — baked every 15 minutes by the `Star data` workflow and served same-origin. See [Star data](#star-data) below.
- The history comes from GitHub's [star history endpoint](https://docs.github.com/rest/activity/starring#get-repository-star-history), which returns weekly star counts without exposing individual stargazers. It reports gains per week, so the running total is walked backwards from the current count.
- Every layer degrades to the one under it: no `stars.json` falls back to the live API (with a six-hour `localStorage` cache), and a failed API call falls back to the `data-static` numbers in the HTML. A card whose history is missing keeps its counts and skips the sparkline.
- Set in the system font stack (SF Pro on Apple devices). Adapts to light and dark mode, `prefers-reduced-motion`, `prefers-reduced-transparency`, and `prefers-contrast`.

## Editing

Edit `index.html` and push to `main`. Pages redeploys in about a minute.

To preview locally:

```sh
python3 -m http.server 8000
```

then open <http://localhost:8000>.

## Star data

`.github/workflows/star-data.yml` runs `.github/scripts/star-data.mjs` every 15 minutes on `main`. The script fetches every non-fork repo's counts and, for those with stars, its star history, then writes `assets/stars.json` — but only when a number actually moved, so the workflow commits nothing on a quiet run. It authenticates with the job's `GITHUB_TOKEN` (5,000 requests/hour) instead of spending each visitor's unauthenticated budget (60/hour, shared per IP).

Run it by hand from the Actions tab, or locally:

```sh
GITHUB_TOKEN=$(gh auth token) node .github/scripts/star-data.mjs
```

Three things worth knowing about the cadence:

- Scheduled workflows queue behind the rest of Actions, so 15 minutes is the floor, not a guarantee. The star history endpoint is itself cached for 60 seconds and bucketed by day, so nothing below that resolves anyway.
- GitHub disables cron on public repos after 60 days without a push. The workflow's own commits count, but only happen when the numbers move — so if the stars go quiet for two months, the schedule needs re-enabling in the Actions tab.
- The bot's commit to `main` is what triggers the Pages redeploy. If Pages is ever switched from a branch source to a deploy workflow, that push won't trigger it (`GITHUB_TOKEN` pushes don't start workflow runs) and the deploy will need a PAT.

## Updating the static star counts

The workflow and the live fetch both handle this; the `data-static` values in the HTML only matter when both are unavailable. To refresh them:

```sh
gh api "users/ryaker/repos?per_page=100&type=owner" --jq '.[] | select(.fork==false) | "\(.name)\t\(.stargazers_count)\t\(.forks_count)"'
```

Then update the matching `data-static` values and the total in `index.html`.
