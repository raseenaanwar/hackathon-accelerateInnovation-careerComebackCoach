import { Component, OnInit, signal, HostListener, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Roadmap } from '@core/services/gemini.service';
import { StorageService } from '@core/services/storage.service';
import { PdfService } from '@core/services/pdf.service';

@Component({
    selector: 'app-roadmap',
    imports: [CommonModule],
    templateUrl: './roadmap.component.html',
    styles: [`
    :host {
      display: block;
      height: 100vh;
      overflow: hidden;
    }
  `]
})
export class RoadmapComponent implements OnInit {
    roadmap = signal<Roadmap | null>(null);
    selectedIndex = signal<number>(0);

    @ViewChildren('scrollContainer') scrollContainers?: QueryList<ElementRef>;

    today = new Date();
    downloadStatus = signal<'idle' | 'loading' | 'success' | 'error'>('idle');

    // 3D Config
    readonly THETA = 90; // Large gap to prevent overlap
    readonly RADIUS = 400; // Adjusted radius

    constructor(
        private router: Router,
        private storageService: StorageService,
        private pdfService: PdfService
    ) { }

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
        }
    }

    private lastScrollTime = 0;

    private lastInternalScrollTime = 0;

    onWheel(event: WheelEvent): void {
        const total = this.roadmap()?.weeks.length || 0;
        if (total === 0) return;

        const delta = event.deltaY;
        const index = this.selectedIndex();

        // Check if event target is inside the scrollable content of the *active* card
        let target = event.target as HTMLElement;
        let scrollContainer: HTMLElement | null = null;

        while (target && target !== event.currentTarget) {
            if (target.classList.contains('overflow-y-auto')) {
                scrollContainer = target;
                break;
            }
            target = target.parentElement as HTMLElement;
        }

        if (scrollContainer) {
            const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
            // More forgiving 'bottom' check
            const isAtTop = scrollTop <= 0;
            const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) <= 2;

            const now = Date.now();

            if (delta > 0) {
                // Scrolling Down
                if (!isAtBottom) {
                    this.lastInternalScrollTime = now; // Track that we successfully scrolled internally
                    event.stopPropagation();
                    return;
                }
            } else {
                // Scrolling Up
                if (!isAtTop) {
                    this.lastInternalScrollTime = now; // Track that we successfully scrolled internally
                    event.stopPropagation();
                    return;
                }
            }

            // AT BOUNDARY:
            // Check if we *just* finished scrolling internally (< 500ms ago). 
            // If so, this event is likely the "tail" of the scroll momentum. Block it.
            if (now - this.lastInternalScrollTime < 500) {
                event.preventDefault();
                event.stopPropagation();
                return;
            }
        }

        // --- CAROUSEL ROTATION LOGIC ---

        // 1. Boundary Checks: Allow default page scrolling if at edges of carousel
        if ((delta < 0 && index === 0) || (delta > 0 && index === total - 1)) {
            return;
        }

        // 2. Prevent default page scroll
        event.preventDefault();
        event.stopPropagation();

        // 3. Throttle Rotation
        const now = Date.now();
        if (now - this.lastScrollTime < 500) return;

        if (Math.abs(delta) > 10) {
            this.lastScrollTime = now;
            if (delta > 0) {
                this.rotate('next');
            } else {
                this.rotate('prev');
            }
        }
    }

    rotate(direction: 'next' | 'prev'): void {
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

            // Reset scroll position for the new card
            // Use setTimeout to allow any potential view updates, though with signals it might be synchronous or microtask based.
            // Direct DOM access is safe here.
            setTimeout(() => {
                const container = this.scrollContainers?.get(nextIndex);
                if (container) {
                    container.nativeElement.scrollTop = 0;
                }
            }, 0);
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

        // Vertical Drum Effect: Rotate around X axis
        const angle = offset * -this.THETA;
        const transform = `rotateX(${angle}deg) translateZ(${this.RADIUS}px)`;

        const dist = Math.abs(offset);

        // With 90deg gap, neighbors are perpendicular (top/bottom)
        // Hide them almost completely to remove "protrusion"
        const opacity = dist === 0 ? 1 : (dist <= 1 ? 0.2 : 0);

        // Only render active and immediate neighbors (faintly)
        const isVisible = dist <= 1;

        return {
            'transform': transform,
            'opacity': opacity.toString(),
            'pointer-events': dist === 0 ? 'auto' : 'none',
            'visibility': isVisible ? 'visible' : 'hidden',
            'z-index': (100 - dist).toString()
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
}
