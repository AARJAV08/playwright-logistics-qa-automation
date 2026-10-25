import { test, expect } from '../../src/fixtures';
import { SEEDED } from '../../src/data/shipments';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ dashboard }) => {
    await dashboard.goto();
  });

  test('shows summary statistics @smoke @regression', async ({ dashboard }) => {
    await expect(dashboard.statTotal).toHaveText(String(SEEDED.count));
    await expect(dashboard.statActive).toHaveText(String(SEEDED.active));
    await expect(dashboard.statDelivered).toHaveText(String(SEEDED.delivered));
  });

  test('lists every shipment with its details @smoke @regression', async ({ dashboard }) => {
    await expect(dashboard.rows).toHaveCount(SEEDED.count);

    const row = dashboard.row(SEEDED.dispatched.id);
    await expect(row.customer).toHaveText(SEEDED.dispatched.customer);
    await expect(row.route).toHaveText(SEEDED.dispatched.route);
    await expect(row.weight).toHaveText('45 kg');
    await expect(row.status).toHaveText('Dispatched');
    await expect(row.driver).toHaveText(SEEDED.dispatched.driver);
  });

  test('shows an unassigned driver for a new shipment @regression', async ({ dashboard }) => {
    await expect(dashboard.row(SEEDED.created.id).driver).toHaveText('Unassigned');
  });

  test('delivered shipments have no actions @regression', async ({ dashboard }) => {
    const row = dashboard.row(SEEDED.deliveredOrder.id);

    await expect(row.noActions).toBeVisible();
    await expect(row.advanceButton).toHaveCount(0);
    await expect(row.cancelButton).toHaveCount(0);
  });

  test('shipment created through the API appears in the UI @regression', async ({ api, page, dashboard }) => {
    const created = await api.createAndGet({
      customer: 'API Customer',
      origin: 'Kolkata',
      destination: 'Patna',
      weightKg: 60,
    });

    await page.reload();
    await dashboard.rows.first().waitFor();

    await expect(dashboard.row(created.id).customer).toHaveText('API Customer');
    await expect(dashboard.statTotal).toHaveText(String(SEEDED.count + 1));
  });
});

test.describe('Dashboard - filtering and search', () => {
  test.beforeEach(async ({ dashboard }) => {
    await dashboard.goto();
  });

  test('filters by status @smoke @regression', async ({ dashboard }) => {
    await dashboard.filterByStatus('In Transit');

    await expect(dashboard.rows).toHaveCount(1);
    await expect(dashboard.row(SEEDED.inTransit.id).status).toHaveText('In Transit');
  });

  test('shows an empty state when no shipment matches the status @regression', async ({ dashboard }) => {
    await dashboard.filterByStatus('Cancelled');

    await expect(dashboard.rows).toHaveCount(0);
    await expect(dashboard.emptyState).toBeVisible();
  });

  test('clearing the status filter shows everything again @regression', async ({ dashboard }) => {
    await dashboard.filterByStatus('Delivered');
    await expect(dashboard.rows).toHaveCount(1);

    await dashboard.filterByStatus('');

    await expect(dashboard.rows).toHaveCount(SEEDED.count);
  });

  test('searches by customer name @regression', async ({ dashboard }) => {
    await dashboard.search('blue');

    await expect(dashboard.rows).toHaveCount(1);
    await expect(dashboard.row(SEEDED.dispatched.id).customer).toHaveText('Blue Mart');
  });

  test('searches by city @regression', async ({ dashboard }) => {
    await dashboard.search('mumbai');

    await expect(dashboard.rows).toHaveCount(1);
    await expect(dashboard.row(SEEDED.created.id).route).toContainText('Mumbai');
  });

  test('searches by shipment ID @regression', async ({ dashboard }) => {
    await dashboard.search('SHP-1003');

    await expect(dashboard.rowIds).toHaveText([SEEDED.inTransit.id]);
  });

  test('shows an empty state when the search has no match @regression', async ({ dashboard }) => {
    await dashboard.search('zzz-no-such-shipment');

    await expect(dashboard.emptyState).toBeVisible();
  });

  test('search and status filter work together @regression', async ({ dashboard }) => {
    await dashboard.filterByStatus('Delivered');
    await dashboard.search('blue');

    await expect(dashboard.rows).toHaveCount(0);
    await expect(dashboard.emptyState).toBeVisible();
  });
});
