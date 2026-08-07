import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  NgApexchartsModule,
  ApexChart,
  ApexXAxis,
  ApexTheme,
  ApexLegend,
} from 'ng-apexcharts';
import { DashboardService } from '../../services/dashboard.service';
import * as XLSX from 'xlsx';

/* ======================
   INTERFACE
====================== */
interface BonoAgrupado {
  trabajador: string;
  total_bonos: number;
  total_monto: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, NgApexchartsModule],
  templateUrl: './dashboard.html'
})
export class Dashboard {

  /* ======================
     CONTROL
  ====================== */
  view: 'donut' | 'bar' = 'donut';

  zonas: string[] = [];
  anios: number[] = [];
  meses: number[] = [];
  semestres: number[] = [1, 2];

  zonaSeleccionada = 'TODAS';
  anioSeleccionado = 0;
  mesSeleccionado = 0;
  semestreSeleccionado = 0;

  private rawData: Array<{
    trabajador: string;
    total_bonos: number;
    total_monto: number;
    NOMBRE_ZONA: string;
    anio: number;
    mes: number;
    semestre: number;
  }> = [];

  // 👇 DATA QUE SE EXPORTA A EXCEL
  exportData: BonoAgrupado[] = [];

  /* ======================
     DONUT / PIE
  ====================== */
  donutSeries: number[] = [];
  donutLabels: string[] = [];

  donutChart: ApexChart = { type: 'donut', height: 420 };
  pieChart: ApexChart = { type: 'pie', height: 420 };

  /* ======================
     BARRAS
  ====================== */
  barSeries: { name: string; data: number[] }[] = [];
  barChart: ApexChart = { type: 'bar', height: 450 };
  barXAxis: ApexXAxis = { categories: [] };

  /* ======================
     OPCIONES GLOBALES
  ====================== */
  plotOptions = {
    pie: { donut: { size: '70%' } },
    bar: { horizontal: true, borderRadius: 8 }
  };

  legend: ApexLegend = { position: 'bottom' };
  theme: ApexTheme = { mode: 'dark' };
  dataLabels = { enabled: true };

  constructor(private dashboardService: DashboardService) {
    this.dashboardService.getBonosTop().subscribe(data => {
      // 🔹 Agregamos semestre en frontend por si acaso
      this.rawData = data.map(d => ({
        ...d,
        semestre: Math.ceil(d.mes / 6)
      }));

      // 🔹 Inicializamos filtros
      this.zonas = ['TODAS', ...Array.from(new Set(this.rawData.map(d => d.NOMBRE_ZONA)))];
      this.anios = Array.from(new Set(this.rawData.map(d => d.anio)));
      this.meses = Array.from(new Set(this.rawData.map(d => d.mes)));

      this.aplicarFiltro();
    });
  }

  aplicarFiltro(): void {
    let dataFiltrada = this.rawData;

    // 🔹 FILTRO POR ZONA
    if (this.zonaSeleccionada !== 'TODAS') {
      dataFiltrada = dataFiltrada.filter(d => d.NOMBRE_ZONA === this.zonaSeleccionada);
    }

    // 🔹 FILTRO POR AÑO
    if (this.anioSeleccionado) {
      dataFiltrada = dataFiltrada.filter(d => d.anio === Number(this.anioSeleccionado));
    }

    // 🔹 FILTRO POR MES
    if (this.mesSeleccionado) {
      dataFiltrada = dataFiltrada.filter(d => d.mes === Number(this.mesSeleccionado));
    }

    // 🔹 FILTRO POR SEMESTRE
    if (this.semestreSeleccionado) {
      dataFiltrada = dataFiltrada.filter(d => d.semestre === Number(this.semestreSeleccionado));
    }

    // 🔹 AGRUPAR POR TRABAJADOR
    const agrupado: BonoAgrupado[] = Object.values(
      dataFiltrada.reduce<Record<string, BonoAgrupado>>((acc, item) => {
        const nombre = item.trabajador?.trim();
        if (!nombre) return acc;

        const key = nombre.toUpperCase();

        if (!acc[key]) {
          acc[key] = { trabajador: nombre, total_bonos: 0, total_monto: 0 };
        }

        acc[key].total_bonos += item.total_bonos;
        acc[key].total_monto += item.total_monto;
        return acc;
      }, {})
    );

    // 🔹 TOP 10
    const top10 = agrupado.sort((a, b) => b.total_bonos - a.total_bonos).slice(0, 10);

    // 🔹 GUARDAR PARA EXPORTAR
    this.exportData = top10;

    // 🔹 DONUT
    this.donutSeries = top10.map(d => d.total_bonos);
    this.donutLabels = top10.map(d => d.trabajador);

    // 🔹 BARRAS
    this.barSeries = [{ name: 'Bonos Totales', data: top10.map(d => d.total_bonos) }];
    this.barXAxis = { categories: top10.map(d => d.trabajador) };
  }

  exportarExcel(): void {
    if (!this.exportData.length) return;

    const worksheet = XLSX.utils.json_to_sheet(
      this.exportData.map(d => ({
        Trabajador: d.trabajador,
        'Total Bonos': d.total_bonos,
        'Total Monto': d.total_monto
      }))
    );

    const workbook: XLSX.WorkBook = { Sheets: { 'Bonos Top 10': worksheet }, SheetNames: ['Bonos Top 10'] };
    XLSX.writeFile(workbook, 'bonos_top_10.xlsx');
  }

  volverDonut(): void {
    this.view = 'donut';
  }
}
