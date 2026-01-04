import { Component, OnInit, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ElevenLabsService } from '@core/services/elevenlabs.service';
import { StorageService } from '@core/services/storage.service';
import { environment } from '@env/environment';

@Component({
    selector: 'app-interview-voice',
    imports: [CommonModule],
    templateUrl: './interview-voice.component.html',
    styles: [`
    :host {
      display: block;
    }
  `]
})
export class InterviewVoiceComponent implements OnInit, OnDestroy {
    isConnected = signal<boolean>(false);
    connectionStatus = signal<'connecting' | 'connected' | 'offline' | 'missing_config'>('offline');
    isListening = signal<boolean>(false);
    isSpeaking = signal<boolean>(false);
    audioLevel = signal<number>(0);
    duration = signal<number>(60); // 1 minute countdown
    error = signal<string | null>(null);

    private durationInterval?: any;

    constructor(
        public router: Router,
        private elevenLabsService: ElevenLabsService,
        private storageService: StorageService
    ) { }

    async ngOnInit(): Promise<void> {
        await this.initializeInterview();
    }

    ngOnDestroy(): void {
        this.endInterview();
    }

    agentIdInput = signal<string>('');

    private async initializeInterview(providedAgentId?: string): Promise<void> {
        this.connectionStatus.set('connecting');

        try {
            // Get roadmap context from storage
            const sessionData = this.storageService.sessionState();
            const roadmapData = sessionData.roadmapData;

            if (!roadmapData) {
                this.error.set('No active session found. Please upload your resume first to generate a customized interview.');
                this.isConnected.set(false);
                this.connectionStatus.set('offline');
                setTimeout(() => this.router.navigate(['/resume']), 4000);
                return;
            }

            const context = roadmapData
                ? `Interview context: User is preparing for a comeback to tech. Focus areas: ${roadmapData.overallGoal}`
                : 'General tech interview practice for career comeback.';

            // Get Agent ID from env or param
            let agentId = providedAgentId || (environment as any).elevenLabsAgentID;

            // Check if valid
            if (!agentId || agentId === 'YOUR_AGENT_ID_HERE') {
                console.warn('Authentication Warning: No Agent ID provided.');
                this.connectionStatus.set('missing_config'); // New state for UI
                return;
            }

            const dynamicVars = {
                roadmap_context: context
            };

            await this.elevenLabsService.startConversation(agentId, dynamicVars);

            this.isConnected.set(true);
            this.connectionStatus.set('connected');
            this.startDurationTimer();
            console.log('Voice Interview: Connected to ElevenLabs Agent.');

        } catch (error: any) {
            console.warn('Voice interview offline mode:', error);
            this.isConnected.set(false);
            this.connectionStatus.set('offline');
            this.error.set(error.message || 'Failed to connect. Check your API Key/Agent ID.');
        }
    }

    startWithAgentId(): void {
        const id = this.agentIdInput().trim();
        if (id) {
            this.initializeInterview(id);
        }
    }

    private startDurationTimer(): void {
        this.durationInterval = setInterval(() => {
            if (this.duration() > 0) {
                this.duration.set(this.duration() - 1);
            } else {
                this.endInterview();
            }
        }, 1000);
    }

    toggleListening(): void {
        if (!this.isConnected()) return;
        this.isListening.set(!this.isListening());
    }

    endInterview(): void {
        if (this.durationInterval) {
            clearInterval(this.durationInterval);
        }
        this.elevenLabsService.endConversation();
        this.storageService.updateSession({
            currentStep: 'interview'
        });
        this.router.navigate(['/feedback']);
    }

    formatDuration(seconds: number): string {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
}
