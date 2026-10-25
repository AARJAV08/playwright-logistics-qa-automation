import { test, expect } from '../../src/fixtures';
import { SEEDED, STATUS_FLOW, buildShipment } from '../../src/data/shipments';
import type { Shipment } from '../../src/data/shipments';

test.describe('Shipments API - read', () => {
  test('health check responds OK @smoke @api', async ({ request }) => {
    const response = await request.get('/api/health');

    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
  });

  test('lists seeded shipments with summary stats @smoke @api', async ({ api }) => {
    const response = await api.list();

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.shipments).toHaveLength(SEEDED.count);
    expect(body.stats).toEqual({ total: SEEDED.count, active: SEEDED.active, delivered: SEEDED.delivered });
  });

  test('filters shipments by status @regression @api', async ({ api }) => {
    const body = await (await api.list({ status: 'In Transit' })).json();

    expect(body.shipments).toHaveLength(1);
    expect(body.shipments[0].id).toBe(SEEDED.inTransit.id);
  });

  test('searches shipments by customer name, ignoring case @regression @api', async ({ api }) => {
    const body = await (await api.list({ q: 'BLUE mart' })).json();

    expect(body.shipments.map((s: Shipment) => s.id)).toEqual([SEEDED.dispatched.id]);
  });

  test('returns a single shipment with its tracking history @regression @api', async ({ api }) => {
    const response = await api.get(SEEDED.inTransit.id);

    expect(response.status()).toBe(200);
    const shipment: Shipment = await response.json();
    expect(shipment).toMatchObject({ id: SEEDED.inTransit.id, status: 'In Transit', driverId: 'DRV-02' });
    expect(shipment.history.map((e) => e.status)).toEqual(['Created', 'Dispatched', 'In Transit']);
  });

  test('tracking number lookup is case-insensitive @regression @api', async ({ api }) => {
    const response = await api.get('shp-1004');

    expect(response.status()).toBe(200);
    expect((await response.json()).status).toBe('Delivered');
  });

  test('returns 404 for an unknown shipment @regression @api', async ({ api }) => {
    const response = await api.get('SHP-9999');

    expect(response.status()).toBe(404);
    expect(await response.json()).toEqual({ error: 'Shipment not found' });
  });

  test('lists available drivers @regression @api', async ({ api }) => {
    const body = await (await api.drivers()).json();

    expect(body.drivers).toHaveLength(3);
    expect(body.drivers[0]).toEqual({ id: 'DRV-01', name: 'Ravi Kumar' });
  });
});

test.describe('Shipments API - create', () => {
  test('creates a shipment with status Created @smoke @api', async ({ api }) => {
    const response = await api.create(buildShipment({ customer: 'Global Traders', weightKg: 150 }));

    expect(response.status()).toBe(201);
    const shipment: Shipment = await response.json();
    expect(shipment).toMatchObject({
      id: 'SHP-1005',
      customer: 'Global Traders',
      origin: 'Gurugram',
      destination: 'Lucknow',
      weightKg: 150,
      priority: 'Normal',
      status: 'Created',
      driverId: null,
    });
    expect(shipment.history).toHaveLength(1);
  });

  test('created shipment can be fetched afterwards @regression @api', async ({ api }) => {
    const created = await api.createAndGet(buildShipment());

    const fetched = await (await api.get(created.id)).json();

    expect(fetched.id).toBe(created.id);
  });

  test('trims whitespace from text fields @regression @api', async ({ api }) => {
    const created = await api.createAndGet(buildShipment({ customer: '  Spaced Co  ', origin: ' Agra ' }));

    expect(created.customer).toBe('Spaced Co');
    expect(created.origin).toBe('Agra');
  });

  for (const weightKg of [1, 1000]) {
    test(`accepts the boundary weight of ${weightKg} kg @regression @api`, async ({ api }) => {
      const response = await api.create(buildShipment({ weightKg }));

      expect(response.status()).toBe(201);
    });
  }

  const invalidCases = [
    { name: 'missing customer', data: buildShipment({ customer: '' }), message: 'Customer name is required' },
    { name: 'missing origin', data: buildShipment({ origin: '' }), message: 'Origin is required' },
    { name: 'missing destination', data: buildShipment({ destination: '' }), message: 'Destination is required' },
    {
      name: 'same origin and destination',
      data: buildShipment({ origin: 'Delhi', destination: 'delhi' }),
      message: 'Origin and destination must be different',
    },
    { name: 'zero weight', data: buildShipment({ weightKg: 0 }), message: 'Weight must be a number between 1 and 1000 kg' },
    { name: 'negative weight', data: buildShipment({ weightKg: -5 }), message: 'Weight must be a number between 1 and 1000 kg' },
    { name: 'overweight', data: buildShipment({ weightKg: 1001 }), message: 'Weight must be a number between 1 and 1000 kg' },
    { name: 'non-numeric weight', data: buildShipment({ weightKg: 'heavy' }), message: 'Weight must be a number between 1 and 1000 kg' },
  ];

  for (const { name, data, message } of invalidCases) {
    test(`rejects ${name} @regression @api`, async ({ api }) => {
      const response = await api.create(data);

      expect(response.status()).toBe(400);
      expect((await response.json()).errors).toContain(message);
    });
  }

  test('does not store a shipment that failed validation @regression @api', async ({ api }) => {
    await api.create(buildShipment({ customer: '' }));

    const body = await (await api.list()).json();
    expect(body.stats.total).toBe(SEEDED.count);
  });
});

test.describe('Shipments API - lifecycle', () => {
  test('moves a shipment through the full delivery lifecycle @smoke @api', async ({ api }) => {
    const { id } = await api.createAndGet(buildShipment());

    expect((await api.assignDriver(id, 'DRV-01')).status()).toBe(200);
    for (const status of STATUS_FLOW.slice(1)) {
      const response = await api.updateStatus(id, status);
      expect(response.status(), `moving to ${status}`).toBe(200);
      expect((await response.json()).status).toBe(status);
    }

    const final: Shipment = await (await api.get(id)).json();
    expect(final.status).toBe('Delivered');
    // Created + driver assigned + 4 status changes
    expect(final.history).toHaveLength(6);
  });

  test('cannot dispatch without a driver @regression @api', async ({ api }) => {
    const response = await api.updateStatus(SEEDED.created.id, 'Dispatched');

    expect(response.status()).toBe(409);
    expect(await response.json()).toEqual({ error: 'Assign a driver before dispatching' });
  });

  test('cannot skip a status @regression @api', async ({ api }) => {
    const response = await api.updateStatus(SEEDED.created.id, 'Delivered');

    expect(response.status()).toBe(409);
    expect((await response.json()).error).toContain('Invalid status transition from Created to Delivered');
  });

  test('cannot move backwards @regression @api', async ({ api }) => {
    const response = await api.updateStatus(SEEDED.inTransit.id, 'Created');

    expect(response.status()).toBe(409);
  });

  test('rejects an unknown status value @regression @api', async ({ api }) => {
    const response = await api.updateStatus(SEEDED.created.id, 'Teleported');

    expect(response.status()).toBe(400);
  });

  test('cannot change a delivered shipment @regression @api', async ({ api }) => {
    const response = await api.updateStatus(SEEDED.deliveredOrder.id, 'Out for Delivery');

    expect(response.status()).toBe(409);
    expect((await response.json()).error).toBe('Shipment is already Delivered');
  });

  test('returns 404 when updating an unknown shipment @regression @api', async ({ api }) => {
    const response = await api.updateStatus('SHP-9999', 'Dispatched');

    expect(response.status()).toBe(404);
  });
});

test.describe('Shipments API - driver assignment and cancellation', () => {
  test('assigns a driver and records it in the history @regression @api', async ({ api }) => {
    const response = await api.assignDriver(SEEDED.created.id, 'DRV-03');

    expect(response.status()).toBe(200);
    const shipment: Shipment = await response.json();
    expect(shipment.driverId).toBe('DRV-03');
    expect(shipment.history.at(-1)?.note).toBe('Driver Amit Verma assigned');
  });

  test('rejects an unknown driver @regression @api', async ({ api }) => {
    const response = await api.assignDriver(SEEDED.created.id, 'DRV-99');

    expect(response.status()).toBe(404);
    expect(await response.json()).toEqual({ error: 'Driver not found' });
  });

  test('cannot assign a driver once the shipment is in transit @regression @api', async ({ api }) => {
    const response = await api.assignDriver(SEEDED.inTransit.id, 'DRV-01');

    expect(response.status()).toBe(409);
  });

  test('cancels a shipment that has not left yet @smoke @api', async ({ api }) => {
    const response = await api.updateStatus(SEEDED.created.id, 'Cancelled');

    expect(response.status()).toBe(200);
    expect((await response.json()).status).toBe('Cancelled');
  });

  test('cannot cancel a shipment that is already in transit @regression @api', async ({ api }) => {
    const response = await api.updateStatus(SEEDED.inTransit.id, 'Cancelled');

    expect(response.status()).toBe(409);
    expect((await response.json()).error).toBe('Cannot cancel a shipment that is In Transit');
  });

  test('cancelled shipment cannot be moved forward @regression @api', async ({ api }) => {
    await api.updateStatus(SEEDED.created.id, 'Cancelled');

    const response = await api.updateStatus(SEEDED.created.id, 'Dispatched');

    expect(response.status()).toBe(409);
    expect((await response.json()).error).toBe('Shipment is already Cancelled');
  });
});
