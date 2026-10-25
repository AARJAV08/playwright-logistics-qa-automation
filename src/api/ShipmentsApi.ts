import { APIRequestContext, APIResponse } from '@playwright/test';
import { NewShipment, Shipment, ShipmentStatus } from '../data/shipments';

/** Thin wrapper around the LogiTrack REST API used by both API tests and UI test set-up. */
export class ShipmentsApi {
  constructor(private readonly request: APIRequestContext) {}

  async reset(): Promise<void> {
    await this.request.post('/api/reset');
  }

  list(params: { status?: string; q?: string } = {}): Promise<APIResponse> {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.q) query.set('q', params.q);
    return this.request.get(`/api/shipments?${query}`);
  }

  get(id: string): Promise<APIResponse> {
    return this.request.get(`/api/shipments/${id}`);
  }

  create(data: NewShipment | Record<string, unknown>): Promise<APIResponse> {
    return this.request.post('/api/shipments', { data });
  }

  assignDriver(id: string, driverId: string): Promise<APIResponse> {
    return this.request.post(`/api/shipments/${id}/assign`, { data: { driverId } });
  }

  updateStatus(id: string, status: ShipmentStatus | string): Promise<APIResponse> {
    return this.request.patch(`/api/shipments/${id}/status`, { data: { status } });
  }

  drivers(): Promise<APIResponse> {
    return this.request.get('/api/drivers');
  }

  /** Creates a shipment and returns the parsed body (fails fast if creation fails). */
  async createAndGet(data: NewShipment): Promise<Shipment> {
    const response = await this.create(data);
    if (response.status() !== 201) {
      throw new Error(`Could not create shipment: ${response.status()} ${await response.text()}`);
    }
    return response.json();
  }
}
