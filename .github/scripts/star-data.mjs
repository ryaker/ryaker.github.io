#!/usr/bin/env node
/**
 * Bakes GitHub star counts and star history into assets/stars.json, so the page
 * reads one same-origin file instead of spending each visitor's unauthenticated
 * rate limit on the API. Run by .github/workflows/star-data.yml.
 *
 * Writes nothing when the numbers haven't moved, so the workflow only commits
 * on a real change.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const USER = process.env.STAR_DATA_USER || "ryaker";
const OUT = fileURLToPath(new URL("../../assets/stars.json", import.meta.url));
const WEEKS = 30; /* the star history endpoint's page cap, ~7 months */
const MAX_HISTORY_REPOS = 20;
const API = process.env.STAR_DATA_API || "https://api.github.com"; /* overridable for tests */

const headers = {
  Accept: "application/vnd.github+json",
  "User-Agent": `${USER}-star-data`,
};
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

async function api(path) {
  const r = await fetch(`${API}${path}`, { headers });
  if (!r.ok) {
    const body = await r.text().catch(() => "");
    throw new Error(`GET ${path} → ${r.status} ${body.slice(0, 200)}`);
  }
  return r.json();
}

/* [[weekStartSeconds, starsGainedThatWeek], ...], oldest first. The endpoint
   reports gains per week and never names a stargazer. */
async function starHistory(repo) {
  const rows = await api(`/repos/${USER}/${repo}/stargazers/history?per_page=${WEEKS}`);
  if (!Array.isArray(rows)) throw new Error("unexpected star history shape");
  return rows
    .map((w) => [w.week, Number.isFinite(w.total) ? w.total : (w.days || []).reduce((a, b) => a + b, 0)])
    .filter(([week, gained]) => Number.isFinite(week) && Number.isFinite(gained))
    .sort((a, b) => a[0] - b[0]);
}

const owned = (await api(`/users/${USER}/repos?per_page=100&type=owner`))
  .filter((r) => !r.fork)
  .sort((a, b) => b.stargazers_count - a.stargazers_count);

if (!owned.length) throw new Error("no owned repositories came back — refusing to write an empty file");

const repos = {};
for (const r of owned) repos[r.name] = { stars: r.stargazers_count, forks: r.forks_count };

for (const r of owned.filter((r) => r.stargazers_count > 0).slice(0, MAX_HISTORY_REPOS)) {
  try {
    repos[r.name].weeks = await starHistory(r.name);
  } catch (e) {
    /* A repo without history is still a repo with counts. */
    console.warn(`star history for ${r.name}: ${e.message}`);
  }
}

const out = {
  generated: new Date().toISOString(),
  user: USER,
  total: owned.reduce((a, r) => a + r.stargazers_count, 0),
  /* Alphabetical, so a diff only ever shows numbers that moved. */
  repos: Object.fromEntries(Object.keys(repos).sort().map((k) => [k, repos[k]])),
};

let previous = null;
try {
  previous = JSON.parse(readFileSync(OUT, "utf8"));
} catch (_) {}

if (previous && previous.total === out.total && JSON.stringify(previous.repos) === JSON.stringify(out.repos)) {
  console.log(`Unchanged at ${out.total} stars — leaving assets/stars.json alone.`);
  process.exit(0);
}

writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`);
const withHistory = Object.values(out.repos).filter((r) => r.weeks).length;
console.log(`Wrote assets/stars.json: ${out.total} stars across ${owned.length} repos, ${withHistory} with history.`);
