import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Roadmap } from './gemini.service';

@Injectable({
    providedIn: 'root'
})
export class PdfService {
    private platformId = inject(PLATFORM_ID);
    private isBrowser = isPlatformBrowser(this.platformId);

    generateRoadmapPDF(roadmap: Roadmap, filename: string = 'Career_Roadmap'): Promise<void> {
        return new Promise((resolve) => {
            if (!this.isBrowser) {
                console.warn('Print is not available on the server.');
                resolve();
                return;
            }

            const template = this.generateRoadmapTemplate(roadmap);

            // Create an invisible iframe
            const iframe = document.createElement('iframe');
            iframe.style.position = 'fixed';
            iframe.style.right = '0';
            iframe.style.bottom = '0';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.border = '0';

            document.body.appendChild(iframe);

            const doc = iframe.contentWindow?.document;
            if (doc) {
                doc.open();
                doc.write(template);
                doc.title = filename;
                doc.close();

                // Wait for content to load then print
                setTimeout(() => {
                    iframe.contentWindow?.focus();

                    // Reliable filename hack: Change main document title temporarily
                    const originalTitle = document.title;
                    document.title = filename;

                    try {
                        iframe.contentWindow?.print();
                    } finally {
                        // Restore title after a small delay to ensure print dialog caught it
                        // (Though 'finally' executes immediately after print() returns (which is usually after dialog opens))
                        setTimeout(() => {
                            document.title = originalTitle;
                            document.body.removeChild(iframe);
                        }, 1000);
                    }

                    resolve();
                }, 500);
            } else {
                resolve();
            }
        });
    }

    private generateRoadmapTemplate(roadmap: Roadmap): string {
        const weeksHtml = roadmap.weeks.map(week => `
            <div class="week-container mt-8">
                <div class="week-header">
                    <h2>Week ${week.week} <span style="font-weight: 400; opacity: 0.8; margin: 0 8px;">|</span> ${week.title}</h2>
                </div>
                
                <div class="grid-container">
                    <div class="section">
                        <h3 style="color: #0d9488;">🎯 Goals</h3>
                        <ul class="styled-list">
                            ${week.goals.map(g => `<li>${g}</li>`).join('')}
                        </ul>
                    </div>
                    
                    <div class="section">
                        <h3 style="color: #0d9488;">📚 Topics</h3>
                        <div class="tags">
                            ${week.topics.map(t => `<span class="tag topic-tag">${t}</span>`).join('')}
                        </div>
                    </div>
                </div>

                <div class="grid-container" style="margin-top: 20px;">
                    <div class="section">
                        <h3 style="color: #7e22ce;">🔗 Resources</h3>
                        <ul class="styled-list">
                            ${week.resources.map(r => `<li>${r}</li>`).join('')}
                        </ul>
                    </div>
                    
                    <div class="section">
                        <h3 style="color: #7e22ce;">💻 Projects</h3>
                        <ul class="styled-list">
                            ${week.projects.map(p => `<li>${p}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            </div>
        `).join('');

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Career Comeback Roadmap</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
                    
                    @page {
                        margin: 20mm; /* Global Consistent Margins for EVERY page */
                        size: A4;
                    }

                    body {
                        font-family: 'Plus Jakarta Sans', sans-serif;
                        color: #334155;
                        line-height: 1.6;
                        margin: 0;
                        padding: 0;
                        background: white;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }

                    h1, h2, h3 { margin: 0; }
                    
                    /* Cover Page - Fits inside the 20mm margin */
                    .cover-page {
                        /* 297mm (A4) - 40mm (margins) = ~257mm available height */
                        min-height: 90vh; 
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;
                        text-align: center;
                        background: radial-gradient(circle at top right, #f0fdfa 0%, #fff 40%),
                                    radial-gradient(circle at bottom left, #f3e8ff 0%, #fff 40%);
                        page-break-after: always;
                        padding: 40px;
                        box-sizing: border-box;
                        border-radius: 24px; /* Rounded corners for the "Report Cover" look */
                        border: 1px solid #e2e8f0;
                    }
                    
                    .brand-logo-img {
                        width: 120px;
                        height: auto;
                        margin-bottom: 24px;
                        display: block;
                    }

                    .cover-title {
                        font-size: 42px;
                        font-weight: 800;
                        color: #0f172a;
                        margin-bottom: 16px;
                        letter-spacing: -0.02em;
                        background: linear-gradient(135deg, #0d9488, #7e22ce);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                    }

                    .cover-subtitle {
                        font-size: 20px;
                        color: #64748b;
                        font-weight: 300;
                        margin-bottom: 48px;
                        max-width: 500px;
                        line-height: 1.5;
                    }

                    .roadmap-card {
                        background: white;
                        padding: 32px;
                        border-radius: 20px;
                        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
                        border: 1px solid #e2e8f0;
                        max-width: 450px;
                        width: 100%;
                    }

                    .roadmap-goal {
                        font-size: 18px;
                        font-weight: 600;
                        color: #334155;
                        margin-bottom: 16px;
                        border-bottom: 1px solid #f1f5f9;
                        padding-bottom: 16px;
                    }

                    .roadmap-meta {
                        display: flex;
                        justify-content: space-around;
                        font-size: 14px;
                        color: #64748b;
                        font-weight: 500;
                    }

                    .cover-footer {
                        margin-top: auto;
                        padding-top: 40px;
                        font-size: 12px;
                        color: #94a3b8;
                    }
                    
                    /* Header Styling - Starts on Page 2 */
                    .header {
                        margin-bottom: 40px;
                        padding-bottom: 20px;
                        border-bottom: 3px solid #0d9488;
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-end;
                    }
                    
                    .header-content h1 { 
                        font-size: 28px; 
                        color: #0f172a; 
                        font-weight: 800;
                        margin-bottom: 8px;
                    }
                    
                    .header-content p { 
                        color: #64748b; 
                        font-size: 14px; 
                        margin: 0;
                    }

                    .header-meta {
                        text-align: right;
                        background: #f8fafc;
                        padding: 8px 12px;
                        border-radius: 8px;
                        border: 1px solid #e2e8f0;
                    }

                    .meta-item {
                        display: block;
                        font-size: 12px;
                        font-weight: 600;
                        color: #475569;
                    }
                    
                    /* Week Card Styling */
                    .week-container {
                        border: 1px solid #cbd5e1;
                        border-radius: 12px;
                        margin-bottom: 24px;
                        overflow: hidden;
                        page-break-inside: avoid;
                        box-shadow: 0 2px 4px 0 rgba(0,0,0,0.05);
                        background: white;
                    }
                    
                    .week-header {
                        background: #f0fdfa;
                        padding: 12px 20px;
                        border-bottom: 1px solid #ccfbf1;
                    }
                    
                    .week-header h2 {
                        font-size: 18px;
                        color: #115e59;
                        font-weight: 700;
                    }
                    
                    /* Grid Layout */
                    .grid-container {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 20px;
                        padding: 16px 20px;
                    }
                    
                    .section h3 {
                        font-size: 13px;
                        text-transform: uppercase;
                        letter-spacing: 0.05em;
                        font-weight: 700;
                        margin-bottom: 10px;
                        display: flex;
                        align-items: center;
                    }
                    
                    /* List Styling */
                    .styled-list {
                        margin: 0;
                        padding: 0;
                        list-style: none;
                    }
                    
                    .styled-list li { 
                        margin-bottom: 6px;
                        padding-left: 14px;
                        position: relative;
                        font-size: 13px;
                        color: #475569;
                    }
                    
                    .styled-list li::before {
                        content: "•";
                        color: #94a3b8;
                        position: absolute;
                        left: 0;
                        font-weight: bold;
                    }

                    /* Tags */
                    .tags { display: flex; flex-wrap: wrap; gap: 6px; }
                    
                    .tag {
                        padding: 3px 8px;
                        border-radius: 4px;
                        font-size: 11px;
                        font-weight: 500;
                    }
                    
                    .topic-tag {
                        background: #f1f5f9;
                        color: #475569;
                        border: 1px solid #e2e8f0;
                    }

                    /* Footer */
                    .footer {
                        margin-top: 30px;
                        padding-top: 15px;
                        border-top: 1px solid #e2e8f0;
                        text-align: center;
                    }
                    
                    .footer-text {
                        font-size: 11px;
                        color: #94a3b8;
                        font-weight: 500;
                    }
                </style>
            </head>
            <body>
                <!-- Cover Page -->
                <div class="cover-page">
                    <img src="/assets/images/logo-icon.jpeg" class="brand-logo-img" alt="Logo" />
                    <h1 class="cover-title">Career Comeback Coach</h1>
                    <p class="cover-subtitle">Your personalized path back to professional success.</p>
                    
                    <div class="roadmap-card">
                        <div class="roadmap-goal">${roadmap.overallGoal}</div>
                        <div class="roadmap-meta">
                            <span>⏱️ ${roadmap.estimatedHours} Hours</span>
                            <span>📅 ${roadmap.weeks.length} Weeks</span>
                        </div>
                    </div>

                    <div class="cover-footer">
                        Generated on ${new Date().toLocaleDateString()}
                    </div>
                </div>

                <!-- Content Pages (starts on Page 2 automatically due to page-break) -->
                <div class="header">
                    <h2 style="font-size: 24px; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 20px;">
                        Detailed Roadmap
                    </h2>
                </div>

                ${weeksHtml}

                <div class="footer">
                    <p class="footer-text">Career Comeback Coach • Page 2+</p>
                </div>
            </body>
            </html>
        `;
    }
}