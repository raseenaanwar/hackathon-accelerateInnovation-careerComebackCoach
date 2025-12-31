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

    downloadPDF(): void {
        const roadmap = this.roadmap();
        if (roadmap) {
            this.pdfService.generateRoadmapPDF(roadmap);
        }
    }

    startInterview(): void {
        this.router.navigate(['/interview/setup']);
    }
}
