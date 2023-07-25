import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { RedeemPage } from './redeem.page';
import { DatePipe } from '@angular/common';

const routes: Routes = [
  {
    path: '',
    component: RedeemPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
  providers: [DatePipe],
})
export class RedeemPageRoutingModule {}
