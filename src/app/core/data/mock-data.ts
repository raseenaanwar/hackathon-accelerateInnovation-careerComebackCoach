import { Roadmap, SkillAnalysis } from '../services/gemini.service';

export const MOCK_SKILL_ANALYSIS: SkillAnalysis = {
    currentSkills: ['JavaScript ES5', 'HTML5', 'CSS3', 'Basic React', 'Git'],
    outdatedSkills: ['jQuery', 'Bootstrap 3', 'Float-based layouts', 'AngularJS 1.x'],
    skillGaps: ['TypeScript', 'Modern React (Hooks, Next.js)', 'Tailwind CSS', 'State Management (Redux/Zustand)', 'CI/CD Basics'],
    suggestedRoles: ['Frontend Developer', 'UI Engineer', 'Junior Full Stack Developer'],
    strengthAreas: ['Strong understanding of web fundamentals', 'Experience with version control', 'Problem-solving mindset'],
    improvementAreas: ['Modern framework ecosystems', 'Type safety (TypeScript)', 'Responsive design patterns'],
    source: 'mock'
};

export const MOCK_ROADMAP: Roadmap = {
    overallGoal: 'Modern Frontend Developer Career Comeback',
    source: 'mock',
    estimatedHours: 120,
    weeks: [
        {
            week: 1,
            title: 'Foundation Refresher & Modern Standards',
            goals: ['Transition from ES5 to ES6+', 'Master semantic HTML', 'Understand modern CSS layouts'],
            topics: ['Arrow Functions & Destructuring', 'Flexbox & CSS Grid', 'Semantic Web'],
            resources: [
                'MDN Web Docs|https://developer.mozilla.org',
                'JavaScript.info|https://javascript.info',
                'CSS-Tricks Flexbox Guide|https://css-tricks.com/snippets/css/a-guide-to-flexbox'
            ],
            projects: ['Refactor a legacy landing page to semantic HTML & Flexbox']
        },
        {
            week: 2,
            title: 'TypeScript & Modern React',
            goals: ['Understand Type Safety', 'Learn Functional Components', 'Master Hooks'],
            topics: ['TypeScript Interfaces & Types', 'React useState & useEffect', 'Component Lifecycle'],
            resources: [
                'TypeScript Official Handbook|https://www.typescriptlang.org/docs/',
                'React.dev|https://react.dev'
            ],
            projects: ['Build a specialized Todo App with TypeScript and Hooks']
        },
        {
            week: 3,
            title: 'State Management & Styling',
            goals: ['Manage complex application state', 'Implement modern styling'],
            topics: ['Context API vs Redux', 'Tailwind CSS Fundamentals', 'Responsive Design'],
            resources: [
                'Tailwind CSS Docs|https://tailwindcss.com/docs',
                'Redux Toolkit Quick Start|https://redux-toolkit.js.org/introduction/getting-started'
            ],
            projects: ['Create a Weather Dashboard using public API and Tailwind']
        },
        {
            week: 4,
            title: 'Deployments & Professional Practices',
            goals: ['Learn CI/CD pipelines', 'Polish portfolio', 'Mock interviews'],
            topics: ['Git branching strategies', 'Vercel/Netlify Deployment', 'Code Review Etiquette'],
            resources: [
                'GitHub Actions Docs|https://docs.github.com/en/actions',
                'Vercel Deployment Guide|https://vercel.com/docs'
            ],
            projects: ['Deploy your Portfolio and Weather App']
        }
    ]
};
