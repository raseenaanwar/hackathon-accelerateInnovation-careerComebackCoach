
export interface SessionState {
    hasActiveSession: boolean;
    currentStep: 'idle' | 'resume-input' | 'analyzing' | 'roadmap' | 'interview';
    resumeData?: string;
    roadmapWeeks?: number;
    analysisResult?: any;
    roadmapData?: any;
    interviewMode?: 'voice' | 'text';
}
