# Playwright Logistics QA Automation

![Playwright Tests](https://github.com/AARJAV08/playwright-logistics-qa-automation/actions/workflows/playwright.yml/badge.svg)

UI and API test automation for a **shipment management (logistics) application**, built with **Playwright** and **TypeScript** using the **Page Object Model**.

The repository includes **LogiTrack**, a small dependency-free web app (Node.js) that acts as the system under test. It covers the core logistics workflow: creating shipments, assigning drivers, dispatching, moving a shipment through its delivery lifecycle, cancelling, and tracking. Because the app is bundled, the tests are fully self-contained and run the same way on any machine or CI.

## Highlights

- 76 automated tests: 41 UI tests and 35 REST API tests
- Page Object Model with reusable components (`ShipmentRow`, `CreateShipmentForm`, `TrackingPanel`)
- Custom fixtures that inject page objects and an API client, with automatic data reset before every test
- Business-rule testing: status transitions, "driver required before dispatch", cancellation rules, input validation and boundary values
- API-driven test set-up combined with UI verification
- `@smoke`, `@regression` and `@api` tags to run focused suites
- The app starts automatically through Playwright's `webServer` setting
- Configured for Chromium, Firefox and WebKit
- HTML report, trace on first retry, screenshots and video on failure
- GitHub Actions pipeline with type-checking and report upload

## The Application: LogiTrack

A shipment moves through this lifecycle:

```
Created -> Dispatched -> In Transit -> Out for Delivery -> Delivered
   \________ Cancelled (only from Created or Dispatched) ________/
```

Business rules covered by the tests:

| Rule | Where it is tested |
| --- | --- |
| A driver must be assigned before a shipment can be dispatched | UI and API |
| Statuses cannot be skipped or moved backwards | API |
| Delivered and cancelled shipments cannot be changed | UI and API |
| Cancellation is only allowed before the shipment is in transit | UI and API |
| Drivers can only be assigned or changed before transit | UI and API |
| Weight must be 1 to 1000 kg; customer, origin and destination are required; origin and destination must differ | UI and API |
| Tracking numbers are case-insensitive and the timeline records every change | UI and API |

## Test Coverage

| Area | Examples |
| --- | --- |
| Dashboard | Summary statistics, shipment details, status filter, search by customer, city and ID, empty states, combined filter and search |
| Create shipment | Successful creation, form reset, stats update, required fields, identical locations, invalid weights |
| Dispatch and lifecycle | Assign and reassign driver, dispatch rules, full lifecycle to Delivered, active and delivered counters, cancellation |
| Tracking | Status, route and timeline, case-insensitive lookup, unknown and empty tracking number, timeline after driver assignment |
| API | Read, filter, search, 404 handling, create with validation and boundaries, lifecycle, transition rules, driver assignment, cancellation |

## Project Structure

```
.
├── app/
│   ├── server.js                      # LogiTrack API + static server (no dependencies)
│   └── public/index.html              # LogiTrack web UI
├── src/
│   ├── api/ShipmentsApi.ts            # API client used by tests and fixtures
│   ├── components/                    # Reusable UI components (row, form, tracking panel)
│   ├── data/shipments.ts              # Types, seeded data, test data builder
│   ├── fixtures/index.ts              # Custom test with page objects and auto data reset
│   └── pages/DashboardPage.ts         # Page object
├── tests/
│   ├── api/shipments.api.spec.ts
│   └── ui/
│       ├── dashboard.spec.ts
│       ├── create-shipment.spec.ts
│       ├── dispatch.spec.ts
│       └── tracking.spec.ts
├── .github/workflows/playwright.yml   # CI pipeline
├── playwright.config.ts
└── package.json
```

## Getting Started

**Prerequisites:** Node.js 18 or later and npm.

```bash
git clone https://github.com/AARJAV08/playwright-logistics-qa-automation.git
cd playwright-logistics-qa-automation
npm install
npx playwright install --with-deps
```

## Running the Tests

The app starts automatically, so a single command is enough:

```bash
npm test
```

| Command | Description |
| --- | --- |
| `npm test` | Run all UI and API tests |
| `npm run test:smoke` | Run only `@smoke` tests |
| `npm run test:regression` | Run only `@regression` tests |
| `npm run test:api` | Run only API tests |
| `npm run test:chromium` / `test:firefox` / `test:webkit` | Run UI tests in one browser |
| `npm run test:headed` | Run on Chromium with a visible browser |
| `npm run test:ui-mode` | Open Playwright's interactive UI mode |
| `npm run test:debug` | Step through tests with the Playwright Inspector |
| `npm run report` | Open the last HTML report |
| `npm run typecheck` | Type-check the TypeScript code |
| `npm run start:app` | Start LogiTrack manually at http://localhost:4173 |

Run a single file or test:

```bash
npx playwright test tests/ui/dispatch.spec.ts --project=chromium
npx playwright test -g "cannot be dispatched without a driver" --project=chromium
```

## Configuration

See `.env.example`. Useful variables:

| Variable | Purpose |
| --- | --- |
| `PORT` | Port for the bundled app (default `4173`) |
| `BASE_URL` | Run the tests against an already running instance |
| `CHROMIUM_EXECUTABLE_PATH` | Use a locally installed Chromium instead of the downloaded one |

## Design Decisions

- **Deterministic data:** the app keeps data in memory. An auto-fixture resets it to a known seed before each test, and tests run with one worker so they never interfere with each other.
- **Web-first assertions:** tests rely on Playwright's auto-retrying `expect` instead of fixed waits, which keeps them stable.
- **Page Object Model with components:** table rows, the creation form and the tracking panel are separate classes, so specs read like business scenarios.
- **API for set-up, UI for verification:** state that is not the focus of a test is prepared through the API, which is faster and more reliable.
- **Tagged tests:** `@smoke` gives a quick pipeline check, `@regression` the full suite.

## Ideas for Future Work

- Parallel execution with an isolated data store per worker
- Visual regression checks with `toHaveScreenshot`
- Accessibility checks with `@axe-core/playwright`
- Performance checks for dashboard load with large shipment lists

## Author

**Aarjav Jain**, Quality Analyst
GitHub: [@AARJAV08](https://github.com/AARJAV08)

## License

MIT
