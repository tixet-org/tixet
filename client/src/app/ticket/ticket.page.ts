import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController, ToastController } from '@ionic/angular';
import { ApiService } from '../shared/services/api.service';
import { NftMetadata, NftOutput, RedemptionRequestWithTicketData, RedemptionTokenResponse } from '../shared/models';
import { TanglePayService } from '../shared/services/tangle-pay.service';

@Component({
  selector: 'app-ticket',
  templateUrl: './ticket.page.html',
  styleUrls: ['./ticket.page.scss'],
})
export class TicketPage implements OnInit {
  public ticketIsInWallet = false;
  public checkingRedemption = true;
  public ticketRedemptionDate: Date | undefined;
  public ticket: NftMetadata | undefined;
  public ticketId = this.route.snapshot.paramMap.get('id');

  public isRedeeming = false;
  public redemptionData: RedemptionRequestWithTicketData | undefined;

  constructor(
    private api: ApiService,
    private route: ActivatedRoute,
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private tanglePay: TanglePayService,
  ) { }

  ngOnInit() {
    this.getTicketData();
  }

  public async redeem() {
    if (!this.ticketId || !this.ticket) { return; }
    this.isRedeeming = true;
    this.redemptionData = undefined;

    const address = await this.tanglePay.getCurrentAddress();
    if (!address) {
      this.isRedeeming = false;
      return;
    }
    const publicKey = await this.tanglePay.getPublicKey(address);
    if (!publicKey) {
      this.isRedeeming = false;
      return;
    }

    const eventId = this.ticket.attributes[0].eventId;
    const redemptionRequestData: RedemptionTokenResponse = await this.api.requestTicketRedemptionToken(
      eventId, this.ticketId, { publicKey },
    );

    if (!redemptionRequestData) {
      this.isRedeeming = false;
      return;
    }
    const signedMessage = await this.tanglePay.signData(redemptionRequestData.token);
    if (!signedMessage) { return; }

    this.redemptionData = {
      nftId: this.ticketId,
      eventId: this.ticket.attributes[0].eventId,
      signedMessage,
      publicKey,
    };
  }

  public async copyNftId() {
    if (!this.ticketId) { return; }

    await navigator.clipboard.writeText(this.ticketId);
    const toast = await this.toastCtrl.create({ message: 'Copied nft / ticket id', duration: 3000 });
    await toast.present();
  }

  public async copyEventId() {
    if (!this.ticket?.attributes[0]?.eventId) { return; }

    await navigator.clipboard.writeText(this.ticket.attributes[0].eventId);
    const toast = await this.toastCtrl.create({ message: 'Copied event id', duration: 3000 });
    await toast.present();
  }

  public async copyPublicKey() {
    if (!this.redemptionData?.publicKey) { return; }

    await navigator.clipboard.writeText(this.redemptionData.publicKey);
    const toast = await this.toastCtrl.create({ message: 'Copied public key', duration: 3000 });
    await toast.present();
  }

  public async copySignedMessage() {
    if (!this.redemptionData?.signedMessage) { return; }

    await navigator.clipboard.writeText(this.redemptionData.signedMessage);
    const toast: HTMLIonToastElement = await this.toastCtrl.create({ message: 'Copied signed message', duration: 3000 });
    await toast.present();
  }

  private async getTicketData() {
    if (!this.ticketId) {
      this.navCtrl.navigateRoot('/');
      return;
    }

    await this.getNftOutput(this.ticketId);
    await this.getIsInWallet();

    await this.getRedemptionStatus();
  }

  private async getIsInWallet() {
    const address = await this.tanglePay.getCurrentAddress();
    if (!address) { return; }
    const balance = await this.tanglePay.getBalance(address);
    if (!balance || !balance.collectibles) { return; }
    const { collectibles } = balance;
    this.ticketIsInWallet = !!collectibles.find(c => c.nftId === this.ticketId);
  }

  private async getNftOutput(nftId: string) {
    const output: NftOutput = await this.api.getNftOutputById(nftId);
    if (!output) {
      await this.navCtrl.navigateRoot('/');
      return;
    }

    const { immutableFeatures } = output;
    const metadataFeature = immutableFeatures.find(f => f.type === 2);
    if (!metadataFeature) {
      await this.navCtrl.navigateRoot('/');
      return;
    }
    const { data } = metadataFeature;
    this.ticket = data as NftMetadata;
  }

  private async getRedemptionStatus() {
    if (!this.ticketId || !this.ticket) { return; }

    const eventId = this.ticket.attributes[0].eventId;
    const redeemed: Date | null = await this.api.checkTicketRedemption(eventId, this.ticketId).catch(() => null);
    if (redeemed) {
      this.ticketRedemptionDate = new Date(redeemed);
    }

    this.checkingRedemption = false;
  }
}
