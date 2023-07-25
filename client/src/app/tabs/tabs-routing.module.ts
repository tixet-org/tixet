import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

const routes: Routes = [
  {
    path: '',
    component: TabsPage,
    children: [
      {
        path: 'marketplace',
        loadChildren: () => import('../marketplace/marketplace.module').then(m => m.MarketplacePageModule),
      },
      {
        path: 'create',
        loadChildren: () => import('../create/create.module').then(m => m.CreatePageModule),
      },
      {
        path: 'profile',
        loadChildren: () => import('../profile/profile.module').then(m => m.ProfilePageModule),
      },
      {
        path: '',
        redirectTo: '/marketplace',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '',
    redirectTo: '/marketplace',
    pathMatch: 'full',
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
})
export class TabsPageRoutingModule {}
