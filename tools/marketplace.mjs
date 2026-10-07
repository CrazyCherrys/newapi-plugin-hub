import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const hash = data => createHash('sha256').update(data).digest('hex');
const versionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
export function compareVersions(a, b) {
  if (!versionPattern.test(a) || !versionPattern.test(b)) throw Error('Only stable x.y.z release versions are supported');
  const aa = a.split('.').map(BigInt), bb = b.split('.').map(BigInt);
  for (let i = 0; i < 3; i++) if (aa[i] !== bb[i]) return aa[i] > bb[i] ? -1 : 1;
  return 0;
}
export function safePath(base, relative) {
  if (!relative || relative.includes('\\') || relative.split('/').some(p => !p || p === '.' || p === '..') || path.isAbsolute(relative)) throw Error(`Invalid relative path: ${relative}`);
  const result = path.resolve(base, relative);
  if (!result.startsWith(path.resolve(base) + path.sep)) throw Error('Path escapes root');
  return result;
}
const read = (base, relative) => fs.readFile(safePath(base, relative));
const json = value => JSON.stringify(value, null, 2) + '\n';
export async function metadata(code) {
  // Only evaluate repository-authored plugins. node:vm is not a security sandbox.
  const mod = new vm.SourceTextModule(code, { context: vm.createContext({}) });
  await mod.link(() => { throw Error('Plugins must not import dependencies'); });
  await mod.evaluate({ timeout: 1000 });
  const meta = JSON.parse(JSON.stringify(mod.namespace.meta));
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(meta.key) || !versionPattern.test(meta.version) || meta.apiVersion !== 1) throw Error('Invalid plugin identity or API version');
  return meta;
}
async function config(base) {
  const cfg = JSON.parse(await read(base, 'marketplace.json'));
  const keys = new Set();
  for (const item of cfg.plugins) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.key) || keys.has(item.key)) throw Error('Invalid or duplicate plugin key');
    keys.add(item.key);
    safePath(base, item.source);
  }
  return cfg;
}
async function changelog(base, dir, meta) {
  for (const [file, locale] of [['CHANGELOG.md', 'en'], ['CHANGELOG.zh-CN.md', 'zh-CN']]) {
    const text = (await read(base, `${dir}/${file}`)).toString().replace(/\r\n/g, '\n');
    const front = text.match(/^---\n([\s\S]*?)\n---\n/);
    if (!front || !front[1].includes('changelogVersion: 1') || !front[1].includes(`plugin: '${meta.key}'`) || !front[1].includes(`version: '${meta.version}'`) || !front[1].includes(`locale: '${locale}'`) || !text.includes(`## [${meta.version}]`) || !/^### (Added|Changed|Deprecated|Removed|Fixed|Security)$/m.test(text) || !text.includes('### Migration')) throw Error(`Invalid changelog: ${dir}/${file}`);
    if (locale === 'en' && !front[1].includes('zh-CN: CHANGELOG.zh-CN.md')) throw Error('Missing changelog translation link');
    if (!/^# Changelog$/m.test(text)) throw Error(`Invalid changelog heading: ${file}`);
  }
}
export async function release(base = root) {
  for (const item of (await config(base)).plugins) {
    const meta = await metadata((await read(base, `${item.source}/plugin.js`)).toString());
    const pkg = JSON.parse(await read(base, `${item.source}/package.json`));
    if (meta.key !== item.key || pkg.version !== meta.version) throw Error('Source identity/version mismatch');
    await changelog(base, item.source, meta);
    const dest = `plugins/tasks/${meta.key}/${meta.version}`;
    const files = ['plugin.js', 'CHANGELOG.md', 'CHANGELOG.zh-CN.md'];
    const contents = await Promise.all(files.map(async file => Buffer.from((await read(base, `${item.source}/${file}`)).toString().replace(/\r\n/g, '\n'))));
    const exists = await fs.stat(safePath(base, dest)).then(() => true, e => { if (e.code === 'ENOENT') return false; throw e; });
    if (exists) {
      for (let i = 0; i < files.length; i++) if (!(await read(base, `${dest}/${files[i]}`)).equals(contents[i])) throw Error(`Published release is immutable: ${dest}. Bump the source version.`);
    } else {
      await fs.mkdir(safePath(base, dest), { recursive: true });
      for (let i = 0; i < files.length; i++) await fs.writeFile(safePath(base, `${dest}/${files[i]}`), contents[i], { flag: 'wx' });
    }
    await changelog(base, dest, meta);
  }
}
export async function buildIndex(base = root) {
  const cfg = await config(base);
  const plugins = [];
  for (const item of [...cfg.plugins].sort((a, b) => a.key.localeCompare(b.key))) {
    const dir = `plugins/tasks/${item.key}`;
    const entries = await fs.readdir(safePath(base, dir), { withFileTypes: true });
    if (entries.some(e => e.isSymbolicLink())) throw Error('Release symlinks are not allowed');
    const versions = entries.filter(e => e.isDirectory()).map(e => e.name).sort(compareVersions);
    if (!versions.length) throw Error(`No releases for ${item.key}`);
    let latestMeta;
    const releases = [];
    for (const version of versions) {
      compareVersions(version, version);
      const file = `${dir}/${version}/plugin.js`;
      const bytes = await read(base, file);
      if (bytes.includes(Buffer.from('\r\n'))) throw Error(`Release must use LF: ${file}`);
      const meta = await metadata(bytes.toString());
      if (meta.key !== item.key || meta.version !== version) throw Error(`Release identity mismatch: ${file}`);
      await changelog(base, `${dir}/${version}`, meta);
      latestMeta ??= meta;
      releases.push({ version, path: file, sha256: hash(bytes), minApiVersion: meta.apiVersion, kind: 'task' });
    }
    const icon = entries.find(e => e.isFile() && /^icon\.(png|svg)$/.test(e.name));
    if (!icon) throw Error(`Missing logo: ${dir}`);
    const iconPath = `${dir}/${icon.name}`;
    const iconBytes = await read(base, iconPath);
    if (iconBytes.length > 1024 * 1024) throw Error('Logo exceeds 1 MiB');
    const m = latestMeta;
    const sourceBytes = Buffer.from((await read(base, `${item.source}/plugin.js`)).toString().replace(/\r\n/g, '\n'));
    const sourceMeta = await metadata(sourceBytes.toString());
    const pkg = JSON.parse(await read(base, `${item.source}/package.json`));
    if (sourceMeta.key !== item.key || sourceMeta.version !== m.version || pkg.version !== m.version || hash(sourceBytes) !== releases[0].sha256) throw Error(`Source differs from latest release: ${item.key}; bump version and run release`);
    plugins.push({ key: m.key, name: m.name, description: m.description,
      iconFile: { path: iconPath, sha256: hash(iconBytes) },
      protocols: (m.protocols ?? []).map(p => typeof p === 'string' ? { name: p } : p),
      models: m.models ?? [], usageSchema: m.usageSchema, usageExamples: m.usageExamples,
      latest: m.version, versions: releases });
  }
  return json({ indexVersion: 1, name: cfg.name, plugins });
}
export function immutableAgainst(ref, base = root) {
  if (!/^[a-f0-9]{40}$/.test(ref)) throw Error('Base must be a full Git commit SHA');
  const oldFiles = execFileSync('git', ['ls-tree', '-r', '--name-only', ref, '--', 'plugins/tasks'], { cwd: base, encoding: 'utf8' }).trim().split('\n');
  const published = new Set(oldFiles.map(n => n.match(/^(plugins\/tasks\/[^/]+\/\d+\.\d+\.\d+)\//)?.[1]).filter(Boolean));
  const names = execFileSync('git', ['diff', '--no-renames', '--name-only', ref, '--', 'plugins/tasks'], { cwd: base, encoding: 'utf8' }).trim().split('\n');
  for (const name of names) if (published.has(name.match(/^(plugins\/tasks\/[^/]+\/\d+\.\d+\.\d+)\//)?.[1])) throw Error(`Published directory changed: ${name}`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const command = process.argv[2];
    if (command === 'release') await release();
    if (['release', 'generate', 'check'].includes(command)) {
      const expected = await buildIndex();
      if (command === 'check') {
        if ((await read(root, 'index.json')).toString() !== expected) throw Error('index.json is stale; run npm run index');
        if (process.argv[3]) immutableAgainst(process.argv[3]);
      } else await fs.writeFile(path.join(root, 'index.json'), expected);
      console.log(`Marketplace ${command}: OK`);
    } else throw Error('Use release, generate or check [base SHA]');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
