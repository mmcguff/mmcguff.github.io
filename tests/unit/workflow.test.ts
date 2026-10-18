import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';
import { ROOT } from '../helpers';

// AC11: build + test on PRs, deploy to Pages only from main.
const WORKFLOW = path.join(ROOT, '.github/workflows/deploy.yml');

type Step = { uses?: string; run?: string };
type Job = { needs?: string | string[]; if?: string; permissions?: Record<string, string>; steps: Step[] };
let wf: { on: Record<string, any>; permissions: Record<string, string>; jobs: Record<string, Job> };

const runs = (job: Job) => job.steps.map((s) => s.run ?? '').join('\n');
const uses = (job: Job) => job.steps.map((s) => s.uses ?? '');

describe('GitHub Pages workflow', () => {
  beforeAll(() => {
    expect(fs.existsSync(WORKFLOW), '.github/workflows/deploy.yml should exist').toBe(true);
    wf = parseYaml(fs.readFileSync(WORKFLOW, 'utf8'));
  });

  it('runs on pushes to main', () => {
    expect(wf.on.push.branches).toContain('main');
  });

  it('runs on pull requests to main', () => {
    expect(wf.on.pull_request.branches).toContain('main');
  });

  // #30: main is the only branch that triggers, so the old default can't sneak back in.
  it('triggers on main only', () => {
    expect(wf.on.push.branches).toEqual(['main']);
    expect(wf.on.pull_request.branches).toEqual(['main']);
  });

  it('grants only read access at the workflow level', () => {
    expect(wf.permissions).toEqual({ contents: 'read' });
  });

  it('grants Pages write permissions to the deploy job only', () => {
    expect(wf.jobs.deploy.permissions).toMatchObject({ pages: 'write', 'id-token': 'write' });
    expect(wf.jobs.build.permissions).toBeUndefined();
  });

  it('cancels superseded PR runs but never an in-flight deploy', () => {
    expect((wf as any).concurrency['cancel-in-progress']).toMatch(/github\.event_name\s*==\s*'pull_request'/);
  });

  it('installs, unit tests, builds, and integration tests in the build job, in that order', () => {
    const script = runs(wf.jobs.build);
    const order = ['npm ci', 'npm run test:unit', 'npm run build', 'npm run test:integration'].map((cmd) =>
      script.indexOf(cmd),
    );
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  // #29 AC3: type errors fail the job before anything is built.
  it('type checks after installing and before building', () => {
    const script = runs(wf.jobs.build);
    const [install, check, build] = ['npm ci', 'npm run check', 'npm run build'].map((cmd) => script.indexOf(cmd));
    expect(check).toBeGreaterThan(install);
    expect(check).toBeLessThan(build);
  });

  it('runs the e2e suite in the build job', () => {
    expect(runs(wf.jobs.build)).toContain('npm run test:e2e');
  });

  it('keeps @network tests out of the e2e step that gates deploys', () => {
    const gating = wf.jobs.build.steps.filter(
      (s: Step & { 'continue-on-error'?: boolean }) => s.run?.includes('npm run test:e2e') && !s['continue-on-error'],
    );
    expect(gating.length).toBeGreaterThan(0);
    for (const step of gating) expect(step.run).toContain('--grep-invert @network');
  });

  it('runs @network tests in a non-blocking step', () => {
    const step = wf.jobs.build.steps.find((s) => s.run?.includes('--grep @network')) as
      | (Step & { id?: string; 'continue-on-error'?: boolean })
      | undefined;
    expect(step?.['continue-on-error']).toBe(true);
    expect(step?.id).toBeTruthy();
  });

  it('logs a warning annotation when the @network step fails', () => {
    const id = (wf.jobs.build.steps.find((s) => s.run?.includes('--grep @network')) as { id?: string })?.id;
    const warn = wf.jobs.build.steps.find((s: Step & { if?: string }) => s.if?.includes(`steps.${id}.outcome == 'failure'`));
    expect(warn?.run).toContain('::warning');
  });

  it('uploads the Playwright report when the @network step fails', () => {
    const id = (wf.jobs.build.steps.find((s) => s.run?.includes('--grep @network')) as { id?: string })?.id;
    const upload = wf.jobs.build.steps.find((s) => s.uses?.startsWith('actions/upload-artifact')) as Step & { if?: string };
    expect(upload?.if).toContain('failure()');
    expect(upload?.if).toContain(`steps.${id}.outcome == 'failure'`);
  });

  it('uploads dist/ as the Pages artifact, except on pull requests', () => {
    const upload = wf.jobs.build.steps.find((s) => s.uses?.startsWith('actions/upload-pages-artifact'));
    expect(upload).toBeDefined();
    expect((upload as any).with?.path).toMatch(/^\.?\/?dist\/?$/);
    expect((upload as any).if).toMatch(/github\.event_name\s*!=\s*'pull_request'/);
  });

  it('deploys with actions/deploy-pages after the build job', () => {
    expect(uses(wf.jobs.deploy).some((u) => u.startsWith('actions/deploy-pages'))).toBe(true);
    expect([wf.jobs.deploy.needs].flat()).toContain('build');
  });

  it('never deploys from a pull request', () => {
    expect(wf.jobs.deploy.if).toMatch(/github\.event_name\s*!=\s*'pull_request'/);
  });
});
