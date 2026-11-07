import './setup.js';
import assert from 'node:assert';
import * as fs from 'node:fs';
import { createRequire } from 'node:module';
import * as os from 'node:os';
import * as path from 'node:path';
import { test } from 'node:test';

const req = createRequire(__filename);
const { checkMarketplaceImages, IMAGES, pngSize } = req(
  '../../../scripts/marketplace-images.cjs',
) as {
  checkMarketplaceImages: (opts?: {
    root?: string;
    ready?: boolean;
    sourceDir?: string;
    imagesDir?: string;
  }) => { ready: boolean; problems: string[]; pending: boolean };
  IMAGES: Array<{ file: string; required: boolean }>;
  pngSize: (file: string) => { width: number; height: number } | undefined;
};

function fakePng(width = 1600, height = 900): Buffer {
  const b = Buffer.alloc(24);
  b.write('PNG', 1, 'ascii');
  b.writeUInt32BE(width, 16);
  b.writeUInt32BE(height, 20);
  return b;
}

function fixture(ready = true) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'utplsql-marketplace-'));
  const src = path.join(root, 'docs', 'brain', '60-README', 'images');
  const dst = path.join(root, 'images');
  fs.mkdirSync(src, { recursive: true });
  fs.mkdirSync(dst, { recursive: true });
  const md = [
    '# page',
    ...IMAGES.filter((i) => i.required).map((i) => `![alt](images/${i.file})`),
    ...(ready ? ['<!-- marketplace:images-ready -->'] : []),
  ].join('\n');
  fs.writeFileSync(path.join(root, 'MARKETPLACE.md'), md);
  return { root, src, dst, cleanup: () => fs.rmSync(root, { recursive: true, force: true }) };
}

test('marketplace-images: sem marcador fica pendente e não falha', () => {
  const f = fixture(false);
  try {
    const r = checkMarketplaceImages({ root: f.root });
    assert.strictEqual(r.pending, true);
    assert.deepStrictEqual(r.problems, []);
  } finally {
    f.cleanup();
  }
});

test('marketplace-images: com marcador exige arquivos, dimensões e referências', () => {
  const f = fixture(true);
  try {
    const missing = checkMarketplaceImages({ root: f.root, sourceDir: f.src, imagesDir: f.dst });
    assert.ok(missing.problems.some((p) => p.includes('marketplace-test-explorer.png')));

    for (const image of IMAGES.filter((i) => i.required)) {
      fs.writeFileSync(path.join(f.src, image.file), fakePng());
      fs.writeFileSync(path.join(f.dst, image.file), fakePng());
    }
    const ok = checkMarketplaceImages({ root: f.root, sourceDir: f.src, imagesDir: f.dst });
    assert.deepStrictEqual(ok.problems, []);

    fs.writeFileSync(path.join(f.src, 'marketplace-test-explorer.png'), fakePng(800, 600));
    const bad = checkMarketplaceImages({ root: f.root, sourceDir: f.src, imagesDir: f.dst });
    assert.ok(bad.problems.some((p) => p.includes('800×600')));
  } finally {
    f.cleanup();
  }
});

test('marketplace-images: pngSize lê IHDR e rejeita não-PNG', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'utplsql-png-'));
  try {
    const png = path.join(dir, 'a.png');
    fs.writeFileSync(png, fakePng(1600, 900));
    assert.deepStrictEqual(pngSize(png), { width: 1600, height: 900 });
    const txt = path.join(dir, 'b.png');
    fs.writeFileSync(txt, 'not a png');
    assert.strictEqual(pngSize(txt), undefined);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
