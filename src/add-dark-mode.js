import fs from 'fs';

const appTsxPath = './src/App.tsx';
let content = fs.readFileSync(appTsxPath, 'utf8');

const replacements = [
  { pattern: /(?<!dark:)bg-white(?!\s*\/\s*\d+)/g, replacement: 'bg-white dark:bg-[#111]' },
  { pattern: /(?<!dark:)bg-gray-50(?!\s*\/\s*\d+)/g, replacement: 'bg-gray-50 dark:bg-black' },
  { pattern: /(?<!dark:)bg-gray-100(?!\s*\/\s*\d+)/g, replacement: 'bg-gray-100 dark:bg-[#1a1a1a]' },
  { pattern: /(?<!dark:)bg-gray-200(?!\s*\/\s*\d+)/g, replacement: 'bg-gray-200 dark:bg-[#222]' },
  
  { pattern: /(?<!dark:)text-gray-900(?!\s*\/\s*\d+)/g, replacement: 'text-gray-900 dark:text-gray-50' },
  { pattern: /(?<!dark:)text-gray-800(?!\s*\/\s*\d+)/g, replacement: 'text-gray-800 dark:text-gray-100' },
  { pattern: /(?<!dark:)text-gray-700(?!\s*\/\s*\d+)/g, replacement: 'text-gray-700 dark:text-gray-200' },
  { pattern: /(?<!dark:)text-gray-600(?!\s*\/\s*\d+)/g, replacement: 'text-gray-600 dark:text-gray-300' },
  { pattern: /(?<!dark:)text-gray-500(?!\s*\/\s*\d+)/g, replacement: 'text-gray-500 dark:text-gray-400' },
  { pattern: /(?<!dark:)text-black(?!\s*\/\s*\d+)/g, replacement: 'text-black dark:text-white' },

  { pattern: /(?<!dark:)border-gray-100(?!\s*\/\s*\d+)/g, replacement: 'border-gray-100 dark:border-[#222]' },
  { pattern: /(?<!dark:)border-gray-200(?!\s*\/\s*\d+)/g, replacement: 'border-gray-200 dark:border-[#333]' },
  { pattern: /(?<!dark:)border-gray-300(?!\s*\/\s*\d+)/g, replacement: 'border-gray-300 dark:border-[#444]' },
  
  { pattern: /(?<!dark:)divide-gray-100(?!\s*\/\s*\d+)/g, replacement: 'divide-gray-100 dark:divide-[#222]' },
  { pattern: /(?<!dark:)divide-gray-200(?!\s*\/\s*\d+)/g, replacement: 'divide-gray-200 dark:divide-[#333]' },
];

for (const { pattern, replacement } of replacements) {
  content = content.replace(pattern, replacement);
}

fs.writeFileSync(appTsxPath, content, 'utf8');
console.log('App.tsx dark mode classes added');