// Installs the skill for local use: copies skill/lecture-deck into ~/.claude/skills/lecture-deck and
// records this kit's path in kit-path.txt, so the skill uses this checkout (with its node_modules and vendor).
// Re-run after editing the skill text. usage: node tools/install-skill.mjs [target-dir]
import { cpSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const root = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'));
const target = resolve(process.argv[2] || join(homedir(), '.claude', 'skills', 'lecture-deck'));
rmSync(target, { recursive: true, force: true }); mkdirSync(target, { recursive: true });
cpSync(join(root, 'skill', 'lecture-deck'), target, { recursive: true });
writeFileSync(join(target, 'kit-path.txt'), root + '\n');
console.log(`installed ${target}\nkit: ${root}`);
