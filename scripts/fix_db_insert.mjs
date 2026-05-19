import fs from 'fs';
import path from 'path';

const file = path.resolve('server/db.ts');
let ts = fs.readFileSync(file, 'utf-8');

// Replace standard pattern:
// const result = await db.insert(TABLE).values(data);
// return (result as any)[0]?.insertId as number;
// TO:
// const result = await db.insert(TABLE).values(data).returning({ id: TABLE.id });
// return result[0]?.id as number;

ts = ts.replace(/const result = await db\.insert\((.*?)\)\.values\((.*?)\);\s*return \(result as any\)\[0\]\?\.insertId(?: as number)?;/g, (match, table, data) => {
    return `const result = await db.insert(${table}).values(${data}).returning({ id: ${table}.id });\n  return result[0]?.id;`;
});

// Also replace the one manual one
ts = ts.replace(/const result = await db\.insert\(users\)\.values\(data\);\s*const insertId = \(result as any\)\[0\]\?\.insertId;/g, 
  `const result = await db.insert(users).values(data).returning({ id: users.id });\n  const insertId = result[0]?.id;`);

fs.writeFileSync(file, ts);
console.log('Fixed DB inserts');
