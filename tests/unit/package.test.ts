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

  it('has a check script that runs astro check', () => {
    expect(pkg().scripts?.check).toBe('astro check');
  });
});
