import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { StorageService } from '../../core/services/storage.service';

interface FeedbackSection {
    title: string;
    score: number;
    maxScore: number;
    feedback: string;
    highlights: string[];
    improvements: string[];
}

@Component({
    selector: 'app-feedback',
    imports: [CommonModule],
    templateUrl: './feedback.component.html',
    styles: [`
    :host {
      display: block;
    }
  `]
})
export class FeedbackComponent {
    // Mock feedback data - in production this would come from AI analysis
    overallScore = signal<number>(78);
    feedbackSections = signal<FeedbackSection[]>([
        {
            title: 'Technical Knowledge',
            score: 80,
            maxScore: 100,
            feedback: 'Strong understanding of fundamental concepts with room for growth in advanced topics.',
            highlights: [
                'Clear explanations of core concepts',
                'Good problem-solving approach',
                'Real-world examples used effectively'
            ],
            improvements: [
                'Deepen knowledge in system design',
                'Practice more complex algorithmic problems'
            ]
        },
        {
            title: 'Communication',
            score: 85,
            maxScore: 100,
            feedback: 'Excellent communication skills with clear, structured responses.',
            highlights: [
                'Well-organized thoughts',
                'Active listening demonstrated',
                'Professional tone maintained'
            ],
            improvements: [
                'Use more technical terminology',
                'Be more concise in some responses'
            ]
        },
        {
            title: 'Confidence & Presence',
            score: 70,
            maxScore: 100,
            feedback: 'Good foundation, but showing some nervousness. Practice will help!',
            highlights: [
                'Honest about knowledge gaps',
                'Willing to ask clarifying questions',
                'Positive attitude'
            ],
            improvements: [
                'Pause before answering to gather thoughts',
                'Maintain steady pace when speaking',
                'Project more confidence in your expertise'
            ]
        }
    ]);

    constructor(
        private router: Router,
        private storageService: StorageService
    ) { }

    getScoreColor(score: number): string {
        if (score >= 80) return 'text-[hsl(var(--color-success))]';
        if (score >= 60) return 'text-[hsl(var(--color-warning))]';
        return '';
    }

    getProgressColor(score: number): string {
        if (score >= 80) return 'from-[hsl(var(--color-success))]';
        if (score >= 60) return 'from-[hsl(var(--color-warning))]';
        return 'from-[hsl(var(--color-error))]';
    }

    retakeInterview(): void {
        this.router.navigate(['/interview/setup']);
    }

    backToRoadmap(): void {
        this.router.navigate(['/roadmap']);
    }


}
