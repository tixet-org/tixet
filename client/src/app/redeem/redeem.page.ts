import { Component } from '@angular/core';
import { ApiService } from '../shared/services/api.service';
import { NgForm } from '@angular/forms';
import { RedemptionRequestWithTicketData } from '../shared/models';
import { HttpErrorResponse } from '@angular/common/http';
import { ToastController } from '@ionic/angular';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-redeem',
  templateUrl: './redeem.page.html',
  styleUrls: ['./redeem.page.scss'],
})
export class RedeemPage {
  public isRedeeming = false;
  public redemptionRes: Date | void | undefined;

  constructor(
    private api: ApiService,
    private datePipe: DatePipe,
    private toastCtrl: ToastController,
  ) { }

  async scan() {
  }

  async onSubmit(redeemForm: NgForm) {
    this.isRedeeming = true;
    this.redemptionRes = undefined;
    const redemptionRequest: RedemptionRequestWithTicketData = redeemForm.value;

    let message = 'Ticket successfully redeemed';
    this.redemptionRes = await this.api.redeemTicket(
      redemptionRequest.eventId, redemptionRequest.nftId, {
        signedMessage: redemptionRequest.signedMessage,
        publicKey: redemptionRequest.publicKey,
      },
    ).catch(async (e: HttpErrorResponse) => message = e.error.message);

    if (this.redemptionRes) {
      message += ' at ' + this.datePipe.transform(this.redemptionRes, 'medium');
      redeemForm.resetForm();
    }

    const toast = await this.toastCtrl.create(
      { message, duration: 3000, color: message.includes('success') ? 'success' : 'danger' },
    );
    await toast.present();

    this.isRedeeming = false;
  }
}
