import { Injectable, signal, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface SessionState {
    hasActiveSession: boolean;
    currentStep: 'idle' | 'resume-input' | 'analyzing' | 'roadmap' | 'interview';
    resumeData?: string;
    roadmapWeeks?: number;
    analysisResult?: any;
    roadmapData?: any;
    interviewMode?: 'voice' | 'text';
}

@Injectable({
    providedIn: 'root'
})
export class StorageService {
    private platformId = inject(PLATFORM_ID);
    private readonly SESSION_KEY = 'ccc-session-state';

    // Session state signal
    public sessionState = signal<SessionState>(this.loadSessionState());

    constructor() {
        // Listen for beforeunload to warn user
        if (isPlatformBrowser(this.platformId)) {
            window.addEventListener('beforeunload', (event) => {
                const state = this.sessionState();
                if (state.hasActiveSession && state.currentStep !== 'idle') {
                    event.preventDefault();
                    event.returnValue = 'You have an active session. Leaving will lose all progress.';
                    return event.returnValue;
                }
            });
        }
    }

    private loadSessionState(): SessionState {
        try {
            if (isPlatformBrowser(this.platformId)) {
                const stored = sessionStorage.getItem(this.SESSION_KEY);
                if (stored) {
                    return JSON.parse(stored);
                }
            }
        } catch (error) {
            console.error('Error loading session state:', error);
        }

        return {
            hasActiveSession: false,
            currentStep: 'idle'
        };
    }

    public updateSession(updates: Partial<SessionState>): void {
        const current = this.sessionState();
        const newState = { ...current, ...updates };
        this.sessionState.set(newState);
        if (isPlatformBrowser(this.platformId)) {
            sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(newState));
        }
    }

    public clearSession(): void {
        this.sessionState.set({
            hasActiveSession: false,
            currentStep: 'idle'
        });
        if (isPlatformBrowser(this.platformId)) {
            sessionStorage.removeItem(this.SESSION_KEY);
        }
    }

    public startSession(step: SessionState['currentStep']): void {
        this.updateSession({
            hasActiveSession: true,
            currentStep: step
        });
    }
}
