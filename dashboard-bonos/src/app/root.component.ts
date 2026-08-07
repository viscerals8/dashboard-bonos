// src/app/root.component.ts
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavBar } from './components/nav-bar/nav-bar';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavBar],
  template: `<app-nav-bar></app-nav-bar><router-outlet></router-outlet>`
})
export class RootComponent {} // <--- OJO, export aquí es obligatorio
