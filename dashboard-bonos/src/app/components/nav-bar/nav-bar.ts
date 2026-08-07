import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-nav-bar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './nav-bar.html',
})
export class NavBar {
  visible = false;
  nombre = '';

  constructor(private router: Router, private auth: AuthService) {
    this.actualizar();
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.actualizar());
  }

  private actualizar(): void {
    this.visible = this.auth.isAuthenticated() && !this.router.url.startsWith('/login');
    this.nombre = this.auth.getNombreCompleto() ?? '';
  }

  cerrarSesion(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
