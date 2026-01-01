const fs = require('fs');
const path = require('path');

const targetPath = './src/environments';
const prodFile = path.join(targetPath, 'environment.prod.ts');
const baseFile = path.join(targetPath, 'environment.ts');

if (!fs.existsSync(targetPath)) {
    fs.mkdirSync(targetPath, { recursive: true });
}

const prodConfig = `
export const environment = {
  production: true,
  elevenLabsApiKey: '${process.env.ELEVENLABS_API_KEY || "YOUR_ELEVENLABS_API_KEY"}',
  geminiApiKey: '${process.env.GEMINI_API_KEY || "YOUR_GEMINI_API_KEY_HERE"}'
};
`;

const baseConfig = `
export const environment = {
  production: false,
  elevenLabsApiKey: '${process.env.ELEVENLABS_API_KEY || "YOUR_ELEVENLABS_API_KEY"}',
  geminiApiKey: '${process.env.GEMINI_API_KEY || "YOUR_GEMINI_API_KEY_HERE"}'
};
`;

fs.writeFileSync(prodFile, prodConfig);
console.log('✅ Production environment variables injected into environment.prod.ts');

fs.writeFileSync(baseFile, baseConfig);
console.log('✅ Base environment file injected into environment.ts');
