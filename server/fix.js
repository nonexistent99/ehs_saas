const fs = require('fs');
let code = fs.readFileSync('server/pdfTemplates.ts', 'utf8');
code = code.split('\\`').join('`');
fs.writeFileSync('server/pdfTemplates.ts', code);
console.log('Fixed backticks.');
