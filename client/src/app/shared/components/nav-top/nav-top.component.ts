import { Component, OnDestroy, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { takeWhile } from 'rxjs';
import { TanglePayService } from '../../services/tangle-pay.service';

@Component({
  selector: 'app-nav-top',
  standalone: true,
  templateUrl: './nav-top.component.html',
  styleUrls: ['./nav-top.component.scss'],
  imports: [
    CommonModule,
    IonicModule,
    RouterLink,
  ],
})
export class NavTopComponent implements OnInit, OnDestroy {
  public selectedPath = '';

  public readonly menuButtons = [
    {
      title: 'Marketplace',
      url: ['/marketplace'],
      icon: 'storefront-outline',
    },
    {
      title: 'Create',
      url: ['/create'],
      icon: 'add-circle-outline',
    },
  ];

  private destroyed = false;

  constructor(
    public tanglePayService: TanglePayService,
    private router: Router,
  ) {
  }

  ngOnInit() {
    this.router.events.pipe(takeWhile(() => !this.destroyed)).subscribe(() => {
      this.selectedPath = this.router.url;
    });
  }

  ngOnDestroy() {
    this.destroyed = true;
  }

  public async connectWallet() {
    await this.tanglePayService.connectWallet();
  }

}
