import { Injectable } from '@angular/core';
import { GoogleGenAI } from '@google/genai';

export interface SkillAnalysis {
  currentSkills: string[];
  outdatedSkills: string[];
  skillGaps: string[];
  suggestedRoles: string[];
  strengthAreas: string[];
  improvementAreas: string[];
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

  constructor() {
    // Initialize with API key - Replace with your actual key
    const apiKey = 'YOUR_GEMINI_API_KEY_HERE';
    this.genAI = new GoogleGenAI({ apiKey });
  }

  async analyzeResume(resumeText: string): Promise<SkillAnalysis> {
    const prompt = `You are a career coach specializing in helping women return to tech careers.
    
Analyze the following resume/skills and provide a structured assessment:

Resume/Skills:
${resumeText}

Provide your analysis in JSON format with these fields:
- currentSkills: Array of currently relevant skills
- outdatedSkills: Array of skills that need updating
- skillGaps: Array of missing skills for modern tech roles
- suggestedRoles: Array of suitable comeback roles
- strengthAreas: Array of areas where the candidate is strong
- improvementAreas: Array of areas that need work

Return ONLY valid JSON, no additional text.`;

    try {
      const result = await this.genAI.models.generateContent({
        model: 'gemini-pro',
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });

      const text = result.text || '';

      // Parse JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      throw new Error('Invalid response format');
    } catch (error) {
      console.error('Error analyzing resume:', error);
      // Return mock data as fallback
      return this.getMockAnalysis();
    }
  }

  async generateRoadmap(analysis: SkillAnalysis, targetWeeks: number = 4): Promise<Roadmap> {
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
        model: 'gemini-pro',
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
      improvementAreas: ['Modern framework ecosystems', 'Type safety (TypeScript)', 'Responsive design patterns']
    };
  }

  private getMockRoadmap(): Roadmap {
    console.log('Using DEMO Roadmap Data');
    // DEMO DATA: Mock roadmap result
    return {
      overallGoal: 'Modern Frontend Developer Career Comeback',
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
