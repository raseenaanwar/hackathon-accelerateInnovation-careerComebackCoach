import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-landing',
  imports: [CommonModule],
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
  constructor(private router: Router) { }

  navigateToResume(): void {
    this.router.navigate(['/resume']);
  }
}
