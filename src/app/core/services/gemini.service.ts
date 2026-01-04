import { Injectable, inject } from '@angular/core';
import { environment } from '@env/environment';
import { GoogleGenAI } from '@google/genai';
import { RateLimiterService } from './rate-limiter.service';

export interface SkillAnalysis {
  currentSkills: string[];
  outdatedSkills: string[];
  skillGaps: string[];
  suggestedRoles: string[];
  strengthAreas: string[];
  improvementAreas: string[];
  source?: string;
  error?: string;
}

export interface RoadmapWeek {
  week: number;
  title: string;
  goals: string[];
  topics: string[];
  resources: string[];
  projects: string[];
}

export interface Roadmap {
  weeks: RoadmapWeek[];
  overallGoal: string;
  estimatedHours: number;
  source?: string;
  restoredFrom?: string;
}

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private genAI: GoogleGenAI;
  private hasValidKey = false;

  private rateLimiter = inject(RateLimiterService);

  constructor() {
    const apiKey = environment.geminiApiKey;
    // Check if key is real/valid (simplified check)
    this.hasValidKey = !!apiKey && apiKey !== 'YOUR_GEMINI_API_KEY' && apiKey.trim() !== '';

    if (this.hasValidKey) {
      console.log('✨ AI Mode: ONLINE (Using Real Gemini API)');
      this.genAI = new GoogleGenAI({ apiKey });
    } else {
      console.warn('⚠️ AI Mode: OFFLINE (Using Mock Data - No Valid API Key found)');
      // Initialize with dummy to prevent crash if accessed, though we'll gate usage
      this.genAI = new GoogleGenAI({ apiKey: 'dummy' });
    }
  }

  async *analyzeResumeStream(resumeText: string): AsyncGenerator<string, SkillAnalysis> {
    if (!this.hasValidKey) {
      // Simulate streaming for mock mode
      const mockData = this.getMockAnalysis();
      const messages = ["Analyzing resume...", "Identifying skills...", "Generating roadmap..."];
      for (const msg of messages) {
        yield msg + "\n";
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      return mockData;
    }

    const limitKey = 'gemini-analysis';
    if (!this.rateLimiter.isAllowed(limitKey, 3, 60 * 1000)) {
      throw new Error('Rate limit exceeded. Please wait a moment.');
    }

    const prompt = `You are a career coach specializing in helping women return to tech careers.
    
    Analyze the following resume/skills. 
    
    Phase 1: Provide a brief, encouraging professional summary and analysis of their current standing in natural language (approx 3-4 sentences). Label this section "ANALYSIS:".
    
    Phase 2: Provide the structured data in JSON format. Label this section "JSON_DATA:".

    Resume/Skills:
    (See attached content or text below)
    
    Provide your analysis in JSON format with these fields:
    - currentSkills: Array of currently relevant skills
    - outdatedSkills: Array of skills that need updating
    - skillGaps: Array of missing skills for modern tech roles
    - suggestedRoles: Array of suitable comeback roles
    - strengthAreas: Array of areas where the candidate is strong
    - improvementAreas: Array of areas that need work
    
    IMPORTANT: If the input provided does not appear to be a resume or a description of professional skills (e.g., if it is gibberish, unrelated text, or too short to be useful), return ONLY this JSON:
    {
      "error": "The provided input does not appear to be a valid resume or skills description. Please try again with relevant professional details.",
      "currentSkills": [],
      "outdatedSkills": [],
      "skillGaps": [],
      "suggestedRoles": [],
      "strengthAreas": [],
      "improvementAreas": []
    }
    `;

    // Check if input is a file data string
    const fileMatch = resumeText.match(/^\[FILE_DATA:(.*?):(.*?)\]$/);
    let parts: any[] = [];

    if (fileMatch) {
      const mimeType = fileMatch[1];
      const base64Data = fileMatch[2];
      parts = [
        { text: prompt },
        { inlineData: { mimeType: mimeType, data: base64Data } }
      ];
    } else {
      parts = [{ text: prompt + '\n\nResume/Skills:\n' + resumeText }];
    }

    try {
      const result = await this.genAI.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: parts }]
      });

      let fullText = '';

      for await (const chunk of result) {
        let chunkText = '';
        const rawText = (chunk as any).text;
        if (typeof rawText === 'function') {
          chunkText = rawText.call(chunk);
        } else {
          chunkText = rawText || '';
        }

        if (chunkText) {
          // console.log('Gemini Stream Chunk:', chunkText.substring(0, 20) + '...');
          fullText += chunkText;
          yield chunkText;
        }
      }

      // Parse final JSON
      const jsonMatch = fullText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Fallback or error if no JSON found
      throw new Error('No validity JSON found in response');

    } catch (error) {
      console.error('Error analyzing resume:', error);
      return this.getMockAnalysis();
    }
  }

  // Backwards compatibility / non-streaming version if needed (can be removed or kept)
  async analyzeResume(resumeText: string): Promise<SkillAnalysis> {
    // Reusing the stream method but just waiting for final result for legacy calls
    const generator = this.analyzeResumeStream(resumeText);
    let fullText = '';
    try {
      for await (const chunk of generator) {
        fullText += chunk;
      }
      const jsonMatch = fullText.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      return this.getMockAnalysis();
    } catch (e) {
      console.error('Error in analyzeResume (non-streaming wrapper):', e);
      return this.getMockAnalysis();
    }
  }

  async *chatStream(prompt: string, history: { role: 'user' | 'assistant', content: string }[]): AsyncGenerator<string, string> {
    if (!this.hasValidKey) {
      const response = "I am currently in Demo Mode (Offline). I can't generate real-time AI responses, but I'm ready to help once you connect an API key!";
      const chunks = response.split(' ');
      for (const chunk of chunks) {
        yield chunk + ' ';
        await new Promise(r => setTimeout(r, 50));
      }
      return response;
    }

    // Limit rate
    if (!this.rateLimiter.isAllowed('gemini-chat', 5, 60 * 1000)) {
      throw new Error('Rate limit exceeded.');
    }

    // Convert history to Gemini format
    // Note: Gemini roles are 'user' and 'model'
    const historyParts = history.map(h => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.content }]
    }));

    try {
      const chat = this.genAI.chats.create({
        model: 'gemini-2.5-flash',
        history: historyParts,
        config: {
          maxOutputTokens: 500,
        }
      });

      const result = await chat.sendMessageStream({ parts: [{ text: prompt }] } as any);

      let fullResponse = '';
      for await (const chunk of result) {
        let chunkText = '';
        const rawText = (chunk as any).text;
        // Apply same robust extraction as analysis
        if (typeof rawText === 'function') {
          chunkText = rawText.call(chunk);
        } else {
          chunkText = rawText || '';
        }

        if (chunkText) {
          fullResponse += chunkText;
          yield chunkText;
        }
      }
      return fullResponse;

    } catch (error) {
      console.error('Chat error:', error);
      yield "I'm having trouble connecting right now. Let's try again.";
      return "Error";
    }
  }

  async generateRoadmap(analysis: SkillAnalysis, targetWeeks: number = 4): Promise<Roadmap> {
    if (!this.hasValidKey) {
      return this.getMockRoadmap();
    }

    const prompt = `You are a career coach creating a ${targetWeeks}-week comeback roadmap for a woman returning to tech.

Based on this skill analysis:
- Current Skills: ${analysis.currentSkills.join(', ')}
- Skill Gaps: ${analysis.skillGaps.join(', ')}
- Suggested Roles: ${analysis.suggestedRoles.join(', ')}

Create a detailed ${targetWeeks}-week learning roadmap in JSON format:
{
  "overallGoal": "Brief description of the roadmap goal",
  "estimatedHours": total estimated hours needed,
  "weeks": [
    {
      "week": 1,
      "title": "Week title",
      "goals": ["Goal 1", "Goal 2"],
      "topics": ["Topic to learn"],
      "resources": ["Resource links/names from Google Search"],
      "projects": ["Hands-on project ideas"]
    }
  ]
}

Focus on modern, in-demand technologies. Use real-time resources. Return ONLY valid JSON.`;

    try {
      const result = await this.genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });

      const text = result.text || '';

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      throw new Error('Invalid response format');
    } catch (error) {
      console.error('Error generating roadmap:', error);
      return this.getMockRoadmap();
    }
  }

  // =========================================================================
  // DEMO DATA METHODS
  // Replace these with actual API error handling or remove in production
  // =========================================================================

  private getMockAnalysis(): SkillAnalysis {
    console.log('Using DEMO Skill Analysis Data');
    // DEMO DATA: Mock analysis result
    return {
      currentSkills: ['JavaScript ES5', 'HTML5', 'CSS3', 'Basic React', 'Git'],
      outdatedSkills: ['jQuery', 'Bootstrap 3', 'Float-based layouts', 'AngularJS 1.x'],
      skillGaps: ['TypeScript', 'Modern React (Hooks, Next.js)', 'Tailwind CSS', 'State Management (Redux/Zustand)', 'CI/CD Basics'],
      suggestedRoles: ['Frontend Developer', 'UI Engineer', 'Junior Full Stack Developer'],
      strengthAreas: ['Strong understanding of web fundamentals', 'Experience with version control', 'Problem-solving mindset'],
      improvementAreas: ['Modern framework ecosystems', 'Type safety (TypeScript)', 'Responsive design patterns'],
      source: 'mock'
    };
  }

  private getMockRoadmap(): Roadmap {
    console.log('Using DEMO Roadmap Data');
    // DEMO DATA: Mock roadmap result
    return {
      overallGoal: 'Modern Frontend Developer Career Comeback',
      source: 'mock',
      estimatedHours: 120,
      weeks: [
        {
          week: 1,
          title: 'Foundation Refresher & Modern Standards',
          goals: ['Transition from ES5 to ES6+', 'Master semantic HTML', 'Understand modern CSS layouts'],
          topics: ['Arrow Functions & Destructuring', 'Flexbox & CSS Grid', 'Semantic Web'],
          resources: ['MDN Web Docs', 'JavaScript.info', 'CSS-Tricks Flexbox Guide'],
          projects: ['Refactor a legacy landing page to semantic HTML & Flexbox']
        },
        {
          week: 2,
          title: 'TypeScript & Modern React',
          goals: ['Understand Type Safety', 'Learn Functional Components', 'Master Hooks'],
          topics: ['TypeScript Interfaces & Types', 'React useState & useEffect', 'Component Lifecycle'],
          resources: ['TypeScript Official Handbook', 'React.dev'],
          projects: ['Build a specialized Todo App with TypeScript and Hooks']
        },
        {
          week: 3,
          title: 'State Management & Styling',
          goals: ['Manage complex application state', 'Implement modern styling'],
          topics: ['Context API vs Redux', 'Tailwind CSS Fundamentals', 'Responsive Design'],
          resources: ['Tailwind CSS Docs', 'Redux Toolkit Quick Start'],
          projects: ['Create a Weather Dashboard using public API and Tailwind']
        },
        {
          week: 4,
          title: 'Deployments & Professional Practices',
          goals: ['Learn CI/CD pipelines', 'Polish portfolio', 'Mock interviews'],
          topics: ['Git branching strategies', 'Vercel/Netlify Deployment', 'Code Review Etiquette'],
          resources: ['GitHub Actions Docs', 'Vercel Deployment Guide'],
          projects: ['Deploy your Portfolio and Weather App']
        }
      ]
    };
  }
}
