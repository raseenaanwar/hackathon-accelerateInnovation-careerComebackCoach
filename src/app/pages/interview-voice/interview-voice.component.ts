import { Component, OnInit, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ElevenLabsService } from '../../core/services/elevenlabs.service';
import { StorageService } from '../../core/services/storage.service';

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
    connectionStatus = signal<'connecting' | 'connected' | 'offline'>('offline');
    isListening = signal<boolean>(false);
    isSpeaking = signal<boolean>(false);
    audioLevel = signal<number>(0);
    duration = signal<number>(0);
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

    private async initializeInterview(): Promise<void> {
        this.connectionStatus.set('connecting');

        try {
            // Get roadmap context from storage
            const sessionData = this.storageService.sessionState();
            const roadmapData = sessionData.roadmapData;

            const context = roadmapData
                ? `Interview context: User is preparing for a comeback to tech. Focus areas: ${roadmapData.overallGoal}`
                : 'General tech interview practice for career comeback.';

            // Start ElevenLabs conversation
            // await this.elevenLabsService.startConversation({
            //     agentId: 'YOUR_AGENT_ID', // Replace with actual agent ID
            //     context
            // });

            // SIMULATION: AI Not Connected (Offline mode per request)
            // In a real scenario, this would wait for the service connection
            await new Promise(resolve => setTimeout(resolve, 1500)); // Fake delay

            // Force offline for now as requested
            throw new Error('AI Service Unavailable');

            // Success path (commented out for now)
            // this.isConnected.set(true);
            // this.connectionStatus.set('connected');
            // this.startDurationTimer();

        } catch (error: any) {
            // this.error.set(error.message || 'Failed to start voice interview');
            console.warn('Voice interview offline mode:', error);
            this.isConnected.set(false);
            this.connectionStatus.set('offline');
        }
    }

    private startDurationTimer(): void {
        this.durationInterval = setInterval(() => {
            this.duration.set(this.duration() + 1);
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
