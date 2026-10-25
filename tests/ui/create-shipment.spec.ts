import { test, expect } from '../../src/fixtures';
import { SEEDED, buildShipment } from '../../src/data/shipments';

test.describe('Create shipment', () => {
  test.beforeEach(async ({ dashboard }) => {
    await dashboard.goto();
  });

  test('user can create a shipment @smoke @regression', async ({ dashboard, createForm }) => {
    await createForm.submit(buildShipment({ customer: 'Global Traders', weightKg: 150, priority: 'Express' }));

    await expect(dashboard.toast).toHaveText('Shipment SHP-1005 created');
    const row = dashboard.row('SHP-1005');
    await expect(row.customer).toHaveText('Global Traders');
    await expect(row.route).toHaveText('Gurugram → Lucknow');
    await expect(row.weight).toHaveText('150 kg');
    await expect(row.status).toHaveText('Created');
    await expect(row.driver).toHaveText('Unassigned');
  });

  test('summary statistics update after creating a shipment @regression', async ({ dashboard, createForm }) => {
    await createForm.submit(buildShipment());

    await expect(dashboard.statTotal).toHaveText(String(SEEDED.count + 1));
  });

  test('form is cleared after a successful submit @regression', async ({ dashboard, createForm }) => {
    await createForm.submit(buildShipment());
    await expect(dashboard.toast).toContainText('created');

    await expect(createForm.customer).toBeEmpty();
    await expect(createForm.origin).toBeEmpty();
    await expect(createForm.destination).toBeEmpty();
    await expect(createForm.weight).toBeEmpty();
  });

  test('shows all required-field errors for an empty form @smoke @regression', async ({ createForm }) => {
    await createForm.submitButton.click();

    await expect(createForm.error).toContainText('Customer name is required');
    await expect(createForm.error).toContainText('Origin is required');
    await expect(createForm.error).toContainText('Destination is required');
    await expect(createForm.error).toContainText('Weight must be a number between 1 and 1000 kg');
  });

  test('rejects identical origin and destination @regression', async ({ createForm }) => {
    await createForm.submit(buildShipment({ origin: 'Delhi', destination: 'Delhi' }));

    await expect(createForm.error).toContainText('Origin and destination must be different');
  });

  for (const weightKg of ['0', '1001', 'abc']) {
    test(`rejects invalid weight "${weightKg}" @regression`, async ({ createForm }) => {
      await createForm.submit(buildShipment({ weightKg }));

      await expect(createForm.error).toContainText('Weight must be a number between 1 and 1000 kg');
    });
  }

  test('does not add a row when validation fails @regression', async ({ dashboard, createForm }) => {
    await createForm.submit(buildShipment({ customer: '' }));
    await expect(createForm.error).toBeVisible();

    await expect(dashboard.rows).toHaveCount(SEEDED.count);
  });

  test('error message disappears after a valid submit @regression', async ({ dashboard, createForm }) => {
    await createForm.submitButton.click();
    await expect(createForm.error).toBeVisible();

    await createForm.submit(buildShipment());

    await expect(dashboard.toast).toContainText('created');
    await expect(createForm.error).toBeHidden();
  });
});
