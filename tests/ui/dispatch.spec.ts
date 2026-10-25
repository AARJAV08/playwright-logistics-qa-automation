import { test, expect } from '../../src/fixtures';
import { SEEDED } from '../../src/data/shipments';

test.describe('Driver assignment and dispatch', () => {
  test.beforeEach(async ({ dashboard }) => {
    await dashboard.goto();
  });

  test('dispatcher can assign a driver @smoke @regression', async ({ dashboard }) => {
    const row = dashboard.row(SEEDED.created.id);

    await row.assignDriver('Amit Verma');

    await expect(dashboard.toast).toHaveText(`Driver assigned to ${SEEDED.created.id}`);
    await expect(row.driver).toHaveText('Amit Verma');
  });

  test('assigning without choosing a driver shows a message @regression', async ({ dashboard }) => {
    await dashboard.row(SEEDED.created.id).assignButton.click();

    await expect(dashboard.toast).toHaveText('Select a driver first');
  });

  test('shipment cannot be dispatched without a driver @smoke @regression', async ({ dashboard }) => {
    const row = dashboard.row(SEEDED.created.id);

    await row.advance();

    await expect(dashboard.toast).toHaveText('Assign a driver before dispatching');
    await expect(row.status).toHaveText('Created');
  });

  test('shipment can be dispatched after a driver is assigned @smoke @regression', async ({ dashboard }) => {
    const row = dashboard.row(SEEDED.created.id);
    await row.assignDriver('Ravi Kumar');
    await expect(row.driver).toHaveText('Ravi Kumar');

    await row.advance();

    await expect(row.status).toHaveText('Dispatched');
    await expect(dashboard.toast).toHaveText(`${SEEDED.created.id} is now Dispatched`);
    await expect(dashboard.statActive).toHaveText(String(SEEDED.active + 1));
  });

  test('driver can be reassigned before the shipment is in transit @regression', async ({ dashboard }) => {
    const row = dashboard.row(SEEDED.dispatched.id);
    await expect(row.driver).toHaveText('Ravi Kumar');

    await row.assignDriver('Sunita Sharma');

    await expect(row.driver).toHaveText('Sunita Sharma');
  });

  test('driver assignment is not offered once a shipment is in transit @regression', async ({ dashboard }) => {
    const row = dashboard.row(SEEDED.inTransit.id);

    await expect(row.assignButton).toHaveCount(0);
    await expect(row.driverSelect).toHaveCount(0);
  });
});

test.describe('Delivery lifecycle', () => {
  test.beforeEach(async ({ dashboard }) => {
    await dashboard.goto();
  });

  test('shipment moves from Dispatched to Delivered @smoke @regression', async ({ dashboard }) => {
    const row = dashboard.row(SEEDED.dispatched.id);

    await expect(row.advanceButton).toHaveText('Mark In Transit');
    await row.advance();
    await expect(row.status).toHaveText('In Transit');

    await expect(row.advanceButton).toHaveText('Out for Delivery');
    await row.advance();
    await expect(row.status).toHaveText('Out for Delivery');

    await expect(row.advanceButton).toHaveText('Mark Delivered');
    await row.advance();
    await expect(row.status).toHaveText('Delivered');

    await expect(row.noActions).toBeVisible();
    await expect(dashboard.statDelivered).toHaveText(String(SEEDED.delivered + 1));
  });

  test('active count drops once a shipment is delivered @regression', async ({ dashboard }) => {
    const row = dashboard.row(SEEDED.dispatched.id);
    for (const status of ['In Transit', 'Out for Delivery', 'Delivered']) {
      await row.advance();
      await expect(row.status).toHaveText(status);
    }

    await expect(row.status).toHaveText('Delivered');
    await expect(dashboard.statActive).toHaveText(String(SEEDED.active - 1));
  });

  test('shipment can be cancelled before it leaves @smoke @regression', async ({ dashboard }) => {
    const row = dashboard.row(SEEDED.created.id);

    await row.cancel();

    await expect(row.status).toHaveText('Cancelled');
    await expect(dashboard.toast).toHaveText(`${SEEDED.created.id} cancelled`);
    await expect(row.noActions).toBeVisible();
  });

  test('cancel is not offered for a shipment in transit @regression', async ({ dashboard }) => {
    await expect(dashboard.row(SEEDED.inTransit.id).cancelButton).toHaveCount(0);
  });

  test('cancelled shipments can be found with the status filter @regression', async ({ dashboard }) => {
    await dashboard.row(SEEDED.created.id).cancel();
    await expect(dashboard.row(SEEDED.created.id).status).toHaveText('Cancelled');

    await dashboard.filterByStatus('Cancelled');

    await expect(dashboard.rowIds).toHaveText([SEEDED.created.id]);
  });
});
