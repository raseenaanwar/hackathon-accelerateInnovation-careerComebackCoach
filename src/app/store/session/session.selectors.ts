import { createFeatureSelector, createSelector } from '@ngrx/store';
import { SessionState } from './session.models';

export const selectSessionState = createFeatureSelector<SessionState>('session');

export const selectHasActiveSession = createSelector(selectSessionState, (state) => state.hasActiveSession);
export const selectCurrentStep = createSelector(selectSessionState, (state) => state.currentStep);
export const selectResumeData = createSelector(selectSessionState, (state) => state.resumeData);
export const selectRoadmapData = createSelector(selectSessionState, (state) => state.roadmapData);
export const selectAnalysisResult = createSelector(selectSessionState, (state) => state.analysisResult);
export const selectInterviewMode = createSelector(selectSessionState, (state) => state.interviewMode);
