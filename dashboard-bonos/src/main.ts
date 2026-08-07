import { bootstrapApplication } from '@angular/platform-browser';
import { RootComponent } from './app/root.component'; // asegúrate de que la ruta sea correcta
import { appConfig } from './app/app.config';

bootstrapApplication(RootComponent, appConfig)
  .catch(err => console.error(err));
