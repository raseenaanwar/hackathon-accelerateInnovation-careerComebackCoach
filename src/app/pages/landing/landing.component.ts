import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-landing',
  imports: [],
  templateUrl: './landing.component.html',
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      flex-grow: 1;
    }
  `]
})
export class LandingComponent {
  private router = inject(Router);

  navigateToResume(): void {
    this.router.navigate(['/resume']);
  }
}
