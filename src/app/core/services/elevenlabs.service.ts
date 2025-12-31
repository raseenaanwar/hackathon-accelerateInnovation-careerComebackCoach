import { Injectable, signal, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
    providedIn: 'root'
})
export class ElevenLabsService {
    private platformId = inject(PLATFORM_ID);
    private isBrowser = isPlatformBrowser(this.platformId);
    private socket: WebSocket | null = null;

    // Signals to track state
    public isConnected = signal(false);
    public isSpeaking = signal(false); // Tracks if Agent is speaking

    // API CONFIG - TODO: Move to environment variables for production
    private readonly API_KEY = 'YOUR_ELEVENLABS_API_KEY'; // User to replace this

    // Helper to check for demo mode
    private isDemoMode(): boolean {
        return this.API_KEY === 'YOUR_ELEVENLABS_API_KEY' || !this.API_KEY;
    }

    constructor() { }

    /**
     * Converts text to speech using ElevenLabs API
     * Returns a URL to the audio blob
     */
    async textToSpeech(text: string, voiceId: string = '21m00Tcm4TlvDq8ikWAM'): Promise<string> {
        if (!this.isBrowser) return '';

        // DEMO DATA: Simulate TTS in demo mode
        if (this.isDemoMode()) {
            console.log('ElevenLabs Service: Demo Mode active for TTS.');
            // Return empty string to signal component to skip playback or mock it
            // Attempting to return a valid but silent blob to prevent errors if we wanted
            return '';
        }

        try {
            const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
                method: 'POST',
                headers: {
                    'xi-api-key': this.API_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text,
                    model_id: 'eleven_monolingual_v1',
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail?.message || 'TTS request failed');
            }

            const blob = await response.blob();
            return URL.createObjectURL(blob);
        } catch (error) {
            console.error('ElevenLabs TTS Error:', error);
            // Fallback to avoid breaking UI flow
            return '';
        }
    }

    /**
     * Connects to ElevenLabs Conversational AI (Agents) via WebSocket
     * This fulfills the hackathon requirement for "Voice-driven" interaction.
     */
    async startConversation(agentId: string): Promise<void> {
        if (!this.isBrowser) return;

        // DEMO DATA: Simulate Connection
        if (this.isDemoMode() || agentId === 'YOUR_AGENT_ID_HERE') {
            console.warn('ElevenLabs Service: Demo Mode active for Voice Interview.');
            this.isConnected.set(true);

            // Simulate agent "speaking" periodically to demonstrate UI
            setTimeout(() => {
                this.isSpeaking.set(true);
                setTimeout(() => this.isSpeaking.set(false), 3000);
            }, 2000);

            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            try {
                // Determine WebSocket URL
                // Note: ElevenLabs ConvAI WebSocket endpoint
                const url = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${agentId}`;

                this.socket = new WebSocket(url);

                this.socket.onopen = () => {
                    console.log('Connected to ElevenLabs ConvAI');
                    this.isConnected.set(true);
                    resolve();
                };

                this.socket.onmessage = (event) => {
                    const message = JSON.parse(event.data);
                    this.handleSocketMessage(message);
                };

                this.socket.onerror = (error) => {
                    console.error('ElevenLabs WebSocket Error:', error);
                    // Only reject if we haven't connected yet
                    if (!this.isConnected()) {
                        reject(error);
                    }
                };

                this.socket.onclose = (event) => {
                    console.log('ElevenLabs Connection Closed', event.code, event.reason);
                    this.isConnected.set(false);
                    this.isSpeaking.set(false);
                };

            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Send client audio to the Agent
     * Expects Base64 encoded audio chunk
     */
    sendAudioChunk(base64Audio: string): void {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                user_audio_chunk: base64Audio
            }));
        }
    }

    /**
     * Ends the conversation
     */
    endConversation(): void {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        this.isConnected.set(false);
        this.isSpeaking.set(false);
    }

    private handleSocketMessage(message: any): void {
        // Handle various event types from ElevenLabs ConvAI
        // Documentation: https://elevenlabs.io/docs/conversational-ai/websocket

        switch (message.type) {
            case 'agent_response':
                // Received audio chunk from agent
                if (message.audio_event?.audio_base_64) {
                    this.playAudioChunk(message.audio_event.audio_base_64);
                }
                break;

            case 'agent_start_talking':
                this.isSpeaking.set(true);
                break;

            case 'agent_stop_talking':
                this.isSpeaking.set(false);
                break;

            case 'im_alive':
                // Keepalive / ping
                break;

            default:
                // console.log('Unknown event:', message);
                break;
        }
    }

    // Simple audio queue to play chunks smoothly
    private audioQueue: string[] = [];
    private isPlaying = false;
    private audioContext: AudioContext | null = null;

    private async playAudioChunk(base64Audio: string) {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        }

        // Decode audio
        const audioData = atob(base64Audio);
        const arrayBuffer = new ArrayBuffer(audioData.length);
        const view = new Uint8Array(arrayBuffer);
        for (let i = 0; i < audioData.length; i++) {
            view[i] = audioData.charCodeAt(i);
        }

        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        this.playBuffer(audioBuffer);
    }

    private playBuffer(buffer: AudioBuffer) {
        if (!this.audioContext) return;

        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(this.audioContext.destination);
        source.start(0);

        // Ensure "isSpeaking" is true while audio plays (fallback if events fail)
        if (!this.isSpeaking()) this.isSpeaking.set(true);
        source.onended = () => {
            // We rely on agent_stop_talking event usually, but this is a backup
        };
    }
}
