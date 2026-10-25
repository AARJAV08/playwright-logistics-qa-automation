import { Locator, Page } from '@playwright/test';

export class TrackingPanel {
  readonly input: Locator;
  readonly trackButton: Locator;
  readonly result: Locator;
  readonly id: Locator;
  readonly status: Locator;
  readonly route: Locator;
  readonly timeline: Locator;
  readonly error: Locator;

  constructor(page: Page) {
    this.input = page.getByTestId('track-input');
    this.trackButton = page.getByTestId('track-btn');
    this.result = page.getByTestId('track-result');
    this.id = page.getByTestId('track-id');
    this.status = page.getByTestId('track-status');
    this.route = page.getByTestId('track-route');
    this.timeline = page.getByTestId('timeline-event');
    this.error = page.getByTestId('track-error');
  }

  async track(trackingNumber: string): Promise<void> {
    await this.input.fill(trackingNumber);
    await this.trackButton.click();
  }
}
