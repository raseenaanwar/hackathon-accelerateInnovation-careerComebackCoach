import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Roadmap } from '@core/services/gemini.service';
import { StorageService } from '@core/services/storage.service';
import { PdfService } from '@core/services/pdf.service';

@Component({
    selector: 'app-roadmap',
    imports: [CommonModule],
    templateUrl: './roadmap.component.html',
    styles: [`
    :host {
      display: block;
    }
  `]
})
export class RoadmapComponent implements OnInit {
    roadmap = signal<Roadmap | null>(null);
    selectedWeek = signal<number>(1);
    expandedItem = signal<{ title: string, content: string[] } | null>(null);
    today = new Date();
    // Signal to track download state
    downloadStatus = signal<'idle' | 'loading' | 'success' | 'error'>('idle');

    constructor(
        private router: Router,
        private storageService: StorageService,
        private pdfService: PdfService
    ) { }

    ngOnInit(): void {
        const sessionData = this.storageService.sessionState();
        const roadmap = sessionData.roadmapData;

        if (!roadmap) {
            // No roadmap data, redirect back
            this.router.navigate(['/resume']);
            return;
        }

        this.roadmap.set(roadmap);
    }

    selectWeek(weekNumber: number): void {
        this.selectedWeek.set(weekNumber);
    }

    openModal(title: string, content: string[]): void {
        this.expandedItem.set({ title, content });
    }

    closeModal(): void {
        this.expandedItem.set(null);
    }

    async downloadPDF(): Promise<void> {
        const roadmap = this.roadmap();
        if (roadmap && this.downloadStatus() === 'idle') {
            this.downloadStatus.set('loading');

            try {
                // Create a filename from the goal (first few words)
                const cleanGoal = roadmap.overallGoal
                    .replace(/[^a-z0-9]/gi, '_') // Replace non-alphanumeric with underscore
                    .split('_')
                    .filter(w => w.length > 0)
                    .slice(0, 5) // Take first 5 words
                    .join('_');

                const filename = `Career_Roadmap_${cleanGoal || 'Plan'}`;

                // Min delay for UX so the spinner is visible
                const minDelay = new Promise(resolve => setTimeout(resolve, 800));

                await Promise.all([
                    this.pdfService.generateRoadmapPDF(roadmap, filename),
                    minDelay
                ]);

                this.downloadStatus.set('success');

                // Reset to idle after 3 seconds
                setTimeout(() => {
                    this.downloadStatus.set('idle');
                }, 3000);

            } catch (error) {
                console.error('PDF Download failed', error);
                this.downloadStatus.set('error');

                // Reset to idle after 3 seconds
                setTimeout(() => {
                    this.downloadStatus.set('idle');
                }, 3000);
            }
        }
    }

    startInterview(): void {
        this.router.navigate(['/interview/setup']);
    }
}
