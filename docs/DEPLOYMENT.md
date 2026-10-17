# Deploy to GitHub Pages

This app builds into static files. GitHub Pages does not run a Node.js backend,
store reports, or receive uploaded receipts from the app.

Expected site URL: <https://heythorsten.github.io/travel-expense-report/>.

## One-time setup

1. Commit the application source, `package-lock.json`, and the
   [workflow files](../.github/workflows/) to this repository. Do not commit
   `node_modules`, `dist`, or real reports/receipts.
2. Open the repository's **Settings > Pages**.
3. Under **Build and deployment > Source**, choose **GitHub Actions**.
4. Ensure Actions is enabled and repository/organization policy permits the
   actions used by the workflow.
5. Push the committed changes to `main`.
6. Open **Actions > Deploy to GitHub Pages** and wait for both `build` and
   `deploy` to succeed. Follow the deployment URL shown there.

You need permission to configure repository Pages settings. Pages availability
for private repositories depends on the account plan.

## How deployment works

The [deployment workflow](../.github/workflows/deploy.yml) runs on pushes to
`main`, or manually through **Actions > Deploy to GitHub Pages > Run workflow**.
Use `main` for a manual production deployment.

The build job uses Node.js 22, runs `npm ci`, `npm test`, then `npm run build`
(including TypeScript checks). It installs Chromium and runs `npx playwright test`
against the production preview, covering desktop and mobile workflows.
Only successful checks upload `dist` as the Pages artifact. The deploy job
publishes that artifact to the `github-pages`
environment. You do not need a `gh-pages` branch or a personal access token.

The workflow's default permission is `contents: read`. Only the deploy job
receives `pages: write` and `id-token: write`, which the Pages deployment action
requires. If the `github-pages` environment has protection rules, its permitted
branches and any required approvals must allow the deployment.

The separate [pull-request workflow](../.github/workflows/ci.yml) runs the same
unit tests, build, and browser regressions with read-only repository permissions;
it never deploys.
For mandatory merge checks, configure branch protection/rulesets to require the
CI check in GitHub.

## Base path and local verification

[Vite configuration](../vite.config.ts) sets:

```ts
base: '/travel-expense-report/'
```

This matches the project-site URL. It is necessary so JavaScript, CSS, fonts,
and the lazy-loaded PDF module load beneath the repository path.

Use Node.js 22.12 or newer within Node.js 22 and npm:

```sh
npm ci
npm test
npx playwright install chromium
npm run test:e2e
npm run preview -- --host 127.0.0.1 --port 4173
```

Open <http://127.0.0.1:4173/travel-expense-report/>. If the port is already in
use, use the port Vite prints. Stop preview with Ctrl+C when finished.

Before deploying, check report entry, date/time pickers, expense and receipt
editing, a `.reisekosten` save/open round trip, and a PDF download with receipts.
Check a narrow mobile layout and keyboard operation as well. Use synthetic data.

## Runtime data and hosting limits

Report fields and attached receipts remain in memory until the user downloads
a PDF or backup. Reloading/closing the page loses unsaved work. Downloaded files
are not encrypted by the app and may contain personal information.

Country/rate data is requested from
<https://cdn.jsdelivr.net/npm/pauschbetrag-api@1/ALL.json>. Successful responses
are cached in localStorage. The app displays a notice when using cached or
bundled data after an unavailable connection/request. The cached/bundled data
may not contain rates for every travel date.

This fallback does not make the hosted app fully offline-capable: there is no
service worker or guaranteed offline page/asset cache. The external data provider
and GitHub Pages can receive ordinary request metadata; no report upload API is
implemented. Users should verify rates and calculated results against their
organization's policy.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Workflow does not appear | The workflow must be committed and pushed. Manual runs require it to exist on the default branch. Check that Actions is enabled. |
| Build/test failure | Inspect the failing step in Actions. Reproduce with `npm ci`, `npm test`, and `npm run test:e2e` using the supported Node version. Install Chromium first; use `npx playwright install --with-deps chromium` if Linux browser libraries are missing. Do not bypass failing tests. |
| Deploy reports a Pages/permission error | Confirm **Settings > Pages > Source = GitHub Actions**, workflow/job permissions, Actions policy, and `github-pages` environment rules. |
| Site returns 404 | Use the full repository URL including `/travel-expense-report/`; confirm the deploy job succeeded. Initial publication can take a little time. |
| Blank page or missing assets | Check browser Network/Console for 404s. Verify Vite's base matches the published URL, rebuild, and deploy the new artifact. |
| Old version still visible | Confirm the expected commit deployed, then reload without cache. Check Actions for pending approvals or failed newer deployments. |
| Missing rate data | Read the in-app notice, check the external data request and travel dates. Publishing the static site does not guarantee current rates. |

## Renaming the repository or using a custom domain

If the project repository is renamed, update Vite's base to the new repository
path, update documented URLs, rebuild, and redeploy.

For a root-hosted custom domain or an account site such as
`heythorsten.github.io`, the base is normally `/`. Configure DNS and Pages'
custom-domain settings and HTTPS as appropriate; keep any required domain
configuration consistent with the deployed artifact. A root base must not be
used for the current repository subpath deployment.

[Back to README](../README.md)
