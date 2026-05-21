import { mkdir, rm, cp } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execa } from 'execa';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const apps = [
  { name: 'admin', dir: 'admin-dashboard' },
  { name: 'fisher', dir: 'fisher-app' },
  { name: 'market', dir: 'marketplace' },
];

async function run() {
  const outDir = path.join(repoRoot, 'dist');

  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  for (const app of apps) {
    const cwd = path.join(repoRoot, app.dir);
    await execa('npm', ['run', 'build'], { cwd, stdio: 'inherit' });

    const from = path.join(cwd, 'dist');
    const to = path.join(outDir, app.name);
    await mkdir(to, { recursive: true });
    await cp(from, to, { recursive: true });
  }
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
