import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  NgApexchartsModule,
  ApexChart,
  ApexXAxis,
  ApexTheme,
  ApexLegend,
  ApexDataLabels,
  ApexPlotOptions,
  ApexStroke,
  ApexFill,
  ApexTooltip,
} from 'ng-apexcharts';

export type ChartKind = 'bar' | 'line' | 'area' | 'donut' | 'pie';
export type ValueFormat = 'money' | 'number' | 'days';

// Paleta categorica validada (dataviz skill) para superficie oscura #0f172a
export const KPI_PALETTE = [
  '#3987e5', '#d95926', '#199e70', '#c98500',
  '#d55181', '#008300', '#9085e9', '#e66767',
];

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  templateUrl: './kpi-card.html',
})
export class KpiCard implements OnChanges {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() categories: string[] = [];

  @Input() series: number[] = [];
  @Input() seriesName = 'Total';
  @Input() valueFormat: ValueFormat = 'number';

  @Input() secondarySeries: number[] | null = null;
  @Input() secondarySeriesName = 'Cantidad';
  @Input() secondaryValueFormat: ValueFormat = 'number';

  @Input() types: ChartKind[] = ['bar', 'line', 'donut', 'pie'];
  @Input() defaultType: ChartKind | null = null;

  // Cuando se setea, la barra en ese indice se pinta destacada (ej. "tu" en un ranking)
  @Input() highlightIndex: number | null = null;
  @Input() highlightColor = '#22d3ee';
  @Input() mutedColor = '#475569';

  currentType: ChartKind = 'bar';
  activeMetric: 'primary' | 'secondary' = 'primary';

  chart: ApexChart = { type: 'bar', height: 360, toolbar: { show: false } };
  xaxis: ApexXAxis = { categories: [] };
  legend: ApexLegend = { show: false, position: 'bottom' };
  theme: ApexTheme = { mode: 'dark' };
  dataLabels: ApexDataLabels = { enabled: true };
  plotOptions: ApexPlotOptions = {
    bar: { horizontal: false, borderRadius: 6, distributed: false },
    pie: { donut: { size: '65%' } },
  };
  stroke: ApexStroke = { curve: 'smooth', width: 2 };
  fill: ApexFill = { opacity: 1 };
  tooltip: ApexTooltip = {};
  colors: string[] = KPI_PALETTE;
  chartSeries: any = [];

  private currentTypeInitialized = false;

  ngOnChanges(): void {
    if (!this.currentTypeInitialized) {
      this.currentType = this.defaultType ?? this.types[0] ?? 'bar';
      this.currentTypeInitialized = true;
    }
    this.rebuild();
  }

  setType(type: ChartKind): void {
    this.currentType = type;
    this.rebuild();
  }

  setMetric(metric: 'primary' | 'secondary'): void {
    this.activeMetric = metric;
    this.rebuild();
  }

  formatValue(v: number, fmt: ValueFormat = this.valueFormat): string {
    if (v === null || v === undefined || isNaN(v)) return '-';
    if (fmt === 'money') return '$' + Math.round(v).toLocaleString('es-CL');
    if (fmt === 'days') return v.toFixed(1) + ' días';
    return Math.round(v).toLocaleString('es-CL');
  }

  private isCategorical(type: ChartKind): boolean {
    return type === 'bar' || type === 'line' || type === 'area';
  }

  private rebuild(): void {
    const type = this.currentType;
    const usingSecondary = this.activeMetric === 'secondary' && this.secondarySeries;
    const data = usingSecondary ? (this.secondarySeries as number[]) : this.series;
    const name = usingSecondary ? this.secondarySeriesName : this.seriesName;
    const fmt = usingSecondary ? this.secondaryValueFormat : this.valueFormat;
    const hasHighlight = this.highlightIndex !== null && type === 'bar';
    const isDistributed = hasHighlight || (this.isCategorical(type) && (this.types.includes('donut') || this.types.includes('pie')));

    this.chart = { type, height: 360, toolbar: { show: false } };
    this.legend = { show: !this.isCategorical(type), position: 'bottom' };
    this.plotOptions = {
      bar: { horizontal: false, borderRadius: 6, distributed: isDistributed },
      pie: { donut: { size: '65%' } },
    };
    this.dataLabels = { enabled: true };
    this.tooltip = { y: { formatter: (v: number) => this.formatValue(v, fmt) } };

    if (hasHighlight) {
      this.colors = this.categories.map((_, i) => i === this.highlightIndex ? this.highlightColor : this.mutedColor);
    } else {
      this.colors = KPI_PALETTE;
    }

    if (this.isCategorical(type)) {
      this.xaxis = { categories: this.categories };
      this.chartSeries = [{ name, data }];
    } else {
      this.xaxis = { categories: [] };
      this.chartSeries = data;
    }
  }

  get pieLabels(): string[] {
    return this.categories;
  }
}
