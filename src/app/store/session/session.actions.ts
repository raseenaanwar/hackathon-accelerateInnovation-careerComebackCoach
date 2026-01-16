import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { SessionState } from './session.models';

export const SessionActions = createActionGroup({
  source: 'Session',
  events: {
    'Init Session': emptyProps(),
    'Start Session': props<{ step: SessionState['currentStep'] }>(),
    'Update Session': props<{ updates: Partial<SessionState> }>(),
    'Set Resume': props<{ resumeData: string; roadmapWeeks: number }>(),
    'Clear Session': emptyProps(),
    'Load Session Success': props<{ state: SessionState }>(),
  }
});
