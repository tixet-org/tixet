import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../shared/services/api.service';
import { BuyTicketRequest, BuyTicketResponse, EventNft } from '../shared/models';
import { AlertController, NavController, ToastController } from '@ionic/angular';
import { TanglePayService } from '../shared/services/tangle-pay.service';

@Component({
  selector: 'app-event',
  templateUrl: './event.page.html',
  styleUrls: ['./event.page.scss'],
})
export class EventPage implements OnInit {
  public event: EventNft | undefined;
  private eventId = this.route.snapshot.paramMap.get('id');

  constructor(
    private api: ApiService,
    private route: ActivatedRoute,
    private navCtrl: NavController,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private tanglePay: TanglePayService,
  ) {
  }

  ngOnInit() {
    this.getEvent();
  }

  public async buyTicket() {
    if (!this.event || !this.eventId) { return; }

    if (this.event?.nfts.length === 2) {
      const toast = await this.toastCtrl.create({ message: 'No tickets available', duration: 2000 });
      await toast.present();
      return;
    }

    const address = await this.tanglePay.getCurrentAddress();
    if (!address) { return; }

    const buyTicketRequest: BuyTicketRequest = {
      ticketAmount: 1,
      buyerAddress: address,
    };

    const response: BuyTicketResponse = await this.api.buyTicket(this.eventId, buyTicketRequest);
    if (!response) { return; }

    console.log(response);

    const totalPrice = response.totalPrice / 1000000;

    const alert = await this.alertCtrl.create({
      header: 'Please complete the transaction',
      message: `Total price is ${totalPrice} IOTA / SMR.`,
      buttons: ['OK'],
    });
    await alert.present();

    await this.tanglePay.sendValue(response.buyRequestAddress, totalPrice);
    await alert.dismiss();

    await this.getEvent();
  }

  private async getEvent() {
    if (!this.eventId) {
      await this.navCtrl.navigateRoot('/');
      return;
    }
    this.event = await this.api.getEventById(this.eventId);
    console.log(this.event);
    if (!this.event) {
      await this.navCtrl.navigateRoot('/');
    }
  }
}
