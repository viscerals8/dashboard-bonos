import { Routes } from '@angular/router';
import { Dashboard } from './pages/dashboard/dashboard';
import { Login } from './pages/login/login';
import { Catalogo } from './pages/catalogo/catalogo';
import { EmbudoAprobacion } from './pages/embudo-aprobacion/embudo-aprobacion';
import { PanelGeneral } from './pages/panel-general/panel-general';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'dashboards', component: Catalogo, canActivate: [authGuard] },
  { path: 'dashboard/top-bonos', component: Dashboard, canActivate: [authGuard] },
  { path: 'dashboard/embudo-aprobacion', component: EmbudoAprobacion, canActivate: [authGuard] },
  { path: 'dashboard/panel-general', component: PanelGeneral, canActivate: [authGuard] },
  { path: '', redirectTo: 'dashboards', pathMatch: 'full' },
  { path: '**', redirectTo: 'dashboards' }
];
