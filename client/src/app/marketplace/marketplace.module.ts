import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MarketplacePage } from './marketplace.page';

import { MarketplacePageRoutingModule } from './marketplace-routing.module';
import { NavTopComponent } from '../shared/components/nav-top/nav-top.component';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    MarketplacePageRoutingModule,
    NavTopComponent,
  ],
  declarations: [MarketplacePage],
})
export class MarketplacePageModule {}
