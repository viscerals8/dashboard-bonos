import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getDashboards(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/dashboards`);
  }

  getBonosTop(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/dashboard/bonos-top`);
  }

  getEmbudoAprobacion(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/dashboard/embudo-aprobacion`);
  }

  getMontoMensual(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/dashboard/monto-mensual`);
  }

  getPorZona(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/dashboard/por-zona`);
  }

  getPorEmpresa(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/dashboard/por-empresa`);
  }

  getPorConcepto(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/dashboard/por-concepto`);
  }

  getSuperbono(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/dashboard/superbono`);
  }

  getTiempoAprobacion(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/dashboard/tiempo-aprobacion`);
  }

  getMotivosRechazo(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/dashboard/motivos-rechazo`);
  }

  getFirmaTalana(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/dashboard/firma-talana`);
  }

  getRankingValidadores(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/dashboard/ranking-validadores`);
  }

  getMiPerfil(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/dashboard/mi-perfil`);
  }

  getMisBonosSolicitados(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/dashboard/mis-bonos-solicitados`);
  }

  getMisValidaciones(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/dashboard/mis-validaciones`);
  }

  getMiRanking(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/dashboard/mi-ranking`);
  }

  getMiEvolucion(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/dashboard/mi-evolucion`);
  }

  getMisRechazos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/dashboard/mis-rechazos`);
  }

  getMiTiempoAprobacion(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/dashboard/mi-tiempo-aprobacion`);
  }
}
