export type ShipmentStatus =
  | 'Created'
  | 'Dispatched'
  | 'In Transit'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Cancelled';

export type Priority = 'Normal' | 'Express';

export interface NewShipment {
  customer: string;
  origin: string;
  destination: string;
  weightKg: number | string;
  priority?: Priority;
}

export interface TrackingEvent {
  status: ShipmentStatus;
  note: string;
  at: string;
}

export interface Shipment {
  id: string;
  customer: string;
  origin: string;
  destination: string;
  weightKg: number;
  priority: Priority;
  status: ShipmentStatus;
  driverId: string | null;
  history: TrackingEvent[];
}

export interface Driver {
  id: string;
  name: string;
}

/** The delivery lifecycle in order. */
export const STATUS_FLOW: ShipmentStatus[] = [
  'Created',
  'Dispatched',
  'In Transit',
  'Out for Delivery',
  'Delivered',
];

/** Data the app is seeded with on every reset. */
export const SEEDED = {
  count: 4,
  active: 2,
  delivered: 1,
  created: { id: 'SHP-1001', customer: 'Acme Retail', route: 'Delhi → Mumbai' },
  dispatched: { id: 'SHP-1002', customer: 'Blue Mart', route: 'Noida → Jaipur', driver: 'Ravi Kumar' },
  inTransit: { id: 'SHP-1003', customer: 'FreshFarm', route: 'Pune → Hyderabad', driver: 'Sunita Sharma' },
  deliveredOrder: { id: 'SHP-1004', customer: 'Techhub', route: 'Chennai → Bengaluru', driver: 'Amit Verma' },
};

/** Builds a valid shipment payload; override any field for negative tests. */
export function buildShipment(overrides: Partial<NewShipment> = {}): NewShipment {
  return {
    customer: 'Global Traders',
    origin: 'Gurugram',
    destination: 'Lucknow',
    weightKg: 150,
    priority: 'Normal',
    ...overrides,
  };
}
