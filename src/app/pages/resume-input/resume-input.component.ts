import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StorageService } from '@core/services/storage.service';

@Component({
    selector: 'app-resume-input',
    imports: [CommonModule, FormsModule],
    templateUrl: './resume-input.component.html',
    styles: [`
    :host {
      display: block;
    }
  `]
})
export class ResumeInputComponent {
    activeTab = signal<'upload' | 'text'>('upload');
    uploadedFile = signal<File | null>(null);
    manualText = signal<string>('');
    isProcessing = signal<boolean>(false);
    roadmapWeeks = signal<number>(4);

    constructor(
        private router: Router,
        private storageService: StorageService
    ) { }

    setActiveTab(tab: 'upload' | 'text'): void {
        this.activeTab.set(tab);
    }

    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            const file = input.files[0];
            const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'text/plain'];

            if (!validTypes.includes(file.type)) {
                alert('Please upload a PDF, Word document, or text file.');
                return;
            }

            this.uploadedFile.set(file);
        }
    }

    async processResume(): Promise<void> {
        this.isProcessing.set(true);

        let resumeText = '';

        if (this.activeTab() === 'upload' && this.uploadedFile()) {
            // Extract text from file (simplified for now)
            const file = this.uploadedFile()!;
            if (file.type === 'text/plain') {
                resumeText = await file.text();
            } else {
                // For PDF/Word, we'll need a library - for now just use filename as placeholder
                resumeText = `[File: ${file.name}] - Full parsing to be implemented`;
            }
        } else if (this.activeTab() === 'text') {
            resumeText = this.manualText();
        }

        if (!resumeText.trim()) {
            alert('Please provide your resume information.');
            this.isProcessing.set(false);
            return;
        }

        // Clear previous session data to start fresh
        this.storageService.clearSession();

        // Store resume data
        this.storageService.updateSession({
            resumeData: resumeText,
            roadmapWeeks: this.roadmapWeeks(),
            currentStep: 'resume-input'
        });
        this.storageService.startSession('analyzing');

        // Navigate to analysis page
        setTimeout(() => {
            this.router.navigate(['/analysis']);
        }, 500);
    }
}
