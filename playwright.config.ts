import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;
const port = process.env.PORT ?? '4173';
const baseURL = process.env.BASE_URL ?? `http://localhost:${port}`;

export default defineConfig({
  testDir: './tests',

  // The bundled app keeps its data in memory and tests reset it before each run,
  // so tests run one at a time to stay deterministic.
  fullyParallel: false,
  workers: 1,

  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  timeout: 30_000,
  expect: { timeout: 5_000 },

  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ...(isCI ? ([['github']] as const) : []),
  ],

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  // Starts the LogiTrack app automatically before the tests
  webServer: {
    command: 'node app/server.js',
    url: `${baseURL}/api/health`,
    env: { PORT: port },
    reuseExistingServer: !isCI,
    timeout: 30_000,
  },

  projects: [
    {
      name: 'chromium',
      testMatch: 'ui/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined },
      },
    },
    { name: 'firefox', testMatch: 'ui/**/*.spec.ts', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', testMatch: 'ui/**/*.spec.ts', use: { ...devices['Desktop Safari'] } },
    { name: 'api', testMatch: 'api/**/*.spec.ts' },
  ],
});
