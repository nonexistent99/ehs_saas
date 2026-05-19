import fs from 'fs';
import path from 'path';

const filesToFix = [
  'client/src/_core/hooks/useAuth.ts',
  'client/src/App.tsx',
  'client/src/components/DashboardLayout.tsx',
  'client/src/main.tsx',
  'client/src/pages/Home.tsx'
];

for (const p of filesToFix) {
  const fullPath = path.resolve(p);
  if (!fs.existsSync(fullPath)) continue;
  let code = fs.readFileSync(fullPath, 'utf-8');
  
  // Remove import
  code = code.replace(/import\s*\{\s*getLoginUrl\s*(?:,\s*.*?)?\}\s*from\s*['"][./@]+const['"];?\n?/g, '');
  code = code.replace(/,\s*getLoginUrl/g, ''); // if imported with other things
  
  // Replace usage
  code = code.replace(/getLoginUrl\(\)/g, '"/login"');
  
  fs.writeFileSync(fullPath, code);
  console.log(`Fixed ${p}`);
}
