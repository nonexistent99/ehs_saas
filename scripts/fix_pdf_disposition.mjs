import fs from 'fs';
import path from 'path';

const file = path.resolve('server/_core/index.ts');
let code = fs.readFileSync(file, 'utf-8');

// Replace standard pattern:
code = code.replace(/Content-Disposition",\s*`attachment;\s*filename="(.*?)"`/g, 'Content-Disposition", `inline; filename="$1"`');

fs.writeFileSync(file, code);
console.log('Fixed PDF dispositions');
