import { Injectable, signal, effect, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type ThemeMode = 'light' | 'dark';

@Injectable({
    providedIn: 'root'
})
export class ThemeService {
    private readonly THEME_STORAGE_KEY = 'ccc-theme-preference';
    private platformId = inject(PLATFORM_ID);
    private isBrowser = isPlatformBrowser(this.platformId);

    // Theme state
    public theme = signal<ThemeMode>(this.getInitialTheme());

    constructor() {
        // Sync theme changes to DOM and localStorage (browser only)
        effect(() => {
            if (this.isBrowser) {
                const currentTheme = this.theme();
                document.documentElement.classList.remove('light', 'dark');
                document.documentElement.classList.add(currentTheme);
                localStorage.setItem(this.THEME_STORAGE_KEY, currentTheme);
            }
        });
    }

    private getInitialTheme(): ThemeMode {
        // Only access localStorage in browser
        if (!this.isBrowser) {
            return 'light'; // Default for SSR
        }

        // Check localStorage first
        const stored = localStorage.getItem(this.THEME_STORAGE_KEY);
        if (stored === 'light' || stored === 'dark') {
            return stored;
        }

        // Fall back to system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }

        return 'light';
    }

    public toggleTheme(): void {
        this.theme.set(this.theme() === 'light' ? 'dark' : 'light');
    }

    public setTheme(mode: ThemeMode): void {
        this.theme.set(mode);
    }
}
