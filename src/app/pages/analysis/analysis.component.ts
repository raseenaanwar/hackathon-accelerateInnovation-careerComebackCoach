import { Component, OnInit, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { GeminiService, SkillAnalysis, Roadmap } from '@core/services/gemini.service';
import { StorageService } from '@core/services/storage.service';

@Component({
    selector: 'app-analysis',
    imports: [],
    templateUrl: './analysis.component.html',
    styles: [`
    :host {
      display: block;
    }
  `]
})
export class AnalysisComponent implements OnInit {
    isAnalyzing = signal<boolean>(true);
    analysisComplete = signal<boolean>(false);
    analysis = signal<SkillAnalysis | null>(null);
    roadmap = signal<Roadmap | null>(null);
    currentStep = signal<string>('Analyzing your skills...');

    private router = inject(Router);
    private geminiService = inject(GeminiService);
    private storageService = inject(StorageService);

    async ngOnInit(): Promise<void> {
        // Get resume data from storage
        const sessionData = this.storageService.sessionState();
        const resumeText = sessionData.resumeData;

        if (!resumeText) {
            // No resume data, redirect to resume input
            this.router.navigate(['/resume']);
            return;
        }

        // Start analysis
        await this.performAnalysis(resumeText);
    }

    // New signal for streaming text
    streamingText = signal<string>('');

    private async performAnalysis(resumeText: string): Promise<void> {
        try {
            // Step 1: Analyze resume
            this.currentStep.set('Analyzing your skills and experience...');
            this.streamingText.set(''); // Reset stream text
            await this.delay(500);

            // Use the streaming method
            const generator = this.geminiService.analyzeResumeStream(resumeText);
            let analysis: SkillAnalysis | null = null;
            let fullText = '';

            // Consume the stream
            for await (const chunk of generator) {
                if (typeof chunk === 'string') {
                    // Update streaming text for UI
                    this.streamingText.update(current => current + chunk);
                    fullText += chunk;
                }
            }

            // Extract JSON from the accumulated text
            const jsonMatch = fullText.match(/\{[\s\S]*\}/);

            if (jsonMatch) {
                analysis = JSON.parse(jsonMatch[0]);
            } else {
                // If checking for error object in non-json response (fallback)
                throw new Error('Analysis failed to produce valid data.');
            }

            // Check for validation error from AI
            if (analysis && analysis.error) {
                this.currentStep.set(analysis.error);
                this.isAnalyzing.set(false);
                setTimeout(() => this.router.navigate(['/resume']), 4000);
                return;
            }

            if (analysis) {
                this.analysis.set(analysis);
                this.storageService.updateSession({
                    analysisResult: analysis
                });
            }

            // Step 2: Generate roadmap
            this.currentStep.set('Creating your personalized roadmap...');

            // Get target weeks from session (default to 4 if missing)
            const sessionData = this.storageService.sessionState();
            const weeks = sessionData.roadmapWeeks || 4;

            if (analysis) {
                const roadmap = await this.geminiService.generateRoadmap(analysis, weeks);
                this.roadmap.set(roadmap);

                this.storageService.updateSession({
                    roadmapData: roadmap
                });
            }

            // Complete
            this.currentStep.set('Analysis complete!');
            this.isAnalyzing.set(false);
            this.analysisComplete.set(true);

            // Auto-redirect after 3 seconds
            setTimeout(() => {
                this.viewRoadmap();
            }, 3000);

        } catch (error) {
            console.error('Error during analysis:', error);
            this.currentStep.set('Analysis failed. Please try again.');
            this.isAnalyzing.set(false);

            // Auto-redirect back to input on failure
            setTimeout(() => {
                this.router.navigate(['/resume']);
            }, 3000);
        }
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    viewRoadmap(): void {
        this.router.navigate(['/roadmap']);
    }
}
