import { Locator, Page } from '@playwright/test';
import { ShipmentRow } from '../components/ShipmentRow';

export class DashboardPage {
  readonly statTotal: Locator;
  readonly statActive: Locator;
  readonly statDelivered: Locator;
  readonly statusFilter: Locator;
  readonly searchInput: Locator;
  readonly rows: Locator;
  readonly rowIds: Locator;
  readonly emptyState: Locator;
  readonly toast: Locator;

  constructor(private readonly page: Page) {
    this.statTotal = page.getByTestId('stat-total');
    this.statActive = page.getByTestId('stat-active');
    this.statDelivered = page.getByTestId('stat-delivered');
    this.statusFilter = page.getByTestId('status-filter');
    this.searchInput = page.getByTestId('search-input');
    this.rows = page.getByTestId('shipment-row');
    this.rowIds = page.getByTestId('shipment-id');
    this.emptyState = page.getByTestId('empty-state');
    this.toast = page.getByTestId('toast');
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
    // Wait for the first data load so assertions do not race the initial fetch
    await this.rows.first().waitFor();
  }

  row(shipmentId: string): ShipmentRow {
    return new ShipmentRow(this.page.locator(`tr[data-id="${shipmentId}"]`));
  }

  async filterByStatus(status: string): Promise<void> {
    await this.statusFilter.selectOption(status);
  }

  async search(text: string): Promise<void> {
    await this.searchInput.fill(text);
  }
}
