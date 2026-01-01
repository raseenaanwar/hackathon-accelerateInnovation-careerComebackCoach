import { Component, OnInit, signal, ViewChild, ElementRef, AfterViewChecked, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
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

    private isBrowser = false;

    constructor(
        private router: Router,
        private geminiService: GeminiService,
        private storageService: StorageService,
        private elevenLabsService: ElevenLabsService,
        @Inject(PLATFORM_ID) platformId: Object
    ) {
        this.isBrowser = isPlatformBrowser(platformId);
    }

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

        if (!roadmapData) {
            // Redirect if no session - reusing similar logic to voice component but simpler for text
            this.router.navigate(['/resume']);
            return;
        }

        const context = `focusing on ${roadmapData.overallGoal}`;

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

    // TTS Toggle
    useTTS = signal<boolean>(false);
    isSpeaking = signal<boolean>(false);
    streamingContent = signal<string>('');

    async sendMessage(): Promise<void> {
        const input = this.userInput().trim();
        if (!input || this.isTyping()) return;

        // Add user message
        this.addMessage('user', input);
        this.userInput.set('');
        this.isTyping.set(true);
        this.streamingContent.set('');

        try {
            // Add placeholder for assistant message
            this.addMessage('assistant', '');

            // Get conversation history for context
            const history = this.messages().slice(0, -1).map(m => ({
                role: m.role,
                content: m.content
            }));

            const prompt = `You are conducting a technical interview. \n\nCandidate's response: ${input}\n\nProvide a thoughtful, short follow-up or feedback (max 3 sentences).`;

            const stream = this.geminiService.chatStream(prompt, history);
            let fullResponse = '';

            for await (const chunk of stream) {
                fullResponse += chunk;
                this.streamingContent.set(fullResponse);

                // Update the last message (assistant's placeholder) with current stream
                this.messages.update(msgs => {
                    const newMsgs = [...msgs];
                    if (newMsgs.length > 0) {
                        newMsgs[newMsgs.length - 1] = {
                            ...newMsgs[newMsgs.length - 1],
                            content: fullResponse
                        };
                    }
                    return newMsgs;
                });
                this.shouldScrollToBottom = true;
            }

            // Audio Playback (if enabled)
            if (this.useTTS() && fullResponse) {
                this.playTTS(fullResponse);
            }

        } catch (error) {
            console.error('Error getting AI response:', error);
            // If completely failed, remove the placeholder or show error
            this.messages.update(msgs => {
                const newMsgs = [...msgs];
                if (newMsgs.length > 0 && newMsgs[newMsgs.length - 1].content === '') {
                    newMsgs[newMsgs.length - 1].content = "I apologize, I'm having trouble connecting. Please try again.";
                }
                return newMsgs;
            });
        } finally {
            this.isTyping.set(false);
            this.streamingContent.set('');
        }
    }

    async playTTS(text: string): Promise<void> {
        if (!this.isBrowser) return;
        try {
            this.isSpeaking.set(true);
            const audioUrl = await this.elevenLabsService.textToSpeech(text);
            if (audioUrl) {
                const audio = new Audio(audioUrl);
                audio.onended = () => this.isSpeaking.set(false);
                await audio.play();
            } else {
                this.isSpeaking.set(false);
            }
        } catch (error) {
            console.warn('TTS playback failed:', error);
            this.isSpeaking.set(false);
            // Optionally disable TTS if it fails due to auth
            // this.useTTS.set(false);
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
