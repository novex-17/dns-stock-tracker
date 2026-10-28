# DNS Golf inventory workspace

A redesigned inventory aging dashboard based on https://dns-website-stock.vercel.app/.

## Run locally

Requires Node.js 20 or newer. No package installation is needed.

```sh
npm start
```

Open http://127.0.0.1:4173/ . Run `npm run check` for JavaScript syntax checks.

## Included

- Responsive dashboard with catalog totals, category breakdown, and review queue.
- Real audit data from the original site's public audit service.
- Search across product names, lots, categories, brands, and SKUs.
- Combined category, age, and lot filters; price/name/age sorting; pagination.
- Repair-service listings excluded from the review by default, with an explicit inclusion checkbox.
- Combined listing prices for the filtered review, clearly distinguished from inventory cost or quantity-adjusted value.
- UTF-8 CSV export of all filtered records (not just the current page), with Thai text and formula-prefix protection.
- Link to the original full Excel report.
- Loading, retry, empty-result, and error states. Prior results remain visible during refresh.

## Important implementation boundary

The public HTML, CSS, and browser JavaScript of the original website were inspected. Its server-side parser and original repository were not available.

`api/audit.js` forwards requests to the original site's fixed public `/api/audit` endpoint. This is an integration, not a recovered backend. It depends on that deployment remaining online. Do not replace the original deployment with this project without first replacing the proxy with the original parser: the hardcoded upstream would otherwise point back to itself.

Full Excel export is produced by the original service and is not filtered by this dashboard. CSV export reflects this dashboard's filters. Spreadsheet applications may auto-format numeric lot identifiers; import the Lot column as text to preserve leading zeroes.

The review supports 1, 3, 6, 9, and 12 calendar-month minimum ages, with month-end clamping. Six months is the default. The backend supplements the original six-month audit with newer in-stock products from the storefront public WooCommerce Store API and publication dates from its WordPress API. Catalog pages are cached for five minutes; Run live audit refreshes them. All catalog pages must succeed before results are returned. The summary cards and category chart remain the original six-month audit; selecting a category chart resets the review to six months. Catalog summary cards include all upstream listings; the review defaults to excluding the `Repairs` category. Category bars describe all aged listings. Prices are listing prices, not cost or stock valuation. The missing-lot headline is for the full catalog; the filtered missing-lot figure is shown in the green review panel.

## Deployment

The included `vercel.json` serves `public/` and exposes `api/audit.js` as a function. Deploy as a **separate** Vercel project using the Other framework preset. The configured 300-second function duration depends on the account's supported limits. No deployment has been performed and the original website has not been changed.

Once the original repository is provided, migrate its parser and Excel generation into the project and remove the upstream dependency before replacing the original deployment.

## Verification

Checked JavaScript syntax, successful local page and audit responses, real catalog totals, combined category/missing-lot filters, empty search, service inclusion, descending price sort, next-page navigation, and desktop/mobile layouts at 1440px and 390px. Native Excel generation remains owned by the original service. A fresh audit action was also exercised in the browser.

Verified all five thresholds against live inventory: 240 / 114 / 65 / 34 / 21 listings respectively on 2026-10-28, excluding repair services. Calendar cutoff checks cover ordinary dates, month-end clamping, and leap years.

