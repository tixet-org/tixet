import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CreatePage } from './create.page';

import { CreatePageRoutingModule } from './create-routing.module';
import { NavTopComponent } from '../shared/components/nav-top/nav-top.component';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    CreatePageRoutingModule,
    NavTopComponent,
  ],
  declarations: [CreatePage],
})
export class CreatePageModule {}
