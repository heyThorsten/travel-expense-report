# Reisekostenabrechnung

German-language, browser-based travel expense reporting with Vue 3, TypeScript,
Vite, and Vuetify 3.

## Features

- Personal details, trip purpose, and multi-stop itineraries.
- Meal allowances using country/region rate data and provided-meal selections.
- Transport, accommodation, and incidental expenses, including private-car mileage.
- Optional PDF or image receipts, included in the generated PDF report.
- Editable `.reisekosten` backups containing report data and receipts.

Report data stays in browser memory until downloaded; there is no autosave or
server-side storage. Save a backup before refreshing or closing the app.
Country/rate data is fetched externally and cached locally, with a bundled
fallback. Always check calculated results against your applicable travel policy.

## Documentation

- [User guide / Benutzeranleitung (Deutsch)](docs/USER_GUIDE.de.md)
- [Deployment to GitHub Pages](docs/DEPLOYMENT.md)

## Development

Use Node.js 22.12 or later in the Node.js 22 release line and npm; CI uses
Node.js 22.

From the repository root:

- `npm ci` installs the locked workspace dependencies.
- `npm run dev` starts the local development server.
- `npm run build` runs the TypeScript check and creates a production build.
- `npm test` runs unit tests.
- `npm run test:e2e` builds the app and runs desktop/mobile browser regressions.
- `npm run preview` serves the production build locally.

Before the first browser-test run, install Chromium with
`npx playwright install chromium` (on a Linux CI runner, use
`npx playwright install --with-deps chromium`). The browser tests start and stop
their own production preview on port 4187; keep that port free.

Open the URL printed by Vite, including `/travel-expense-report/`. For production
preview, run `npm run build` first.

Pull requests run unit tests, a production build, and browser regressions in
[CI](.github/workflows/ci.yml). Pushes to `main` run those checks before
[deploying to Pages](.github/workflows/deploy.yml).

## Code organization

- [App.vue](src/App.vue) composes the report sections and coordinates their events.
- [components](src/components/) contains personal/trip details, itinerary,
  meal-allowance, and expense views.
- [composables](src/composables/) owns report state/validation, destination loading,
  and archive/PDF file operations.
- [expenseCalculations.ts](src/domain/expenseCalculations.ts) shares exact-cent
  calculations, safe totals, and expense ordering between UI and PDF.
- [reportPdf.ts](src/domain/reportPdf.ts) defines report content and receipts;
  [reportPdfWriter.ts](src/domain/reportPdfWriter.ts) handles layout and text.
- [browser tests](tests/report.e2e.ts) cover keyboard time entry, mobile widths,
  receipt editing, archive round trips, PDF downloads, and unavailable totals.
