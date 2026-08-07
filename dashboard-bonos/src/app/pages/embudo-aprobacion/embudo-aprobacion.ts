import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  NgApexchartsModule,
  ApexChart,
  ApexXAxis,
  ApexTheme,
} from 'ng-apexcharts';
import { DashboardService } from '../../services/dashboard.service';

@Component({
  selector: 'app-embudo-aprobacion',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  templateUrl: './embudo-aprobacion.html'
})
export class EmbudoAprobacion {

  totalBonos = 0;

  barSeries: { name: string; data: number[] }[] = [];
  barChart: ApexChart = { type: 'bar', height: 420 };
  barXAxis: ApexXAxis = { categories: [] };
  plotOptions = { bar: { horizontal: false, borderRadius: 8, distributed: true } };
  legend = { show: false };
  theme: ApexTheme = { mode: 'dark' };
  dataLabels = { enabled: true };

  constructor(private dashboardService: DashboardService) {
    this.dashboardService.getEmbudoAprobacion().subscribe(data => {
      const ordenados = [...data].sort((a, b) => a.estado_id - b.estado_id);
      this.totalBonos = ordenados.reduce((acc, d) => acc + d.total_bonos, 0);
      this.barSeries = [{ name: 'Bonos', data: ordenados.map(d => d.total_bonos) }];
      this.barXAxis = { categories: ordenados.map(d => d.estado_nombre) };
    });
  }
}
