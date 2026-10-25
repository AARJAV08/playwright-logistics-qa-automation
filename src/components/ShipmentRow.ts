import { Locator } from '@playwright/test';

/** A single row of the shipments table. */
export class ShipmentRow {
  readonly id: Locator;
  readonly customer: Locator;
  readonly route: Locator;
  readonly weight: Locator;
  readonly status: Locator;
  readonly driver: Locator;
  readonly driverSelect: Locator;
  readonly assignButton: Locator;
  readonly advanceButton: Locator;
  readonly cancelButton: Locator;
  readonly noActions: Locator;

  constructor(readonly root: Locator) {
    this.id = root.getByTestId('shipment-id');
    this.customer = root.getByTestId('shipment-customer');
    this.route = root.getByTestId('shipment-route');
    this.weight = root.getByTestId('shipment-weight');
    this.status = root.getByTestId('shipment-status');
    this.driver = root.getByTestId('shipment-driver');
    this.driverSelect = root.getByTestId('driver-select');
    this.assignButton = root.getByTestId('assign-btn');
    this.advanceButton = root.getByTestId('advance-btn');
    this.cancelButton = root.getByTestId('cancel-btn');
    this.noActions = root.getByTestId('no-actions');
  }

  async assignDriver(driverName: string): Promise<void> {
    await this.driverSelect.selectOption({ label: driverName });
    await this.assignButton.click();
  }

  async advance(): Promise<void> {
    await this.advanceButton.click();
  }

  async cancel(): Promise<void> {
    await this.cancelButton.click();
  }
}
