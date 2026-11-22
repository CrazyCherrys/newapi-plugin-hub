import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { root, compareVersions, safePath, metadata, release, buildIndex, hash, immutableAgainst, validPluginKey, communityAuthor } from './marketplace.mjs';

test('versions sort numerically and reject non-release versions', () => {
  assert.deepEqual(['0.1.9', '0.1.10', '1.0.0'].sort(compareVersions), ['1.0.0', '0.1.10', '0.1.9']);
  assert.throws(() => compareVersions('1.0.0-rc.1', '1.0.0'));
});
test('paths reject traversal and absolute paths', () => {
  for (const value of ['../secret', '/secret', 'a/../b', 'a\\b']) assert.throws(() => safePath(root, value));
});
test('community keys match the GitHub author namespace and host key limits', () => {
  const meta = { key: 'crazycherrys_xysnai-video', author: { name: 'CrazyCherrys', url: 'https://github.com/CrazyCherrys' } };
  assert.deepEqual(communityAuthor(meta), { login: 'CrazyCherrys', url: 'https://github.com/CrazyCherrys' });
  for (const key of ['xysnai-video', 'someone_xysnai-video', 'CrazyCherrys_xysnai-video', 'crazycherrys_', 'crazycherrys_' + 'x'.repeat(19)]) {
    assert.throws(() => communityAuthor({ ...meta, key }), /Community plugin key/);
  }
  assert.equal(validPluginKey('a'.repeat(30)), true);
  assert.equal(validPluginKey('a'.repeat(31)), false);
  for (const url of [undefined, 'https://xysnai.cn', 'https://github.com/OtherAuthor', 'https://github.com/CrazyCherrys/repository']) {
    assert.throws(() => communityAuthor({ ...meta, author: { url } }), /Community plugin key/);
  }
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
    const cfg = JSON.parse(await fs.readFile(path.join(root, 'marketplace.json'), 'utf8'));
    for (const item of cfg.plugins) {
      const dir = `plugins/tasks/${item.key}`;
      await fs.mkdir(path.join(temp, dir), { recursive: true });
      const icon = (await fs.readdir(path.join(root, dir))).find(name => /^icon\.(png|svg)$/.test(name));
      await fs.copyFile(path.join(root, dir, icon), path.join(temp, dir, icon));
    }
    await release(temp);
    const first = await buildIndex(temp);
    await release(temp);
    assert.equal(await buildIndex(temp), first);
    const entry = JSON.parse(first).plugins[0];
    assert.equal(hash(await fs.readFile(path.join(temp, entry.versions[0].path))), entry.versions[0].sha256);
    assert.equal(hash(await fs.readFile(path.join(temp, entry.iconFile.path))), entry.iconFile.sha256);
    const meta = await metadata(await fs.readFile(path.join(temp, entry.versions[0].path), 'utf8'));
    assert.deepEqual(entry.author, communityAuthor(meta));
    assert.deepEqual(entry.usageProfiles, meta.usageProfiles);
    assert.equal(entry.task, true);
    assert.equal(entry.versions[0].baseUrl, meta.baseUrl);
    assert.equal(entry.versions[0].auth, meta.auth);
    const readme = entry.versions[0].readme;
    const chineseReadme = readme.translations['zh-CN'];
    assert.equal(chineseReadme.path, 'video/xysnai/README.zh-CN.md');
    for (const doc of [readme, chineseReadme, entry.versions[0].changelog,
      entry.versions[0].changelog.translations['zh-CN']]) {
      assert.equal(hash(await fs.readFile(path.join(temp, doc.path))), doc.sha256);
    }
    assert.deepEqual(entry.usageProfiles.flatMap(p => p.models).sort(), entry.models.toSorted());
    assert.ok(entry.models.every(model => !model.includes('/')));
    const h3Schema = entry.usageProfiles.find(p => p.models.includes('minimax-h3')).schema;
    const h3EnumFields = Object.keys(h3Schema).filter(key => h3Schema[key].enum);
    assert.deepEqual(h3EnumFields, ['resolution']);
    assert.deepEqual(h3Schema.resolution.enum, ['480P', '768P', '1080P', '2K', '4K']);
    assert.ok(entry.usageProfiles.find(p => p.models.includes('Video-upscale2.6')).schema.billing_seconds);
    const sourcePath = path.join(temp, cfg.plugins[0].source, 'plugin.js');
    const source = await fs.readFile(sourcePath, 'utf8');
    await fs.writeFile(sourcePath, source.replace('key: "crazycherrys_xysnai-video"', 'key: "xysnai-video"'));
    await assert.rejects(release(temp), /Community plugin key/);
    await fs.writeFile(sourcePath, source);
    await fs.appendFile(path.join(temp, entry.versions[0].path), '\n// tampered\n');
    await assert.rejects(release(temp), /immutable/);
    await assert.rejects(buildIndex(temp), /Source differs/);
    await fs.unlink(path.join(temp, path.dirname(entry.versions[0].path), 'CHANGELOG.zh-CN.md'));
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
    const cfg = { name: 'Test', plugins: [{ key: 'example', source: 'video/example' }] };
    await fs.writeFile(path.join(temp, 'marketplace.json'), JSON.stringify(cfg));
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
    await fs.rm(oldDir, { recursive: true });
    assert.throws(() => immutableAgainst(ref, temp), /Published directory changed/);
    // Removing a registration alone must not authorize deleting published files.
    cfg.plugins = [];
    await fs.writeFile(path.join(temp, 'marketplace.json'), JSON.stringify(cfg));
    assert.throws(() => immutableAgainst(ref, temp), /Published directory changed/);
    cfg.retiredPlugins = ['example'];
    await fs.writeFile(path.join(temp, 'marketplace.json'), JSON.stringify(cfg));
    assert.throws(() => immutableAgainst(ref, temp), /fully removed/);
    await fs.rm(path.join(temp, 'plugins/tasks/example'), { recursive: true });
    immutableAgainst(ref, temp);
    cfg.plugins = [{ key: 'example', source: 'video/example' }];
    await fs.writeFile(path.join(temp, 'marketplace.json'), JSON.stringify(cfg));
    assert.throws(() => immutableAgainst(ref, temp), /active retired/);
  } finally { await fs.rm(temp, { recursive: true, force: true }); }
});
