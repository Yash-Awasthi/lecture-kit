// Packs the skill and the kit into dist/lecture-deck.zip, ready to upload as a skill
// (for example in the claude.ai skills settings). Heavy folders (node_modules, vendor, builds) are left out.
// usage: node tools/pack-skill.mjs
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateRawSync, crc32 } from 'node:zlib';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SKIP = new Set(['node_modules', 'vendor', 'dist', 'check', '.git', 'skill']);
const files = [];
const walk = (dir, base) => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f), st = statSync(p);
    if (st.isDirectory()) { if (!SKIP.has(f)) walk(p, base); } else files.push([p, relative(base, p)]);
  }
};
const skill = join(root, 'skill', 'lecture-deck');
walk(skill, skill);
const entries = files.map(([p, r]) => ['lecture-deck/' + r.split(sep).join('/'), p]);
files.length = 0; walk(root, root);
for (const [p, r] of files) entries.push(['lecture-deck/lecture-kit/' + r.split(sep).join('/'), p]);

// Minimal zip writer: deflate, one central directory.
const chunks = [], central = []; let off = 0;
for (const [name, p] of entries) {
  const data = readFileSync(p), comp = deflateRawSync(data, { level: 9 }), nb = Buffer.from(name), crc = crc32(data);
  const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(0x0800, 6); h.writeUInt16LE(8, 8);
  h.writeUInt32LE(0, 10); h.writeUInt32LE(crc, 14); h.writeUInt32LE(comp.length, 18); h.writeUInt32LE(data.length, 22); h.writeUInt16LE(nb.length, 26);
  chunks.push(h, nb, comp);
  const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x0800, 8); c.writeUInt16LE(8, 10);
  c.writeUInt32LE(0, 12); c.writeUInt32LE(crc, 16); c.writeUInt32LE(comp.length, 20); c.writeUInt32LE(data.length, 24); c.writeUInt16LE(nb.length, 28); c.writeUInt32LE(off, 42);
  central.push(c, nb); off += 30 + nb.length + comp.length;
}
const cd = Buffer.concat(central), end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(off, 16);
mkdirSync(join(root, 'dist'), { recursive: true });
const out = join(root, 'dist', 'lecture-deck.zip');
writeFileSync(out, Buffer.concat([...chunks, cd, end]));
console.log(`${out}: ${entries.length} files, ${(statSync(out).size / 1024).toFixed(0)} KB`);
