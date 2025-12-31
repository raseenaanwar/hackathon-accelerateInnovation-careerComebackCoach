import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { StorageService } from '../../core/services/storage.service';

@Component({
  selector: 'app-interview-restore',
  imports: [CommonModule],
  template: `
    <div class="flex-grow flex flex-col justify-center px-4 sm:px-6 lg:px-8 pt-24 pb-8">
      <div class="max-w-2xl mx-auto text-center w-full animate-slide-up">
        <!-- Header -->
        <h1 class="text-3xl sm:text-4xl font-bold mb-4">
          Resume Your <span class="text-gradient">Journey</span>
        </h1>
        <p class="text-base sm:text-lg text-[hsl(var(--color-text-secondary))] mb-8 max-w-lg mx-auto leading-relaxed">
          Upload your previously generated <strong>Employment Roadmap PDF</strong> to jump straight into interview practice.
        </p>

        <!-- Upload Box -->
        <div 
          class="glassmorphism rounded-3xl p-6 sm:p-10 shadow-xl max-w-xl mx-auto w-full">
            <div 
                class="border-2 border-dashed border-[hsl(var(--color-border))] rounded-2xl p-8 transition-all duration-[var(--duration-base)] hover:border-[hsl(var(--color-primary))] hover:bg-black/5 dark:hover:bg-white/5 group cursor-pointer relative flex flex-col justify-center h-80 sm:h-auto sm:min-h-[16rem]">
                
                <input type="file" id="roadmap-upload" name="roadmapFile" aria-label="Upload Roadmap PDF" (change)="onFileSelected($event)" accept=".pdf" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                
                <div class="flex flex-col items-center pointer-events-none">
                    <div class="w-16 h-16 sm:w-20 sm:h-20 mb-4 sm:mb-6 rounded-full bg-white/50 dark:bg-black/20 border border-[hsl(var(--color-border))] flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-[var(--duration-base)]">
                        <span class="text-3xl sm:text-4xl">📄</span>
                    </div>
                    <h3 class="text-lg sm:text-xl font-bold mb-2 text-[hsl(var(--color-text-primary))]">Upload Roadmap PDF</h3>
                    <p class="text-sm text-[hsl(var(--color-text-muted))]">Drag & drop or Click to browse</p>
                </div>
            </div>

            <!-- Error Message -->
            <div *ngIf="errorMessage()" class="mt-6 text-[hsl(var(--color-error))] text-sm bg-[hsl(var(--color-error))/0.1] py-2 px-4 rounded-lg inline-block">
                {{ errorMessage() }}
            </div>
            
            <!-- Loading State -->
            <div *ngIf="isProcessing()" class="mt-8 flex items-center justify-center gap-3 text-[hsl(var(--color-primary))]">
                <svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span class="font-medium">Restoring Session...</span>
            </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class InterviewRestoreComponent {
  isProcessing = signal(false);
  errorMessage = signal('');

  constructor(
    private router: Router,
    private storageService: StorageService
  ) { }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    if (file.type !== 'application/pdf') {
      this.errorMessage.set('Please upload a valid PDF file.');
      return;
    }

    this.processFile(file);
  }

  processFile(file: File) {
    this.isProcessing.set(true);
    this.errorMessage.set('');

    // Simulate processing delay and restoring session
    // In a real app, this would send the PDF to backend to parse/extract roadmap data
    setTimeout(() => {
      // Mock successful restoration
      // We'll set a flag in storage so the app knows we have context
      this.storageService.updateSession({
        hasActiveSession: true,
        roadmapData: { restoredFrom: file.name, timestamp: new Date().toISOString() }, // Minimal context
        currentStep: 'interview'
      });

      this.router.navigate(['/interview/setup']);
      this.isProcessing.set(false);
    }, 1500);
  }
}
