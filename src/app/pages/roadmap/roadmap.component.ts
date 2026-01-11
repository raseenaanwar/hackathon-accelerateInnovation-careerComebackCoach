import { Component, OnInit, signal, HostListener, ViewChildren, QueryList, ElementRef, inject } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Router } from '@angular/router';

import { Roadmap } from '@core/services/gemini.service';
import { StorageService } from '@core/services/storage.service';
import { PdfService } from '@core/services/pdf.service';

@Component({
    selector: 'app-roadmap',
    imports: [],
    templateUrl: './roadmap.component.html',
    styles: [`
    :host {
      display: block;
      min-height: 100vh;
    }
  `]
})
export class RoadmapComponent implements OnInit {
    roadmap = signal<Roadmap | null>(null);
    selectedIndex = signal<number>(0);

    @ViewChildren('scrollContainer') scrollContainers?: QueryList<ElementRef>;

    today = new Date();
    downloadStatus = signal<'idle' | 'loading' | 'success' | 'error'>('idle');

    // View Shift Logic
    viewOffset = signal<number>(0);
    @ViewChildren('cardElement') cardElements!: QueryList<ElementRef>;

    // 3D Config
    readonly THETA = 90; // Large gap to prevent overlap
    readonly RADIUS = 50; // Small radius for subtle depth

    private router = inject(Router);
    private storageService = inject(StorageService);
    private pdfService = inject(PdfService);

    private sanitizer = inject(DomSanitizer);

    ngOnInit(): void {
        const sessionData = this.storageService.sessionState();
        let roadmap = sessionData.roadmapData;

        // --- DUMMY DATA FOR TESTING ---
        if (!roadmap) {
            console.log('Using DUMMY DATA for testing...');
            roadmap = {
                overallGoal: "Transition into a Senior Frontend Developer Role",
                estimatedHours: 120,
                weeks: Array.from({ length: 12 }, (_, i) => ({
                    week: i + 1,
                    title: `Week ${i + 1}: ${['Foundations', 'Advanced CSS', 'JavaScript Mastery', 'Frameworks Deep Dive', 'State Management', 'API Integration', 'Testing Strategies', 'Performance Optimization', 'Accessibility', 'Security Best Practices', 'System Design', 'Final Project'][i] || 'Advanced Topics'}`,
                    goals: ["Master key concepts", "Build a practice project", "Contribute to open source"],
                    topics: ["UI/UX Principles", "Responsive Design", "Modern JS Features", "Angular Signals"],
                    resources: ["MDN Web Docs", "Angular University", "Frontend Masters"],
                    projects: [`Mini-Project ${i + 1}`, "Code Review simulation"]
                })),
                source: "Simulation",
                restoredFrom: "Dev Mode"
            };
        }
        // ------------------------------

        if (!roadmap) {
            this.router.navigate(['/resume']);
            return;
        }

        this.roadmap.set(roadmap);
    }

    // --- Navigation ---

    setIndex(index: number): void {
        const total = this.roadmap()?.weeks.length || 0;
        if (index >= 0 && index < total) {
            this.selectedIndex.set(index);
            this.viewOffset.set(0);
        }
    }

    private lastScrollTime = 0;
    private lastRotationTime = 0;

    onWheel(event: WheelEvent): void {
        const total = this.roadmap()?.weeks.length || 0;
        if (total === 0) return;

        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        if (scrollTop > 0) return;

        const now = Date.now();
        if (now - this.lastRotationTime < 200) {
            event.preventDefault();
            event.stopPropagation();
            return;
        }

        const index = this.selectedIndex();
        const cardRef = this.cardElements?.get(index);

        if (!cardRef) return;

        const rect = cardRef.nativeElement.getBoundingClientRect();
        const delta = event.deltaY;
        const currentOffset = this.viewOffset();

        // Target: We want the bottom of the card to be at (WindowHeight - 30px)
        const TARGET_BOTTOM = window.innerHeight - 30;

        // BUFFER: Precision buffer to prevent flickering at the boundary
        const BUFFER = 5;

        if (delta > 0) {
            // SCROLL DOWN -> Lift Card Up

            // If the card's bottom is still visually below the target line
            if (rect.bottom > TARGET_BOTTOM + BUFFER) {
                event.preventDefault();
                event.stopPropagation();

                // Increase offset to lift card
                this.viewOffset.update(v => v + delta);
                return;
            }

            // If we fall through, it means rect.bottom <= TARGET_BOTTOM
            // Card is fully lifted. Now we can rotate.

            if (index === total - 1) return;

        } else {
            // SCROLL UP -> Drop Card Down

            if (currentOffset > 0) {
                event.preventDefault();
                event.stopPropagation();

                // Decrease offset to drop card
                this.viewOffset.update(v => Math.max(0, v + delta));
                return;
            }
        }

        // --- ROTATION ---
        if (delta < 0 && index === 0) return;

        event.preventDefault();
        event.stopPropagation();

        if (now - this.lastScrollTime < 300) return;

        if (Math.abs(delta) > 30) {
            this.lastScrollTime = now;
            if (delta > 0) {
                this.rotate('next');
            } else {
                this.rotate('prev');
            }
        }
    }

    rotate(direction: 'next' | 'prev'): void {
        this.lastRotationTime = Date.now();

        const total = this.roadmap()?.weeks.length || 0;
        if (total === 0) return;

        const current = this.selectedIndex();
        let nextIndex = current;

        if (direction === 'next') {
            if (current < total - 1) nextIndex = current + 1;
        } else {
            if (current > 0) nextIndex = current - 1;
        }

        if (nextIndex !== current) {
            this.selectedIndex.set(nextIndex);
            this.viewOffset.set(0); // Reset offset on week change
        }
    }

    @HostListener('window:keydown', ['$event'])
    onKeydown(event: KeyboardEvent): void {
        if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
            this.rotate('next');
        } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
            this.rotate('prev');
        }
    }

    // --- 3D Style Calculation ---

    getCardTransform(index: number): { [key: string]: string } {
        const selected = this.selectedIndex();
        const offset = index - selected;

        // Optimization: If active card, use simple 2D transform to avoid blurriness
        if (offset === 0) {
            return {
                'transform': `translateZ(0) scale(1) translateY(${-this.viewOffset()}px)`, // Apply scroll shift
                'opacity': '1',
                'pointer-events': 'auto',
                'visibility': 'visible',
                'z-index': '100',
                'filter': 'none' // Ensure no inherited filters
            };
        }

        // Vertical Drum Effect: Rotate around X axis
        const angle = offset * -this.THETA;

        // Push disabled cards back in Z-space to prevent clipping/fighting
        const zPush = -Math.abs(offset) * 200;

        const transform = `translateZ(${zPush}px) rotateX(${angle}deg) translateZ(${this.RADIUS}px)`;

        const dist = Math.abs(offset);

        // Opacity transition
        const opacity = dist === 0 ? 1 : (dist <= 1 ? 0.3 : 0);

        // Only render active and immediate neighbors
        const isVisible = dist <= 1;

        return {
            'transform': transform,
            'opacity': opacity.toString(),
            'pointer-events': dist === 0 ? 'auto' : 'none',
            'visibility': isVisible ? 'visible' : 'hidden',
            'z-index': (100 - Math.floor(dist * 10)).toString()
        };
    }

    // --- Actions ---

    async downloadPDF(): Promise<void> {
        const roadmap = this.roadmap();
        if (roadmap && this.downloadStatus() === 'idle') {
            this.downloadStatus.set('loading');
            try {
                const cleanGoal = roadmap.overallGoal
                    .replace(/[^a-z0-9]/gi, '_')
                    .slice(0, 30);
                const filename = `Roadmap_${cleanGoal}`;
                await this.pdfService.generateRoadmapPDF(roadmap, filename);
                this.downloadStatus.set('success');
                setTimeout(() => this.downloadStatus.set('idle'), 3000);
            } catch (e) {
                console.error(e);
                this.downloadStatus.set('error');
                setTimeout(() => this.downloadStatus.set('idle'), 3000);
            }
        }
    }

    startInterview(): void {
        this.router.navigate(['/interview/setup']);
    }

    sanitizeUrl(url: string): SafeUrl {
        if (!url) return '';
        // If url doesn't start with http:// or https://, prepend https://
        let safeUrl = url;
        if (!/^https?:\/\//i.test(url)) {
            safeUrl = 'https://' + url;
        }
        return this.sanitizer.bypassSecurityTrustUrl(safeUrl);
    }

    // Process **text** into <strong>text</strong>
    processText(text: string): any {
        if (!text) return '';
        const bolded = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        return this.sanitizer.bypassSecurityTrustHtml(bolded);
    }

    // Parse "Title|URL" or fallback to Google Search
    parseResource(res: string): { title: string; url: string } {
        if (res.includes('|')) {
            const [title, url] = res.split('|');
            return { title: title.trim(), url: url.trim() };
        }
        // Fallback: If it looks like a URL, use it
        if (/^https?:\/\//i.test(res) || res.includes('www.')) {
            return { title: 'External Resource', url: res };
        }
        // Fallback: It's just a title, Link to Google Search
        return {
            title: res,
            url: `https://www.google.com/search?q=${encodeURIComponent(res + ' programming')}`
        };
    }
}
