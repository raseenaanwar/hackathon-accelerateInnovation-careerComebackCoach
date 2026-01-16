import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { tap, withLatestFrom } from 'rxjs/operators';
import { SessionActions } from './session.actions';
import { Store } from '@ngrx/store';
import { isPlatformBrowser } from '@angular/common';
import { selectSessionState } from './session.selectors';

@Injectable()
export class SessionEffects {
    private actions$ = inject(Actions);
    private store = inject(Store);
    private platformId = inject(PLATFORM_ID);
    private readonly SESSION_KEY = 'ccc-session-state';

    saveSession$ = createEffect(() => this.actions$.pipe(
        ofType(SessionActions.startSession, SessionActions.updateSession, SessionActions.setResume, SessionActions.clearSession),
        withLatestFrom(this.store.select(selectSessionState)),
        tap(([action, state]) => {
            if (isPlatformBrowser(this.platformId)) {
                if (action.type === SessionActions.clearSession.type) {
                     sessionStorage.removeItem(this.SESSION_KEY);
                } else {
                     sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(state));
                }
            }
        })
    ), { dispatch: false });

    initSession$ = createEffect(() => this.actions$.pipe(
        ofType(SessionActions.initSession),
        tap(() => {
             if (isPlatformBrowser(this.platformId)) {
                try {
                    const stored = sessionStorage.getItem(this.SESSION_KEY);
                    if (stored) {
                        const state = JSON.parse(stored);
                        this.store.dispatch(SessionActions.loadSessionSuccess({ state }));
                    }
                } catch(e) {
                    console.error('Error loading session state:', e);
                }
             }
        })
    ), { dispatch: false });
}
