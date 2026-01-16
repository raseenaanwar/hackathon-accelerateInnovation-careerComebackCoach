import { createReducer, on } from '@ngrx/store';
import { SessionActions } from './session.actions';
import { SessionState } from './session.models';

export const initialState: SessionState = {
    hasActiveSession: false,
    currentStep: 'idle'
};

export const sessionReducer = createReducer(
    initialState,
    on(SessionActions.loadSessionSuccess, (state, { state: loadedState }) => ({
        ...state,
        ...loadedState
    })),
    on(SessionActions.startSession, (state, { step }) => ({
        ...state,
        hasActiveSession: true,
        currentStep: step
    })),
    on(SessionActions.updateSession, (state, { updates }) => ({
        ...state,
        ...updates
    })),
    on(SessionActions.setResume, (state, { resumeData, roadmapWeeks }) => ({
        // Reset state but keep relevant inputs, effectively removing old session details
        hasActiveSession: true,
        currentStep: 'resume-input',
        resumeData,
        roadmapWeeks,
        // Explicitly clearing other fields
        analysisResult: undefined,
        roadmapData: undefined,
        interviewMode: undefined
    })),
    on(SessionActions.clearSession, () => initialState)
);
