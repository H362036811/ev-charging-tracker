import { execSync } from 'child_process';
import { cpSync, rmSync, existsSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const distDir = join(process.cwd(), 'dist');
const ghPagesDir = join(process.cwd(), '.gh-pages-deploy');

// Clean
if (existsSync(ghPagesDir)) rmSync(ghPagesDir, { recursive: true });

// Clone gh-pages branch
console.log('Cloning gh-pages...');
execSync('git clone --branch gh-pages --single-branch --depth 1 https://github.com/H362036811/ev-charging-tracker.git .gh-pages-deploy', { stdio: 'pipe' });

// Remove all tracked files (keep .git)
console.log('Cleaning old files...');
const files = readdirSync(ghPagesDir).filter(f => f !== '.git');
for (const f of files) {
  rmSync(join(ghPagesDir, f), { recursive: true });
}

// Copy new dist files
console.log('Copying new build...');
cpSync(distDir, ghPagesDir, { recursive: true });

// Add .nojekyll
writeFileSync(join(ghPagesDir, '.nojekyll'), '');

// Commit and push
console.log('Committing...');
execSync('git config user.email "362036811@qq.com"', { cwd: ghPagesDir, stdio: 'pipe' });
execSync('git config user.name "deploy"', { cwd: ghPagesDir, stdio: 'pipe' });
execSync('git add -A', { cwd: ghPagesDir, stdio: 'pipe' });

try {
  execSync('git commit -m "Deploy: update with latest build"', { cwd: ghPagesDir, stdio: 'pipe' });
  console.log('Pushing to gh-pages...');
  execSync('git push origin gh-pages', { cwd: ghPagesDir, stdio: 'pipe' });
  console.log('Deploy complete!');
} catch (e) {
  // Check if there are actually changes
  const status = execSync('git status --porcelain', { cwd: ghPagesDir, encoding: 'utf8' });
  if (!status.trim()) {
    console.log('No changes to deploy - already up to date');
  } else {
    console.log('Deploy failed:', e.message);
  }
}

// Cleanup
rmSync(ghPagesDir, { recursive: true });
