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

  // Fallback mock data
  private getMockAnalysis(): SkillAnalysis {
    return {
      currentSkills: ['JavaScript', 'HTML', 'CSS', 'React (Basic)'],
      outdatedSkills: ['jQuery', 'AngularJS', 'Bootstrap 3'],
      skillGaps: ['TypeScript', 'Modern React Hooks', 'State Management', 'Testing'],
      suggestedRoles: ['Frontend Developer', 'Full-Stack Developer', 'UI Engineer'],
      strengthAreas: ['Web fundamentals', 'Problem solving', 'User empathy'],
      improvementAreas: ['Modern frameworks', 'Cloud platforms', 'DevOps basics']
    };
  }

  private getMockRoadmap(): Roadmap {
    return {
      overallGoal: 'Transition to a modern frontend development role',
      estimatedHours: 80,
      weeks: [
        {
          week: 1,
          title: 'Modern JavaScript & TypeScript Foundations',
          goals: ['Master ES6+ features', 'Learn TypeScript basics'],
          topics: ['Arrow functions', 'Async/await', 'TypeScript types'],
          resources: ['MDN Web Docs', 'TypeScript Handbook'],
          projects: ['Build a TypeScript utility library']
        },
        {
          week: 2,
          title: 'React Ecosystem Deep Dive',
          goals: ['Master React Hooks', 'Learn state management'],
          topics: ['useState, useEffect', 'Context API', 'Custom hooks'],
          resources: ['React Official Docs', 'React Hooks Tutorial'],
          projects: ['Build a task management app with hooks']
        },
        {
          week: 3,
          title: 'Testing & Best Practices',
          goals: ['Learn testing fundamentals', 'Write clean code'],
          topics: ['Jest', 'React Testing Library', 'Code patterns'],
          resources: ['Testing JavaScript', 'Clean Code principles'],
          projects: ['Add tests to your existing projects']
        },
        {
          week: 4,
          title: 'Portfolio & Interview Prep',
          goals: ['Build portfolio', 'Practice interviews'],
          topics: ['GitHub best practices', 'Technical communication'],
          resources: ['Portfolio examples', 'Interview prep sites'],
          projects: ['Deploy 3 projects to portfolio']
        }
      ]
    };
  }
}
