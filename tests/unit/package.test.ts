import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOT } from '../helpers';

// #29 AC1: astro check is installed as a dev tool with a peer-compatible TypeScript.
const pkg = () => JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

describe('package.json type checking', () => {
  it.each(['@astrojs/check', 'typescript'])('has %s as a devDependency only', (name) => {
    expect(pkg().devDependencies?.[name]).toBeTruthy();
    expect(pkg().dependencies?.[name]).toBeUndefined();
  });

  // @astrojs/check 0.9.x supports TypeScript ^5 || ^6, not 7.
  it('pins TypeScript to major 6', () => {
    expect(pkg().devDependencies?.typescript).toMatch(/^\^6\./);
  });

  // #28: feed HTML is sanitized at build time, so the sanitizer is a runtime dependency and its types a dev one.
  it('has sanitize-html as a dependency', () => {
    expect(pkg().dependencies?.['sanitize-html']).toBeTruthy();
    expect(pkg().devDependencies?.['sanitize-html']).toBeUndefined();
  });

  it('has @types/sanitize-html as a devDependency', () => {
    expect(pkg().devDependencies?.['@types/sanitize-html']).toBeTruthy();
    expect(pkg().dependencies?.['@types/sanitize-html']).toBeUndefined();
  });

  it('has a check script that runs astro check', () => {
    expect(pkg().scripts?.check).toBe('astro check');
  });
});
