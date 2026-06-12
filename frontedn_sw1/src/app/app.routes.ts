import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { MainLayoutComponent } from './layout/layout.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { DesignerComponent } from './designer/designer.component';
import { WorklistComponent } from './worklist/worklist.component';
import { TrackingComponent } from './tracking/tracking.component';
import { WorkflowListComponent } from './workflow-list/workflow-list.component';
import { authGuard } from './services/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'workflows', component: WorkflowListComponent },
      { path: 'designer/:id', component: DesignerComponent },
      { path: 'worklist', component: WorklistComponent },
      { path: 'tracking', component: TrackingComponent },
      {
        path: 'politicas',
        loadComponent: () =>
          import('./politica-voz/politica-voz.component').then(
            (m) => m.PoliticaVozComponent
          ),
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: 'login' }
];
