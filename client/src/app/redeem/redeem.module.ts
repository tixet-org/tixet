import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { RedeemPageRoutingModule } from './redeem-routing.module';

import { RedeemPage } from './redeem.page';
import { NavTopComponent } from '../shared/components/nav-top/nav-top.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RedeemPageRoutingModule,
    NavTopComponent,
  ],
  declarations: [RedeemPage],
})
export class RedeemPageModule {}
