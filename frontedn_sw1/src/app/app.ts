import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PwaUpdateService } from './services/pwa-update.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule],
  template: '<router-outlet></router-outlet>',
  styles: []
})
export class AppComponent {
  private pwaUpdate = inject(PwaUpdateService);
}
