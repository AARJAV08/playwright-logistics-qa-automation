import { Locator, Page } from '@playwright/test';
import { NewShipment } from '../data/shipments';

export class CreateShipmentForm {
  readonly customer: Locator;
  readonly origin: Locator;
  readonly destination: Locator;
  readonly weight: Locator;
  readonly priority: Locator;
  readonly submitButton: Locator;
  readonly error: Locator;

  constructor(page: Page) {
    this.customer = page.getByTestId('input-customer');
    this.origin = page.getByTestId('input-origin');
    this.destination = page.getByTestId('input-destination');
    this.weight = page.getByTestId('input-weight');
    this.priority = page.getByTestId('select-priority');
    this.submitButton = page.getByTestId('submit-shipment');
    this.error = page.getByTestId('form-error');
  }

  async fill(data: Partial<NewShipment>): Promise<void> {
    if (data.customer !== undefined) await this.customer.fill(data.customer);
    if (data.origin !== undefined) await this.origin.fill(data.origin);
    if (data.destination !== undefined) await this.destination.fill(data.destination);
    if (data.weightKg !== undefined) await this.weight.fill(String(data.weightKg));
    if (data.priority !== undefined) await this.priority.selectOption(data.priority);
  }

  async submit(data: Partial<NewShipment>): Promise<void> {
    await this.fill(data);
    await this.submitButton.click();
  }
}
