import { Component, OnInit } from '@angular/core';
import { TanglePayService } from '../shared/services/tangle-pay.service';
import { isTicketNftMetadata } from '../shared/utils';
import { EventNft, NftMetadata } from '../shared/models';
import { ApiService } from '../shared/services/api.service';

@Component({
  selector: 'app-profile',
  templateUrl: 'profile.page.html',
  styleUrls: ['profile.page.scss'],
})
export class ProfilePage implements OnInit {
  public walletTickets: NftMetadata[] = [];
  public marketplaceTickets: EventNft[] = [];
  segment: 'marketplace' | 'wallet' = 'wallet';

  constructor(
    private api: ApiService,
    private tanglePay: TanglePayService,
  ) {}

  ngOnInit() {
    this.getTickets();
  }

  private async getTickets() {
    const address = await this.tanglePay.getCurrentAddress();
    if (!address) { return; }

    await Promise.all([
      this.getWalletTickets(address),
      this.getMarketplaceTickets(address),
    ]);
  }

  private async getWalletTickets(address: string) {
    const balance = await this.tanglePay.getBalance(address);
    if (!balance || !balance.collectibles) { return; }
    const { collectibles } = balance;
    collectibles.forEach((ticket: NftMetadata) => {
      if (isTicketNftMetadata(ticket)) {
        this.walletTickets.push(ticket);
      }
    });
  }

  private async getMarketplaceTickets(address: string) {
    this.marketplaceTickets = await this.api.getEventsByIssuerAddress(address);
  }
}
