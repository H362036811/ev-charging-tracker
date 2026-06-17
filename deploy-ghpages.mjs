import { execSync } from 'child_process';
import { cpSync, rmSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const distDir = join(process.cwd(), 'dist');
const tempDir = join(process.cwd(), '.gh-pages-temp');

// Clean temp dir
if (existsSync(tempDir)) rmSync(tempDir, { recursive: true });
mkdirSync(tempDir);

// Copy dist contents to temp
cpSync(distDir, tempDir, { recursive: true });

// Clone gh-pages branch into temp repo
const ghPagesDir = join(process.cwd(), '.gh-pages-repo');
if (existsSync(ghPagesDir)) rmSync(ghPagesDir, { recursive: true });

execSync('git clone --branch gh-pages --single-branch https://github.com/H362036811/ev-charging-tracker.git .gh-pages-repo', { stdio: 'inherit' });

// Clear all files in gh-pages repo (except .git)
execSync('git rm -rf .', { cwd: ghPagesDir, stdio: 'inherit' });

// Copy new files
cpSync(tempDir, ghPagesDir, { recursive: true });

// Commit and push
execSync('git config user.email "362036811@qq.com"', { cwd: ghPagesDir, stdio: 'inherit' });
execSync('git config user.name "deploy"', { cwd: ghPagesDir, stdio: 'inherit' });
execSync('git add -A', { cwd: ghPagesDir, stdio: 'inherit' });
execSync('git commit -m "Deploy: update gh-pages with latest build"', { cwd: ghPagesDir, stdio: 'inherit' });
execSync('git push origin gh-pages', { cwd: ghPagesDir, stdio: 'inherit' });

// Cleanup
rmSync(tempDir, { recursive: true });
rmSync(ghPagesDir, { recursive: true });

console.log('Deploy complete!');
