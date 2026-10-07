import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { root, compareVersions, safePath, metadata, release, buildIndex, hash, immutableAgainst } from './marketplace.mjs';

test('versions sort numerically and reject non-release versions', () => {
  assert.deepEqual(['0.1.9', '0.1.10', '1.0.0'].sort(compareVersions), ['1.0.0', '0.1.10', '0.1.9']);
  assert.throws(() => compareVersions('1.0.0-rc.1', '1.0.0'));
});
test('paths reject traversal and absolute paths', () => {
  for (const value of ['../secret', '/secret', 'a/../b', 'a\\b']) assert.throws(() => safePath(root, value));
});
test('metadata rejects imports and runaway evaluation', async () => {
  await assert.rejects(metadata('import x from "node:fs"; export const meta = {};'));
  await assert.rejects(metadata('while (true) {}'));
});
test('release is reproducible, detects tampering, and hashes downloadable bytes', async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'plugin-market-test-'));
  try {
    await fs.copyFile(path.join(root, 'marketplace.json'), path.join(temp, 'marketplace.json'));
    await fs.cp(path.join(root, 'video'), path.join(temp, 'video'), { recursive: true });
    await fs.mkdir(path.join(temp, 'plugins/tasks/leonardo-video'), { recursive: true });
    await fs.copyFile(path.join(root, 'plugins/tasks/leonardo-video/icon.png'), path.join(temp, 'plugins/tasks/leonardo-video/icon.png'));
    await release(temp);
    const first = await buildIndex(temp);
    await release(temp);
    assert.equal(await buildIndex(temp), first);
    const entry = JSON.parse(first).plugins[0];
    assert.equal(hash(await fs.readFile(path.join(temp, entry.versions[0].path))), entry.versions[0].sha256);
    assert.equal(hash(await fs.readFile(path.join(temp, entry.iconFile.path))), entry.iconFile.sha256);
    await fs.appendFile(path.join(temp, entry.versions[0].path), '\n// tampered\n');
    await assert.rejects(release(temp), /immutable/);
    await assert.rejects(buildIndex(temp), /Source differs/);
    await fs.unlink(path.join(temp, 'plugins/tasks/leonardo-video/0.1.4/CHANGELOG.zh-CN.md'));
    await assert.rejects(buildIndex(temp));
  } finally { await fs.rm(temp, { recursive: true, force: true }); }
});
test('Git baseline prevents additions or edits inside published versions', async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'plugin-market-git-'));
  const git = (...args) => execFileSync('git', args, { cwd: temp, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  try {
    git('init');
    git('config', 'user.name', 'Marketplace Test');
    git('config', 'user.email', 'test@example.invalid');
    const oldDir = path.join(temp, 'plugins/tasks/example/1.0.0');
    await fs.mkdir(oldDir, { recursive: true });
    await fs.writeFile(path.join(oldDir, 'plugin.js'), '// original\n');
    git('add', '.');
    git('commit', '-m', 'initial');
    const ref = git('rev-parse', 'HEAD');
    immutableAgainst(ref, temp);
    await fs.writeFile(path.join(oldDir, 'CHANGELOG.md'), '# late log\n');
    git('add', '.');
    assert.throws(() => immutableAgainst(ref, temp), /Published directory changed/);
    await fs.unlink(path.join(oldDir, 'CHANGELOG.md'));
    git('add', '-A');
    await fs.appendFile(path.join(oldDir, 'plugin.js'), '// changed\n');
    assert.throws(() => immutableAgainst(ref, temp), /Published directory changed/);
    await fs.writeFile(path.join(oldDir, 'plugin.js'), '// original\n');
    await fs.mkdir(path.join(temp, 'plugins/tasks/example/1.0.1'));
    await fs.writeFile(path.join(temp, 'plugins/tasks/example/1.0.1/plugin.js'), '// new\n');
    git('add', '.');
    immutableAgainst(ref, temp);
  } finally { await fs.rm(temp, { recursive: true, force: true }); }
});
