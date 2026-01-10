import { Injectable, inject, signal } from '@angular/core';
import { environment } from '@env/environment';
import { GoogleGenAI } from '@google/genai';
import { RateLimiterService } from './rate-limiter.service';
import { MOCK_SKILL_ANALYSIS, MOCK_ROADMAP } from '../data/mock-data';

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

  public get isConfigured(): boolean {
    return this.hasValidKey;
  }

  // ============================================================================================
  // GLOBAL DEMO SWITCH
  // Toggle this signal to 'false' to enable Production Mode (Real API calls)
  // When 'true', the app uses MOCK DATA for resume analysis, roadmap generation, and chat.
  // ============================================================================================
  public isDemoMode = signal(true);

  private rateLimiter = inject(RateLimiterService);

  constructor() {
    const apiKey = environment.geminiApiKey;

    // Debug logging for API Key detection
    console.log('GeminiService: Initializing...');
    console.log('GeminiService: Raw API Key exists?', !!apiKey);
    if (apiKey) {
      console.log('GeminiService: Key length:', apiKey.length);
      console.log('GeminiService: Key starts with:', apiKey.substring(0, 4) + '...');
      console.log('GeminiService: Key is default placeholder?', apiKey === 'YOUR_GEMINI_API_KEY');
    }

    // Check if key is real/valid (simplified check)
    this.hasValidKey = !!apiKey && apiKey !== 'YOUR_GEMINI_API_KEY' && apiKey.trim() !== '';

    if (this.hasValidKey) {
      console.log('✨ AI Mode: ONLINE (Using Real Gemini API)');
      this.genAI = new GoogleGenAI({ apiKey });
    } else {
      console.warn('⚠️ AI Mode: OFFLINE (Using Mock Data - No Valid API Key found)');
      console.warn('Reason: Key is empty, undefined, or matches default placeholder.');
      // Initialize with dummy to prevent crash if accessed, though we'll gate usage
      this.genAI = new GoogleGenAI({ apiKey: 'dummy' });
    }
  }





  async * analyzeResumeStream(resumeText: string): AsyncGenerator<string, SkillAnalysis> {
    if (this.isDemoMode()) { // Controlled Demo Mode
      // Simulate streaming for mock mode
      const mockData = this.getMockAnalysis();
      const messages = ["Analyzing resume...", "Identifying skills...", "Generating roadmap..."];
      for (const msg of messages) {
        yield msg + "\n";
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      // Yield the JSON data so it can be parsed by the component
      yield JSON.stringify(mockData);
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
      const mimeType = fileMatch![1]!;
      const base64Data = fileMatch![2]!;
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
        return JSON.parse(jsonMatch![0]!);
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

  async * chatStream(prompt: string, history: { role: 'user' | 'assistant', content: string }[]): AsyncGenerator<string, string> {
    if (this.isDemoMode() || !this.hasValidKey) {
      const response = "I am currently in Demo Mode. I can't generate real-time AI responses, but I'm ready to help you explore the features!";
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
    // Ensure content is never empty to prevent "ContentUnion is required" error
    const historyParts = history.map((h, index) => {
      let text = h.content;
      if (!text || text.trim().length === 0) {
        text = index % 2 === 0 ? '(Empty user input)' : '(No response generated)';
      }
      return {
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: text }]
      };
    });

    try {
      const chat = this.genAI.chats.create({
        model: 'gemini-2.5-flash',
        history: historyParts,
        config: {
          maxOutputTokens: 500,
        }
      });

      // Log context for debugging
      // console.log('Gemini Chat Start. History Size:', historyParts.length, 'Prompt:', prompt);

      // Construct a valid Content object
      const userMessage = {
        role: 'user',
        parts: [{ text: prompt }]
      };

      // Send the Content object directly
      const result = await chat.sendMessageStream(userMessage as any);

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
    if (this.isDemoMode()) { // Controlled Demo Mode
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
      "resources": ["Resource Title|URL (must be valid https link)"],
      "projects": ["Hands-on project ideas (use **bold** for emphasis)"]
    }
  ]
}

Focus on modern, in-demand technologies. Use real-time resources. 
IMPORTANT: For 'resources', you MUST provide a pipe-separated string with the Title and the URL, e.g., "MDN Docs|https://developer.mozilla.org".
If you cite a specific YouTube video or Article, provide the exact direct URL.
Return ONLY valid JSON.`;

    try {
      const result = await this.genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });

      const text = result.text || '';

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]!);
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
    return MOCK_SKILL_ANALYSIS;
  }

  private getMockRoadmap(): Roadmap {
    console.log('Using DEMO Roadmap Data');
    return MOCK_ROADMAP;
  }
}
