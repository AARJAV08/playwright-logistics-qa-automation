import { test as base, expect } from '@playwright/test';
import { DashboardPage } from '../pages/DashboardPage';
import { CreateShipmentForm } from '../components/CreateShipmentForm';
import { TrackingPanel } from '../components/TrackingPanel';
import { ShipmentsApi } from '../api/ShipmentsApi';

type Fixtures = {
  api: ShipmentsApi;
  dashboard: DashboardPage;
  createForm: CreateShipmentForm;
  tracking: TrackingPanel;
  resetData: void;
};

/**
 * Custom `test` with page objects and an API helper.
 * `resetData` runs automatically so every test starts from the same seeded data.
 */
export const test = base.extend<Fixtures>({
  resetData: [
    async ({ request }, use) => {
      await new ShipmentsApi(request).reset();
      await use();
    },
    { auto: true },
  ],
  api: async ({ request }, use) => use(new ShipmentsApi(request)),
  dashboard: async ({ page }, use) => use(new DashboardPage(page)),
  createForm: async ({ page }, use) => use(new CreateShipmentForm(page)),
  tracking: async ({ page }, use) => use(new TrackingPanel(page)),
});

export { expect };
