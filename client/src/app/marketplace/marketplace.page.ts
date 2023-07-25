import { Component, OnInit } from '@angular/core';
import { ApiService } from '../shared/services/api.service';
import { EventNft } from '../shared/models';

@Component({
  selector: 'app-marketplace',
  templateUrl: 'marketplace.page.html',
  styleUrls: ['marketplace.page.scss'],
})
export class MarketplacePage implements OnInit {
  public marketplaceTickets: EventNft[] = [];

  constructor(
    private api: ApiService,
  ) {}

  ngOnInit() {
    this.getMarketplaceTickets();
  }

  private async getMarketplaceTickets() {
    const events = await this.api.getAllEvents();
    if (!events) { return; }
    this.marketplaceTickets = events;
  }

}
