import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Store } from '@ngrx/store';
import { SessionActions } from '../../store/session/session.actions';
import { selectSessionState } from '../../store/session/session.selectors';
import { SessionState } from '../../store/session/session.models';

export type { SessionState };

@Injectable({
    providedIn: 'root'
})
export class StorageService {
    private platformId = inject(PLATFORM_ID);
    private store = inject(Store);
    
    // Session state signal mapped to store
    public sessionState = this.store.selectSignal(selectSessionState);

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

    public updateSession(updates: Partial<SessionState>): void {
        this.store.dispatch(SessionActions.updateSession({ updates }));
    }

    public clearSession(): void {
        this.store.dispatch(SessionActions.clearSession());
    }

    public startSession(step: SessionState['currentStep']): void {
        this.store.dispatch(SessionActions.startSession({ step }));
    }

    public setResume(resumeData: string, roadmapWeeks: number): void {
        this.store.dispatch(SessionActions.setResume({ resumeData, roadmapWeeks }));
    }

    public isDemoMode(): boolean {
        const state = this.sessionState();
        return state.roadmapData?.source === 'Demo Mode' || state.roadmapData?.restoredFrom === 'Dev Mode';
    }
}
