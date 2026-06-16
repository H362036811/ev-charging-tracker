#!/usr/bin/env node
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const isWindows = os.platform() === 'win32';
const ALLOWED_COMMANDS = new Set(['vercel', 'npm', 'pnpm', 'yarn']);
function log(msg) { console.error(msg); }
function commandExists(cmd) {
  if (!ALLOWED_COMMANDS.has(cmd)) throw new Error(`Command not in whitelist: ${cmd}`);
  try {
    if (isWindows) { const result = spawnSync('where', [cmd], { stdio: 'ignore' }); return result.status === 0; }
    else { const result = spawnSync('sh', ['-c', `command -v "$1"`, '--', cmd], { stdio: 'ignore' }); return result.status === 0; }
  } catch { return false; }
}
function getCommandOutput(cmd, args) {
  try { const result = spawnSync(cmd, args, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'], shell: isWindows }); return result.status === 0 ? (result.stdout || '').trim() : null; } catch { return null; }
}
function parseArgs(args) {
  const result = { projectPath: '.', prod: true, yes: false, skipBuild: false };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--prod') result.prod = true;
    else if (arg === '--yes' || arg === '-y') result.yes = true;
    else if (arg === '--skip-build') result.skipBuild = true;
    else if (!arg.startsWith('-')) result.projectPath = arg;
  }
  return result;
}
function checkVercelInstalled() {
  if (!commandExists('vercel')) { log('Error: Vercel CLI is not installed'); process.exit(1); }
  log(`Vercel CLI version: ${getCommandOutput('vercel', ['--version']) || 'unknown'}`);
}
function checkLoginStatus() {
  try { const result = spawnSync('vercel', ['whoami'], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], shell: isWindows }); const output = (result.stdout || '').trim(); if (result.status === 0 && output && !output.includes('Error') && !output.includes('not logged in')) { log(`Logged in as: ${output}`); return true; } } catch {}
  return false;
}
function doDeploy(projectPath, options) {
  log('\nStarting deployment...\n');
  const cmdParts = ['vercel'];
  if (options.yes) cmdParts.push('--yes');
  if (options.prod) cmdParts.push('--prod');
  log(`Executing: ${cmdParts.join(' ')}\n`);
  try {
    const args = cmdParts.slice(1);
    const result = spawnSync('vercel', args, { cwd: projectPath, encoding: 'utf8', stdio: ['inherit', 'pipe', 'pipe'], timeout: 300000, shell: isWindows });
    const output = (result.stdout || '') + (result.stderr || '');
    log(output);
    if (result.status !== 0) throw new Error('Deployment command failed');
    const aliasedMatch = output.match(/Aliased:\s*(https:\/\/[a-zA-Z0-9.-]+\.vercel\.app)/i);
    const deploymentMatch = output.match(/Production:\s*(https:\/\/[a-zA-Z0-9.-]+\.vercel\.app)/i);
    const finalUrl = (aliasedMatch ? aliasedMatch[1] : null) || (deploymentMatch ? deploymentMatch[1] : null);
    log('\nDeployment successful!\n');
    if (finalUrl) { log(`Live URL: ${finalUrl}`); console.log(JSON.stringify({ status: 'success', url: finalUrl })); }
    else { console.log(JSON.stringify({ status: 'success', message: 'Deployment successful' })); }
  } catch (error) { log(error.message || ''); log('Deployment failed'); process.exit(1); }
}
function main() {
  log('========================================');
  log('Vercel CLI Project Deployment');
  log('========================================\n');
  const args = process.argv.slice(2);
  const options = parseArgs(args);
  checkVercelInstalled();
  if (!checkLoginStatus()) { log('\nError: Not logged in'); process.exit(1); }
  const absPath = path.resolve(options.projectPath);
  if (!fs.existsSync(absPath)) { log(`Error: Project dir not found: ${absPath}`); process.exit(1); }
  log(`Project path: ${absPath}`);
  doDeploy(absPath, options);
}
main();
