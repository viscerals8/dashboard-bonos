import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashboardService } from '../../services/dashboard.service';

const ICONOS: Record<string, string> = {
  trophy: '🏆',
  funnel: '🔻'
};

@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './catalogo.html'
})
export class Catalogo {

  dashboards: any[] = [];

  constructor(private dashboardService: DashboardService) {
    this.dashboardService.getDashboards().subscribe(data => {
      this.dashboards = data;
    });
  }

  emoji(icono: string): string {
    return ICONOS[icono] ?? '📊';
  }
}
