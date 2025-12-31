import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        loadComponent: () => import('./pages/landing/landing.component').then(m => m.LandingComponent)
    },
    {
        path: 'resume',
        loadComponent: () => import('./pages/resume-input/resume-input.component').then(m => m.ResumeInputComponent)
    },
    {
        path: 'analysis',
        loadComponent: () => import('./pages/analysis/analysis.component').then(m => m.AnalysisComponent)
    },
    {
        path: 'roadmap',
        loadComponent: () => import('./pages/roadmap/roadmap.component').then(m => m.RoadmapComponent)
    },
    {
        path: 'interview/setup',
        loadComponent: () => import('./pages/interview-setup/interview-setup.component').then(m => m.InterviewSetupComponent)
    },
    {
        path: 'interview/resume-session',
        loadComponent: () => import('./pages/interview-restore/interview-restore.component').then(m => m.InterviewRestoreComponent)
    },
    {
        path: 'interview/voice',
        loadComponent: () => import('./pages/interview-voice/interview-voice.component').then(m => m.InterviewVoiceComponent)
    },
    {
        path: 'interview/text',
        loadComponent: () => import('./pages/interview-text/interview-text.component').then(m => m.InterviewTextComponent)
    },
    {
        path: 'feedback',
        loadComponent: () => import('./pages/feedback/feedback.component').then(m => m.FeedbackComponent)
    },
    {
        path: '**',
        redirectTo: ''
    }
];
