import { Component, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StorageService } from '@core/services/storage.service';

@Component({
    selector: 'app-resume-input',
    imports: [FormsModule],
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
    errorMessage = signal<string>('');
    roadmapWeeks = signal<number>(4);

    private router = inject(Router);
    private storageService = inject(StorageService);

    setActiveTab(tab: 'upload' | 'text'): void {
        this.activeTab.set(tab);
        this.errorMessage.set(''); // Clear error on tab switch
    }

    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            const file = input.files[0];
            const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'text/plain'];

            if (!validTypes.includes(file.type)) {
                this.errorMessage.set('Please upload a PDF, Word document, or text file.');
                return;
            }

            this.uploadedFile.set(file);
            this.errorMessage.set('');
        }
    }

    async processResume(): Promise<void> {
        this.isProcessing.set(true);
        this.errorMessage.set('');

        let resumeText = '';

        if (this.activeTab() === 'upload' && this.uploadedFile()) {
            // Extract text from file (simplified for now)
            const file = this.uploadedFile()!;
            if (file.type === 'text/plain') {
                resumeText = await file.text();
            } else {
                // For PDF/Word: Convert to Base64 to send to Gemini as multimodal input
                // Note: We prepend a special flag so GeminiService knows this is a base64 file, not raw text
                try {
                    const base64 = await this.fileToBase64(file);
                    // Format: [FILE_DATA:mimeType:base64String]
                    resumeText = `[FILE_DATA:${file.type}:${base64}]`;
                } catch (err) {
                    this.errorMessage.set('Failed to process file. Please try again.');
                    this.isProcessing.set(false);
                    return;
                }
            }
        } else if (this.activeTab() === 'text') {
            resumeText = this.manualText();
        }

        if (!resumeText.trim()) {
            this.errorMessage.set('Please provide your resume information.');
            this.isProcessing.set(false);
            return;
        }

        // VALIDATION: Security & Quality Checks
        if (this.activeTab() === 'text') {
            const cleanText = resumeText.trim();

            // 1. Length Validation
            if (cleanText.length < 50) {
                this.errorMessage.set('Please provide more details (at least 50 characters) for an accurate analysis.');
                this.isProcessing.set(false);
                return;
            }

            if (cleanText.length > 1000) {
                this.errorMessage.set('Text is too long. Please keep it under 1000 characters to ensure processing.');
                this.isProcessing.set(false);
                return;
            }

            // 2. Gibberish/Repetition Check (Simple Heuristic)
            // Checks for long sequences of repeated characters (e.g., "aaaaa")
            if (/(.)\1{9,}/.test(cleanText)) {
                this.errorMessage.set('Please interpret real skills data. Repeated characters detected.');
                this.isProcessing.set(false);
                return;
            }

            // 3. Basic Content Check (e.g. no code injection attempts - extremely basic sanitization warning)
            if (cleanText.includes('<script>') || cleanText.includes('javascript:')) {
                this.errorMessage.set('Invalid characters detected. Please enter plain text only.');
                this.isProcessing.set(false);
                return;
            }
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

    private fileToBase64(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                // Remove data URL prefix (e.g., "data:application/pdf;base64,")
                const result = reader.result as string;
                const base64 = result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = error => reject(error);
        });
    }
}
