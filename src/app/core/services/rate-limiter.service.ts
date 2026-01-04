import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class RateLimiterService {
    private requestTimestamps: Map<string, number[]> = new Map();

    constructor() { }

    /**
     * Checks if a request is allowed based on the rate limit.
     * @param key Unique key for the action (e.g., 'gemini-analysis', 'elevenlabs-tts')
     * @param maxRequests Maximum number of requests allowed in the window
     * @param windowMs Time window in milliseconds
     * @returns true if allowed, false if rate limited
     */
    isAllowed(key: string, maxRequests: number, windowMs: number): boolean {
        const now = Date.now();
        let timestamps = this.requestTimestamps.get(key) || [];

        // Filter out timestamps older than the window
        timestamps = timestamps.filter(time => now - time < windowMs);

        if (timestamps.length >= maxRequests) {
            return false;
        }

        // Add current request
        timestamps.push(now);
        this.requestTimestamps.set(key, timestamps);
        return true;
    }

    /**
     * Resets the limit for a specific key (useful for failures where we don't want to count the attempt)
     */
    reset(key: string): void {
        this.requestTimestamps.delete(key);
    }
}
