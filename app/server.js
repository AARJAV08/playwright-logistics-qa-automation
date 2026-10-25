// LogiTrack - a tiny in-memory shipment management app used as the system under test.
// Zero dependencies: run with `node app/server.js`.
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 4173;
const FLOW = ['Created', 'Dispatched', 'In Transit', 'Out for Delivery', 'Delivered'];
const DRIVERS = [
  { id: 'DRV-01', name: 'Ravi Kumar' },
  { id: 'DRV-02', name: 'Sunita Sharma' },
  { id: 'DRV-03', name: 'Amit Verma' },
];

let shipments = [];
let nextNumber = 1005;

function event(status, note) {
  return { status, note, at: new Date().toISOString() };
}

function seed() {
  const make = (id, customer, origin, destination, weightKg, priority, status, driverId) => {
    const history = [event('Created', 'Shipment created')];
    const upTo = FLOW.indexOf(status);
    for (let i = 1; i <= upTo; i++) history.push(event(FLOW[i], `Status changed to ${FLOW[i]}`));
    return { id, customer, origin, destination, weightKg, priority, status, driverId, history };
  };
  shipments = [
    make('SHP-1001', 'Acme Retail', 'Delhi', 'Mumbai', 120, 'Normal', 'Created', null),
    make('SHP-1002', 'Blue Mart', 'Noida', 'Jaipur', 45, 'Express', 'Dispatched', 'DRV-01'),
    make('SHP-1003', 'FreshFarm', 'Pune', 'Hyderabad', 300, 'Normal', 'In Transit', 'DRV-02'),
    make('SHP-1004', 'Techhub', 'Chennai', 'Bengaluru', 80, 'Normal', 'Delivered', 'DRV-03'),
  ];
  nextNumber = 1005;
}

function stats() {
  return {
    total: shipments.length,
    active: shipments.filter((s) => ['Dispatched', 'In Transit', 'Out for Delivery'].includes(s.status)).length,
    delivered: shipments.filter((s) => s.status === 'Delivered').length,
  };
}

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve(null);
      }
    });
  });
}

function findShipment(id) {
  return shipments.find((s) => s.id.toLowerCase() === String(id).toLowerCase());
}

function validateNewShipment(input) {
  const errors = [];
  const text = (v) => (typeof v === 'string' ? v.trim() : '');
  if (!text(input.customer)) errors.push('Customer name is required');
  if (!text(input.origin)) errors.push('Origin is required');
  if (!text(input.destination)) errors.push('Destination is required');
  if (text(input.origin) && text(input.origin).toLowerCase() === text(input.destination).toLowerCase()) {
    errors.push('Origin and destination must be different');
  }
  const weight = typeof input.weightKg === 'string' ? Number(input.weightKg.trim() || NaN) : input.weightKg;
  if (typeof weight !== 'number' || !Number.isFinite(weight) || weight < 1 || weight > 1000) {
    errors.push('Weight must be a number between 1 and 1000 kg');
  }
  const priority = input.priority ?? 'Normal';
  if (!['Normal', 'Express'].includes(priority)) errors.push('Priority must be Normal or Express');
  return { errors, weight, priority };
}

async function handleApi(req, res, url) {
  const { pathname } = url;
  const method = req.method;

  if (method === 'GET' && pathname === '/api/health') return send(res, 200, { status: 'ok' });

  if (method === 'POST' && pathname === '/api/reset') {
    seed();
    return send(res, 200, { status: 'reset' });
  }

  if (method === 'GET' && pathname === '/api/drivers') return send(res, 200, { drivers: DRIVERS });

  if (method === 'GET' && pathname === '/api/shipments') {
    const status = url.searchParams.get('status');
    const q = (url.searchParams.get('q') || '').trim().toLowerCase();
    let list = shipments;
    if (status) list = list.filter((s) => s.status === status);
    if (q) {
      list = list.filter((s) =>
        [s.id, s.customer, s.origin, s.destination].some((v) => v.toLowerCase().includes(q)),
      );
    }
    return send(res, 200, { shipments: list, stats: stats() });
  }

  if (method === 'POST' && pathname === '/api/shipments') {
    const body = await readBody(req);
    if (body === null) return send(res, 400, { errors: ['Invalid JSON body'] });
    const { errors, weight, priority } = validateNewShipment(body);
    if (errors.length) return send(res, 400, { errors });
    const shipment = {
      id: `SHP-${nextNumber++}`,
      customer: body.customer.trim(),
      origin: body.origin.trim(),
      destination: body.destination.trim(),
      weightKg: weight,
      priority,
      status: 'Created',
      driverId: null,
      history: [event('Created', 'Shipment created')],
    };
    shipments.push(shipment);
    return send(res, 201, shipment);
  }

  const match = pathname.match(/^\/api\/shipments\/([^/]+)(?:\/(status|assign))?$/);
  if (match) {
    const shipment = findShipment(decodeURIComponent(match[1]));
    const action = match[2];
    if (!shipment) return send(res, 404, { error: 'Shipment not found' });

    if (method === 'GET' && !action) return send(res, 200, shipment);

    if (method === 'POST' && action === 'assign') {
      const body = (await readBody(req)) || {};
      const driver = DRIVERS.find((d) => d.id === body.driverId);
      if (!driver) return send(res, 404, { error: 'Driver not found' });
      if (!['Created', 'Dispatched'].includes(shipment.status)) {
        return send(res, 409, { error: `Cannot assign a driver to a shipment that is ${shipment.status}` });
      }
      shipment.driverId = driver.id;
      shipment.history.push(event(shipment.status, `Driver ${driver.name} assigned`));
      return send(res, 200, shipment);
    }

    if (method === 'PATCH' && action === 'status') {
      const body = (await readBody(req)) || {};
      const target = body.status;
      const current = shipment.status;

      if (target === 'Cancelled') {
        if (!['Created', 'Dispatched'].includes(current)) {
          return send(res, 409, { error: `Cannot cancel a shipment that is ${current}` });
        }
        shipment.status = 'Cancelled';
        shipment.history.push(event('Cancelled', 'Shipment cancelled'));
        return send(res, 200, shipment);
      }

      if (!FLOW.includes(target)) return send(res, 400, { error: 'Unknown status' });
      if (current === 'Delivered' || current === 'Cancelled') {
        return send(res, 409, { error: `Shipment is already ${current}` });
      }
      if (FLOW.indexOf(target) !== FLOW.indexOf(current) + 1) {
        return send(res, 409, { error: `Invalid status transition from ${current} to ${target}` });
      }
      if (target === 'Dispatched' && !shipment.driverId) {
        return send(res, 409, { error: 'Assign a driver before dispatching' });
      }
      shipment.status = target;
      shipment.history.push(event(target, `Status changed to ${target}`));
      return send(res, 200, shipment);
    }
  }

  return send(res, 404, { error: 'Not found' });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname.startsWith('/api/')) return handleApi(req, res, url);
  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(fs.readFileSync(path.join(__dirname, 'public', 'index.html')));
  }
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

seed();
server.listen(PORT, () => console.log(`LogiTrack running at http://localhost:${PORT}`));
