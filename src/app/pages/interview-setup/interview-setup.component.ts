import { Component, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { StorageService } from '@core/services/storage.service';

@Component({
    selector: 'app-interview-setup',
    imports: [],
    templateUrl: './interview-setup.component.html',
    styles: [`
    :host {
      display: block;
    }
  `]
})
export class InterviewSetupComponent {
    selectedMode = signal<'voice' | 'text' | null>(null);

    private router = inject(Router);
    private storageService = inject(StorageService);

    selectMode(mode: 'voice' | 'text'): void {
        this.selectedMode.set(mode);
    }

    startInterview(): void {
        const mode = this.selectedMode();
        if (!mode) return;

        this.storageService.updateSession({
            interviewMode: mode
        });
        this.storageService.startSession('interview');

        // Navigate based on mode
        if (mode === 'voice') {
            this.router.navigate(['/interview/voice']);
        } else {
            this.router.navigate(['/interview/text']);
        }
    }
}
