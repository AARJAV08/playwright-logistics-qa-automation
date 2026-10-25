import { test, expect } from '../../src/fixtures';
import { SEEDED } from '../../src/data/shipments';

test.describe('Shipment tracking', () => {
  test.beforeEach(async ({ dashboard }) => {
    await dashboard.goto();
  });

  test('shows status, route and timeline for a valid tracking number @smoke @regression', async ({ tracking }) => {
    await tracking.track(SEEDED.inTransit.id);

    await expect(tracking.result).toBeVisible();
    await expect(tracking.id).toHaveText(SEEDED.inTransit.id);
    await expect(tracking.status).toHaveText('In Transit');
    await expect(tracking.route).toHaveText('Pune to Hyderabad');
    await expect(tracking.timeline).toHaveText([
      'Created - Shipment created',
      'Dispatched - Status changed to Dispatched',
      'In Transit - Status changed to In Transit',
    ]);
  });

  test('tracking number is case-insensitive @regression', async ({ tracking }) => {
    await tracking.track('shp-1004');

    await expect(tracking.status).toHaveText('Delivered');
    await expect(tracking.timeline).toHaveCount(5);
  });

  test('shows an error for an unknown tracking number @smoke @regression', async ({ tracking }) => {
    await tracking.track('SHP-9999');

    await expect(tracking.error).toHaveText('Shipment not found');
    await expect(tracking.result).toBeHidden();
  });

  test('asks for a tracking number when the field is empty @regression', async ({ tracking }) => {
    await tracking.trackButton.click();

    await expect(tracking.error).toHaveText('Enter a tracking number');
  });

  test('previous result is cleared after a failed lookup @regression', async ({ tracking }) => {
    await tracking.track(SEEDED.created.id);
    await expect(tracking.result).toBeVisible();

    await tracking.track('SHP-0000');

    await expect(tracking.result).toBeHidden();
    await expect(tracking.error).toBeVisible();
  });

  test('timeline records driver assignment and dispatch @regression', async ({ api, page, dashboard, tracking }) => {
    await api.assignDriver(SEEDED.created.id, 'DRV-01');
    await api.updateStatus(SEEDED.created.id, 'Dispatched');
    await page.reload();
    await dashboard.rows.first().waitFor();

    await tracking.track(SEEDED.created.id);

    await expect(tracking.status).toHaveText('Dispatched');
    await expect(tracking.timeline).toHaveText([
      'Created - Shipment created',
      'Created - Driver Ravi Kumar assigned',
      'Dispatched - Status changed to Dispatched',
    ]);
  });

  test('status changed in the dashboard is reflected in tracking @regression', async ({ dashboard, tracking }) => {
    await dashboard.row(SEEDED.dispatched.id).advance();
    await expect(dashboard.row(SEEDED.dispatched.id).status).toHaveText('In Transit');

    await tracking.track(SEEDED.dispatched.id);

    await expect(tracking.status).toHaveText('In Transit');
    await expect(tracking.timeline).toHaveCount(3);
  });
});
