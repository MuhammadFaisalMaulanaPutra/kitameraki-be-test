const { readdirSync } = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const testsDirectory = path.join(__dirname, '..', 'dist', 'tests');
const testFiles = readdirSync(testsDirectory)
  .filter((file) => file.endsWith('.test.js'))
  .sort()
  .map((file) => path.join(testsDirectory, file));

if (testFiles.length === 0) {
  console.error('No compiled test files were found.');
  process.exit(1);
}

const result = spawnSync(process.execPath, ['--test', ...testFiles], {
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
