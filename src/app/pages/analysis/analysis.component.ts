import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GeminiService, SkillAnalysis, Roadmap } from '@core/services/gemini.service';
import { StorageService } from '@core/services/storage.service';

@Component({
    selector: 'app-analysis',
    imports: [CommonModule],
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

    constructor(
        private router: Router,
        private geminiService: GeminiService,
        private storageService: StorageService
    ) { }

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
        // --- DUMMY MODE FOR TESTING ---
        const USE_DUMMY_DATA = true;
        if (USE_DUMMY_DATA) {
            this.currentStep.set('Analyzing your skills and experience (Simulation)...');
            this.streamingText.set('');
            const dummyText = "Based on your resume, I see strong potential for a comeback in Frontend Development. Your experience shows resilience. I recommend focusing on modern frameworks and state management mechanisms to bridge the gap. I've prepared a 12-week plan for you.";

            for (const char of dummyText.split('')) {
                this.streamingText.update(current => current + char);
                await this.delay(15);
            }
            await this.delay(1000);

            this.currentStep.set('Creating your personalized roadmap (Simulation)...');
            await this.delay(1500);

            this.analysisComplete.set(true);
            this.isAnalyzing.set(false);
            // Navigate to roadmap (will load dummy roadmap from RoadmapComponent if session empty)
            this.router.navigate(['/roadmap']);
            return;
        }
        // ------------------------------

        try {
            // Step 1: Analyze resume
            this.currentStep.set('Analyzing your skills and experience...');
            this.streamingText.set(''); // Reset stream text
            await this.delay(500);

            // Use the streaming method
            const generator = this.geminiService.analyzeResumeStream(resumeText);
            let analysis: SkillAnalysis | null = null;

            // Consume the stream
            for await (const chunk of generator) {
                if (typeof chunk === 'string') {
                    // Update streaming text for UI
                    this.streamingText.update(current => current + chunk);
                } else {
                    // This is the final result (if the generator yields it, or we parse it after)
                    // Note: Our generator yields strings only. We need to parse strictly at the end.
                }
            }

            // Extract JSON from the accumulated text
            const fullText = this.streamingText();
            const jsonMatch = fullText.match(/\{[\s\S]*\}/);

            if (jsonMatch) {
                analysis = JSON.parse(jsonMatch[0]);
            } else {
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
            // Clear streaming text or keep it as "Background" context? Let's clear it or minimize it.
            // this.streamingText.set(''); 

            await this.delay(1000);

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
            await this.delay(500);

            this.isAnalyzing.set(false);
            this.analysisComplete.set(true);
        } catch (error) {
            console.error('Error during analysis:', error);
            this.currentStep.set('Analysis failed. Please try again.');
            this.isAnalyzing.set(false);
        }
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    viewRoadmap(): void {
        this.router.navigate(['/roadmap']);
    }
}
