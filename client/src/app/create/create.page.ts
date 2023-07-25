import { Component } from '@angular/core';
import { NgForm } from '@angular/forms';
import { TicketCreationRequest, TicketCreationResponse } from '../shared/models';
import { ApiService } from '../shared/services/api.service';
import { TanglePayService } from '../shared/services/tangle-pay.service';
import { AlertController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-create',
  templateUrl: 'create.page.html',
  styleUrls: ['create.page.scss'],
})
export class CreatePage {

  constructor(
    private api: ApiService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private tanglePay: TanglePayService,
  ) {}

  async onSubmit(ticketForm: NgForm) {
    const ticket: TicketCreationRequest = ticketForm.value;
    console.log(ticket);
    const address = await this.tanglePay.getCurrentAddress();
    if (!address) { return; }

    ticket.issuerAddress = address;
    ticket.ticketPrice = ticket.ticketPrice * 1000000;

    const response: TicketCreationResponse = await this.api.createTickets(ticket);
    console.log(response);
    const transactionPrice = response.minimumStorageDeposit / 1000000;

    const alert = await this.alertCtrl.create({
      header: 'Please complete the transaction',
      message: `The minimum storage deposit is ${transactionPrice} IOTA / SMR.`,
      buttons: ['OK'],
    });
    await alert.present();

    await this.tanglePay.sendValue(response.creationRequestAddress, transactionPrice);

    await alert.dismiss();
  }
}
