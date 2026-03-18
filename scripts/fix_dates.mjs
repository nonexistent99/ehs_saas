import fs from 'fs';
import path from 'path';

const file = path.resolve('server/routers.ts');
let code = fs.readFileSync(file, 'utf-8');

// Replace `date: date ? new Date(date) : undefined` with `date`
code = code.replace(/date:\s*date\s*\?\s*new Date\(date\)\s*:\s*undefined/g, 'date: date ? date : undefined');

// Replace `deliveredAt: deliveredAt ? new Date(deliveredAt) : undefined`
code = code.replace(/deliveredAt:\s*deliveredAt\s*\?\s*new Date\(deliveredAt\)\s*:\s*undefined/g, 'deliveredAt: deliveredAt ? deliveredAt : undefined');

// Replace `validUntil: validUntil ? new Date(validUntil) : undefined`
code = code.replace(/validUntil:\s*validUntil\s*\?\s*new Date\(validUntil\)\s*:\s*undefined/g, 'validUntil: validUntil ? validUntil : undefined');

// Replace `date: new Date(date)` with `date`
code = code.replace(/date:\s*new Date\(date\)/g, 'date');

fs.writeFileSync(file, code);
console.log('Fixed dates in routers.ts');
