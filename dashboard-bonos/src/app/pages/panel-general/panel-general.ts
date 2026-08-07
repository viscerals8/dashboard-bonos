import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService } from '../../services/dashboard.service';
import { KpiCard, ChartKind } from '../../components/kpi-card/kpi-card';
import { Dashboard } from '../dashboard/dashboard';
import { EmbudoAprobacion } from '../embudo-aprobacion/embudo-aprobacion';

const MES_NOMBRES = [
  '', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

interface Ventana {
  id: string;
  nombre: string;
  icono: string;
}

const VENTANAS_GENERAL: Ventana[] = [
  { id: 'top-bonos', nombre: 'Top 10 Bonos', icono: '🏆' },
  { id: 'embudo', nombre: 'Embudo de Aprobación', icono: '🔻' },
  { id: 'evolucion', nombre: 'Evolución Mensual', icono: '📅' },
  { id: 'zona', nombre: 'Por Zona', icono: '🗺️' },
  { id: 'empresa', nombre: 'Por Empresa', icono: '🏢' },
  { id: 'concepto', nombre: 'Por Concepto', icono: '🏷️' },
  { id: 'superbono', nombre: 'Superbono vs Normal', icono: '⭐' },
  { id: 'tiempo', nombre: 'Tiempo de Aprobación', icono: '⏱️' },
  { id: 'rechazo', nombre: 'Motivos de Rechazo', icono: '🚫' },
  { id: 'talana', nombre: 'Firma Talana', icono: '✍️' },
  { id: 'validadores', nombre: 'Ranking Validadores', icono: '✅' },
];

const VENTANAS_PERSONAL: Ventana[] = [
  { id: 'mi-perfil', nombre: 'Mi Perfil', icono: '🪪' },
  { id: 'mis-solicitados', nombre: 'Mis Bonos Solicitados', icono: '📨' },
  { id: 'mis-validaciones', nombre: 'Mis Validaciones', icono: '🖊️' },
  { id: 'mi-ranking', nombre: 'Mi Ranking', icono: '🥇' },
  { id: 'mi-evolucion', nombre: 'Mi Evolución Mensual', icono: '📈' },
  { id: 'mis-rechazos', nombre: 'Mis Motivos de Rechazo', icono: '🚫' },
  { id: 'mi-tiempo', nombre: 'Mi Tiempo de Aprobación', icono: '⏱️' },
];

function foldTopN(
  rows: any[],
  labelKey: string,
  valueKey: string,
  n: number
): { labels: string[]; values: number[] } {
  const ordered = [...rows].sort((a, b) => (b[valueKey] ?? 0) - (a[valueKey] ?? 0));
  const top = ordered.slice(0, n);
  const rest = ordered.slice(n);
  const labels = top.map(r => String(r[labelKey]));
  const values = top.map(r => r[valueKey] ?? 0);
  if (rest.length) {
    labels.push('Otros');
    values.push(rest.reduce((acc, r) => acc + (r[valueKey] ?? 0), 0));
  }
  return { labels, values };
}

@Component({
  selector: 'app-panel-general',
  standalone: true,
  imports: [CommonModule, KpiCard, Dashboard, EmbudoAprobacion],
  templateUrl: './panel-general.html',
})
export class PanelGeneral implements OnInit {

  grupos: { id: 'general' | 'personal'; nombre: string }[] = [
    { id: 'general', nombre: 'General' },
    { id: 'personal', nombre: 'Mi Info' },
  ];
  grupoActivo: 'general' | 'personal' = 'general';
  ventanasGeneral = VENTANAS_GENERAL;
  ventanasPersonal = VENTANAS_PERSONAL;
  activa = VENTANAS_GENERAL[0].id;

  get ventanas(): Ventana[] {
    return this.grupoActivo === 'general' ? this.ventanasGeneral : this.ventanasPersonal;
  }

  // Mi perfil
  miPerfil: any = null;

  // Mis bonos solicitados
  misSolicitadosCategorias: string[] = [];
  misSolicitadosMonto: number[] = [];
  misSolicitadosCantidad: number[] = [];

  // Mis validaciones
  misValidacionesCategorias: string[] = [];
  misValidacionesTotales: number[] = [];

  // Mi ranking
  miRankingCategorias: string[] = [];
  miRankingMonto: number[] = [];
  miRankingHighlight: number | null = null;

  // Mi evolucion
  miEvolucionCategorias: string[] = [];
  miEvolucionMonto: number[] = [];
  miEvolucionCantidad: number[] = [];

  // Mis rechazos
  misRechazosCategorias: string[] = [];
  misRechazosTotales: number[] = [];

  // Mi tiempo de aprobacion
  miTiempoCategorias: string[] = [];
  miTiempoPromedio: number[] = [];

  // Evolucion mensual
  evoCategorias: string[] = [];
  evoMonto: number[] = [];
  evoCantidad: number[] = [];

  // Por zona
  zonaCategorias: string[] = [];
  zonaMonto: number[] = [];
  zonaCantidad: number[] = [];

  // Por empresa
  empresaCategorias: string[] = [];
  empresaMonto: number[] = [];
  empresaCantidad: number[] = [];

  // Por concepto
  conceptoCategorias: string[] = [];
  conceptoMonto: number[] = [];
  conceptoCantidad: number[] = [];

  // Superbono
  superbonoCategorias: string[] = [];
  superbonoMonto: number[] = [];
  superbonoCantidad: number[] = [];

  // Tiempo de aprobacion
  tiempoCategorias: string[] = [];
  tiempoPromedio: number[] = [];

  // Motivos de rechazo
  rechazoCategorias: string[] = [];
  rechazoTotales: number[] = [];

  // Firma talana
  talanaCategorias: string[] = [];
  talanaTotales: number[] = [];

  // Ranking validadores
  validadoresCategorias: string[] = [];
  validadoresTotales: number[] = [];

  categoricalTypes: ChartKind[] = ['bar', 'line', 'area'];
  proportionTypes: ChartKind[] = ['bar', 'donut', 'pie'];

  constructor(private dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.dashboardService.getMontoMensual().subscribe(data => {
      this.evoCategorias = data.map(d => `${MES_NOMBRES[d.mes]} ${d.anio}`);
      this.evoMonto = data.map(d => d.total_monto ?? 0);
      this.evoCantidad = data.map(d => d.total_bonos ?? 0);
    });

    this.dashboardService.getPorZona().subscribe(data => {
      this.zonaCategorias = data.map(d => d.NOMBRE_ZONA);
      this.zonaMonto = data.map(d => d.total_monto ?? 0);
      this.zonaCantidad = data.map(d => d.total_bonos ?? 0);
    });

    this.dashboardService.getPorEmpresa().subscribe(data => {
      this.empresaCategorias = data.map(d => d.NOMBRE_EMPRESA);
      this.empresaMonto = data.map(d => d.total_monto ?? 0);
      this.empresaCantidad = data.map(d => d.total_bonos ?? 0);
    });

    this.dashboardService.getPorConcepto().subscribe(data => {
      const monto = foldTopN(data, 'concepto', 'total_monto', 7);
      const cantidad = foldTopN(data, 'concepto', 'total_bonos', 7);
      this.conceptoCategorias = monto.labels;
      this.conceptoMonto = monto.values;
      this.conceptoCantidad = cantidad.values;
    });

    this.dashboardService.getSuperbono().subscribe(data => {
      this.superbonoCategorias = data.map(d => d.tipo);
      this.superbonoMonto = data.map(d => d.total_monto ?? 0);
      this.superbonoCantidad = data.map(d => d.total_bonos ?? 0);
    });

    this.dashboardService.getTiempoAprobacion().subscribe(data => {
      this.tiempoCategorias = data.map(d => `${MES_NOMBRES[d.mes]} ${d.anio}`);
      this.tiempoPromedio = data.map(d => Math.round((d.promedio_dias ?? 0) * 10) / 10);
    });

    this.dashboardService.getMotivosRechazo().subscribe(data => {
      const folded = foldTopN(data, 'motivo', 'total_bonos', 7);
      this.rechazoCategorias = folded.labels;
      this.rechazoTotales = folded.values;
    });

    this.dashboardService.getFirmaTalana().subscribe(data => {
      this.talanaCategorias = data.map(d => d.estado_firma);
      this.talanaTotales = data.map(d => d.total_bonos ?? 0);
    });

    this.dashboardService.getRankingValidadores().subscribe(data => {
      const folded = foldTopN(data, 'validador', 'total_validaciones', 8);
      this.validadoresCategorias = folded.labels;
      this.validadoresTotales = folded.values;
    });

    this.dashboardService.getMiPerfil().subscribe(data => {
      this.miPerfil = data;
    });

    this.dashboardService.getMisBonosSolicitados().subscribe(data => {
      this.misSolicitadosCategorias = data.map(d => d.estado_nombre);
      this.misSolicitadosMonto = data.map(d => d.total_monto ?? 0);
      this.misSolicitadosCantidad = data.map(d => d.total_bonos ?? 0);
    });

    this.dashboardService.getMisValidaciones().subscribe(data => {
      this.misValidacionesCategorias = data.map(d => d.estado_nombre);
      this.misValidacionesTotales = data.map(d => d.total_bonos ?? 0);
    });

    this.dashboardService.getMiRanking().subscribe(data => {
      this.miRankingCategorias = data.map(d => d.trabajador);
      this.miRankingMonto = data.map(d => d.total_monto ?? 0);
      const idx = data.findIndex(d => d.es_actual === 1);
      this.miRankingHighlight = idx >= 0 ? idx : null;
    });

    this.dashboardService.getMiEvolucion().subscribe(data => {
      this.miEvolucionCategorias = data.map(d => `${MES_NOMBRES[d.mes]} ${d.anio}`);
      this.miEvolucionMonto = data.map(d => d.total_monto ?? 0);
      this.miEvolucionCantidad = data.map(d => d.total_bonos ?? 0);
    });

    this.dashboardService.getMisRechazos().subscribe(data => {
      const folded = foldTopN(data, 'motivo', 'total_bonos', 7);
      this.misRechazosCategorias = folded.labels;
      this.misRechazosTotales = folded.values;
    });

    this.dashboardService.getMiTiempoAprobacion().subscribe(data => {
      this.miTiempoCategorias = data.map(d => `${MES_NOMBRES[d.mes]} ${d.anio}`);
      this.miTiempoPromedio = data.map(d => Math.round((d.promedio_dias ?? 0) * 10) / 10);
    });

    setTimeout(() => window.dispatchEvent(new Event('resize')), 200);
  }

  seleccionarGrupo(id: 'general' | 'personal'): void {
    this.grupoActivo = id;
    this.activa = this.ventanas[0].id;
    setTimeout(() => window.dispatchEvent(new Event('resize')), 60);
  }

  seleccionar(id: string): void {
    this.activa = id;
    // ApexCharts a veces mide el contenedor antes de que el layout de la
    // pestaña termine de estabilizarse y queda con tamaño 0. Forzamos un
    // resize luego del render para que recalcule las dimensiones reales.
    setTimeout(() => window.dispatchEvent(new Event('resize')), 60);
  }
}
