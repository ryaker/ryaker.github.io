# ryaker.github.io

Source for [ryaker.github.io](https://ryaker.github.io), Richard Yaker's portfolio site.

## How it works

- Single static page, `index.html`, served by GitHub Pages from `main`. No build step, no framework, no dependencies.
- Star and fork counts are baked in as static fallbacks and refreshed from the GitHub API on each visit, with a six-hour cache in `localStorage`.
- The featured cards also draw a 30-week star history sparkline from GitHub's [star history endpoint](https://docs.github.com/rest/activity/starring#get-repository-star-history), which returns weekly star counts without exposing individual stargazers. It reports gains per week, so the running total is walked backwards from the current count. Requests are deferred until the cards near the viewport and cached for six hours; if any of it fails, the static counts stand on their own.
- Set in the system font stack (SF Pro on Apple devices). Adapts to light and dark mode, `prefers-reduced-motion`, `prefers-reduced-transparency`, and `prefers-contrast`.

## Editing

Edit `index.html` and push to `main`. Pages redeploys in about a minute.

To preview locally:

```sh
python3 -m http.server 8000
```

then open <http://localhost:8000>.

## Updating the static star counts

The live fetch handles this automatically, but to refresh the fallbacks in the HTML:

```sh
gh api "users/ryaker/repos?per_page=100&type=owner" --jq '.[] | select(.fork==false) | "\(.name)\t\(.stargazers_count)\t\(.forks_count)"'
```

Then update the matching `data-static` values and the total in `index.html`.
