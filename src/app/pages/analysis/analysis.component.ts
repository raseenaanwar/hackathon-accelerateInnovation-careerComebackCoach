import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GeminiService, SkillAnalysis, Roadmap } from '../../core/services/gemini.service';
import { StorageService } from '../../core/services/storage.service';

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

    private async performAnalysis(resumeText: string): Promise<void> {
        try {
            // Step 1: Analyze resume
            this.currentStep.set('Analyzing your skills and experience...');
            await this.delay(1000);

            const analysis = await this.geminiService.analyzeResume(resumeText);
            this.analysis.set(analysis);

            this.storageService.updateSession({
                analysisResult: analysis
            });

            // Step 2: Generate roadmap
            this.currentStep.set('Creating your personalized roadmap...');
            await this.delay(1500);

            const roadmap = await this.geminiService.generateRoadmap(analysis);
            this.roadmap.set(roadmap);

            this.storageService.updateSession({
                roadmapData: roadmap
            });

            // Complete
            this.currentStep.set('Analysis complete!');
            await this.delay(800);

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
