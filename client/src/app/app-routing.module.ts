import { NgModule } from '@angular/core';
import { PreloadAllModules, Route, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./tabs/tabs.module').then(m => m.TabsPageModule),
  },
  {
    path: 'event/:id',
    loadChildren: () => import('./event/event.module').then( m => m.EventPageModule),
  },
  {
    path: 'ticket/:id',
    loadChildren: () => import('./ticket/ticket.module').then( m => m.TicketPageModule),
  },
  {
    path: 'redeem',
    loadChildren: () => import('./redeem/redeem.module').then( m => m.RedeemPageModule),
  },
];

const notFoundRoute: Route = { path: '**', redirectTo: '' };

@NgModule({
  imports: [
    RouterModule.forRoot([...routes, notFoundRoute], { preloadingStrategy: PreloadAllModules }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
