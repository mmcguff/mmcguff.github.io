import { describe, expect, it } from 'vitest';
import { loadDist } from '../helpers';

// #34: the contact form posts to a Formspree form-ID endpoint with validation and a honeypot.
const form = () => loadDist('index.html')('#contact-form');

describe('contact form (dist/index.html)', () => {
  it('exists once', () => {
    expect(form().length).toBe(1);
  });

  // AC1
  it('posts to a Formspree form-ID endpoint', () => {
    expect(form().attr('method')?.toUpperCase()).toBe('POST');
    expect(form().attr('action')).toMatch(/^https:\/\/formspree\.io\/f\/[A-Za-z0-9]+$/);
  });

  it('has no email address in its action', () => {
    expect(form().attr('action')).not.toContain('@');
  });

  // AC2
  it('requires a valid email', () => {
    const email = form().find('input[name="email"]');
    expect(email.attr('type')).toBe('email');
    expect(email.is('[required]')).toBe(true);
  });

  it('requires a message', () => {
    expect(form().find('textarea[name="message"]').is('[required]')).toBe(true);
  });

  it('leaves name and contact reason optional', () => {
    expect(form().find('[name="name"]').is('[required]')).toBe(false);
    expect(form().find('[name="contact_reason"]').is('[required]')).toBe(false);
  });

  // AC3
  it('submits "Something Else" when no contact reason is picked', () => {
    const selected = form().find('select[name="contact_reason"] option[selected]');
    expect(selected.length).toBe(1);
    expect(selected.attr('value')).toBe('Something Else');
  });

  it('never submits the "Contact Reason:" prompt as a value', () => {
    const $ = loadDist('index.html');
    // An option without a value attribute submits its text.
    const values = $('#contact-form select[name="contact_reason"] option')
      .map((_, o) => $(o).attr('value') ?? $(o).text().trim())
      .get();
    expect(values).not.toContain('Contact Reason:');
  });

  // AC4
  it('has a hidden _gotcha honeypot that keyboard users skip', () => {
    const gotcha = form().find('input[name="_gotcha"]');
    expect(gotcha.length).toBe(1);
    expect(gotcha.attr('style')).toMatch(/display:\s*none/);
    expect(gotcha.attr('tabindex')).toBe('-1');
    expect(gotcha.attr('autocomplete')).toBe('off');
  });

  // AC5/AC6: somewhere to announce the result.
  it('has a live status region for the result', () => {
    const status = form().find('#contact-status');
    expect(status.attr('role')).toBe('status');
    expect(status.attr('aria-live')).toBe('polite');
  });
});
