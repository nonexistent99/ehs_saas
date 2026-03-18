import fs from 'fs';
import path from 'path';

const schemaPath = path.resolve('drizzle/schema.ts');
let schema = fs.readFileSync(schemaPath, 'utf-8');

// Imports
schema = schema.replace('drizzle-orm/mysql-core', 'drizzle-orm/pg-core');
schema = schema.replace(/mysqlTable/g, 'pgTable');
schema = schema.replace(/mysqlEnum/g, 'varchar');

// Types
schema = schema.replace(/int\(/g, 'integer(');

// Autoincrement: integer auto increment in PG doesn't exist, we use serial, but in Drizzle pg-core it's serial('id') or integer('id').generatedAlwaysAsIdentity() depending on version. Wait, in older versions of drizzle it was `serial("id")`. Let's import `serial` and use that for autoincrement integer primary keys.
// Actually, in drizzle-orm/pg-core, `serial('id')` is the standard way.

schema = schema.replace(/integer\("([^"]+)"\)\.autoincrement\(\)/g, "serial(\"$1\")");
schema = schema.replace(/integer\('([^']+)'\)\.autoincrement\(\)/g, "serial('$1')");

// We need to add serial and integer to the imports.
schema = schema.replace(
  'import {\n  int,',
  'import {\n  integer,\n  serial,'
);

// For enums, varchar requires { length: X }. Currently they are varchar("name", ["a", "b"]). Let's regex replace.
// regex: varchar\("([^"]+)",\s*\[(.*?)\]\)  => varchar("$1", { length: 50 }).$type<$2>()
// wait, the array elements inside are strings, we need to convert ["a", "b"] to "a" | "b" for the $type.
schema = schema.replace(/varchar\("([^"]+)",\s*\[(.*?)\]\)/g, (match, p1, p2) => {
    const types = p2.split(',').map(s => s.trim().replace(/"/g, '"')).join(' | ');
    return `varchar("${p1}", { length: 50 }).$type<${types}>()`;
});

// `onUpdateNow()` doesn't exist in pg-core `timestamp()`. It's a MySQL feature. In Postgres, you typically use a trigger, or Drizzle $defaultFn(() => new Date()) / $onUpdateFn(() => new Date()).
// Let's replace `.onUpdateNow()` with `.$onUpdateFn(() => new Date())`
schema = schema.replace(/\.onUpdateNow\(\)/g, ".$onUpdateFn(() => new Date())");

// Replace mysqlEnum which was already replaced to varchar
fs.writeFileSync(schemaPath, schema);
console.log('Schema converted');
