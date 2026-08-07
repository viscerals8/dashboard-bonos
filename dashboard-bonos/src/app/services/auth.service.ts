import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

interface LoginResponse {
  access_token: string;
  token_type: string;
  nombre_completo: string;
}

const TOKEN_KEY = 'dashboard_token';
const NOMBRE_KEY = 'dashboard_nombre';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = 'http://127.0.0.1:8001/auth';

  constructor(private http: HttpClient) {}

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/login`, { username, password })
      .pipe(tap(res => {
        localStorage.setItem(TOKEN_KEY, res.access_token);
        localStorage.setItem(NOMBRE_KEY, res.nombre_completo);
      }));
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(NOMBRE_KEY);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  getNombreCompleto(): string | null {
    return localStorage.getItem(NOMBRE_KEY);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}
