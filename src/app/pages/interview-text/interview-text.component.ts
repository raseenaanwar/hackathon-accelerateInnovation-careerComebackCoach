import { Component, OnInit, signal, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GeminiService } from '@core/services/gemini.service';
import { StorageService } from '@core/services/storage.service';
import { ElevenLabsService } from '@core/services/elevenlabs.service';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

@Component({
    selector: 'app-interview-text',
    imports: [CommonModule, FormsModule],
    templateUrl: './interview-text.component.html',
    styles: [`
    :host {
      display: block;
    }
  `]
})
export class InterviewTextComponent implements OnInit, AfterViewChecked {
    @ViewChild('messagesContainer') private messagesContainer?: ElementRef;

    messages = signal<Message[]>([]);
    userInput = signal<string>('');
    isTyping = signal<boolean>(false);
    duration = signal<number>(300); // 5 minutes countdown

    private durationInterval?: any;
    private shouldScrollToBottom = false;

    constructor(
        private router: Router,
        private geminiService: GeminiService,
        private storageService: StorageService,
        private elevenLabsService: ElevenLabsService
    ) { }

    async ngOnInit(): Promise<void> {
        await this.initializeInterview();
        this.startDurationTimer();
    }

    ngAfterViewChecked(): void {
        if (this.shouldScrollToBottom) {
            this.scrollToBottom();
            this.shouldScrollToBottom = false;
        }
    }

    private async initializeInterview(): Promise<void> {
        // Get roadmap context
        const sessionData = this.storageService.sessionState();
        const roadmapData = sessionData.roadmapData;

        const context = roadmapData
            ? `focusing on ${roadmapData.overallGoal}`
            : 'general tech skills';

        // Add welcome message
        this.addMessage('assistant', `Welcome to your interview practice! I'm here to help you prepare for your tech comeback ${context}. Let's start with a simple question: Tell me about your background and what brought you back to tech.`);
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

    private addMessage(role: 'user' | 'assistant', content: string): void {
        const currentMessages = this.messages();
        this.messages.set([...currentMessages, {
            role,
            content,
            timestamp: new Date()
        }]);
        this.shouldScrollToBottom = true;
    }

    private scrollToBottom(): void {
        if (this.messagesContainer) {
            const element = this.messagesContainer.nativeElement;
            element.scrollTop = element.scrollHeight;
        }
    }

    async sendMessage(): Promise<void> {
        const input = this.userInput().trim();
        if (!input || this.isTyping()) return;

        // Add user message
        this.addMessage('user', input);
        this.userInput.set('');

        // Show typing indicator
        this.isTyping.set(true);

        try {
            // Get AI response
            const conversationHistory = this.messages()
                .map(m => `${m.role === 'user' ? 'Candidate' : 'Interviewer'}: ${m.content}`)
                .join('\n');

            const prompt = `You are conducting a technical interview for someone returning to tech. 
      
Conversation so far:
${conversationHistory}

Candidate's latest response: ${input}

Provide a thoughtful follow-up question or feedback. Be encouraging but professional. Ask about technical skills, problem-solving, or past experiences. Keep responses concise (2-3 sentences).

Your response:`;

            const result = await this.geminiService.analyzeResume(prompt);
            // Mock response for now since analyzeResume returns SkillAnalysis
            // In a real implementation this would come from `result` if analyzeResume supported generic prompts properly, 
            // or we'd add a separate method in GeminiService for chat.
            const response = "That's great! Can you tell me more about a challenging technical problem you solved in your previous role?";

            this.addMessage('assistant', response);

            // Text-to-Speech playback (ElevenLabs)
            try {
                // We don't block the UI for this, just play it when ready
                const audioUrl = await this.elevenLabsService.textToSpeech(response);
                if (audioUrl) {
                    const audio = new Audio(audioUrl);
                    audio.play().catch(e => console.warn('Audio play blocked/failed:', e));
                } else {
                    // DEMO MODE: No audio returned
                    console.log('Demo Mode: TTS simulated (no audio played).');
                }
            } catch (err) {
                console.warn('TTS playback failed:', err);
            }
        } catch (error) {
            console.error('Error getting AI response:', error);
            this.addMessage('assistant', 'I apologize, I had trouble processing that. Could you rephrase your response?');
        } finally {
            this.isTyping.set(false);
        }
    }

    endInterview(): void {
        if (this.durationInterval) {
            clearInterval(this.durationInterval);
        }
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
