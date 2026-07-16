const fs = require('node:fs');
const path = require('node:path');

const databaseUrl = process.env.DATABASE_URL || '';

if (!databaseUrl.startsWith('file:')) {
  process.exit(0);
}

const configuredPath = databaseUrl.slice('file:'.length).split('?')[0];
if (!configuredPath || configuredPath === ':memory:') {
  process.exit(0);
}

const databasePath = path.isAbsolute(configuredPath)
  ? configuredPath
  : path.resolve(process.cwd(), 'prisma', configuredPath);

fs.mkdirSync(path.dirname(databasePath), { recursive: true });
fs.closeSync(fs.openSync(databasePath, 'a'));

