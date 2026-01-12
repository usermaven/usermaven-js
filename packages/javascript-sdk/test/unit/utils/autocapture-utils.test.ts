import { describe, it, expect } from 'vitest';
import { hasAutocaptureIdentifier } from '../../../src/utils/autocapture-utils';

describe('hasAutocaptureIdentifier', () => {
  describe('returns false for missing or invalid identifiers', () => {
    it('returns false when elementProps is undefined or null', () => {
      expect(hasAutocaptureIdentifier(undefined)).toBe(false);
      expect(hasAutocaptureIdentifier(null)).toBe(false);
    });

    it('returns false when no identifying fields are present', () => {
      expect(hasAutocaptureIdentifier({ tag_name: 'div' } as any)).toBe(false);
      expect(hasAutocaptureIdentifier({ nth_child: 1, nth_of_type: 1 } as any)).toBe(false);
    });

    it('returns false for empty string identifiers', () => {
      expect(hasAutocaptureIdentifier({ $el_text: '' } as any)).toBe(false);
      expect(hasAutocaptureIdentifier({ attr__id: '' } as any)).toBe(false);
      expect(hasAutocaptureIdentifier({ attr__name: '' } as any)).toBe(false);
      expect(hasAutocaptureIdentifier({ attr__class: '' } as any)).toBe(false);
    });

    it('returns false for whitespace-only identifiers', () => {
      expect(hasAutocaptureIdentifier({ $el_text: '   ' } as any)).toBe(false);
      expect(hasAutocaptureIdentifier({ attr__id: '\t\n' } as any)).toBe(false);
      expect(hasAutocaptureIdentifier({ attr__name: '  ' } as any)).toBe(false);
    });

    it('returns false for empty classes array', () => {
      expect(hasAutocaptureIdentifier({ classes: [] } as any)).toBe(false);
    });

    it('returns false for classes with only empty or whitespace strings', () => {
      expect(hasAutocaptureIdentifier({ classes: ['', '  ', '\t'] } as any)).toBe(false);
    });

    it('returns false for empty data attributes', () => {
      expect(hasAutocaptureIdentifier({ 'attr__data-test': '' } as any)).toBe(false);
      expect(hasAutocaptureIdentifier({ 'attr__data-id': '   ' } as any)).toBe(false);
    });
  });

  describe('returns true for valid text identifiers (maps to label_text selector)', () => {
    it('returns true when element text is present', () => {
      expect(hasAutocaptureIdentifier({ $el_text: 'Click me' } as any)).toBe(true);
      expect(hasAutocaptureIdentifier({ $el_text: 'Sign up' } as any)).toBe(true);
      expect(hasAutocaptureIdentifier({ $el_text: 'Newsletter Sign Up CTA' } as any)).toBe(true);
    });

    it('returns true for text with leading/trailing whitespace', () => {
      expect(hasAutocaptureIdentifier({ $el_text: '  Submit  ' } as any)).toBe(true);
    });
  });

  describe('returns true for valid class identifiers (maps to css_attribute selector)', () => {
    it('returns true when classes array has valid entries', () => {
      expect(hasAutocaptureIdentifier({ classes: ['btn', 'primary'] } as any)).toBe(true);
      expect(hasAutocaptureIdentifier({ classes: ['cta-button'] } as any)).toBe(true);
    });

    it('returns true when classes array has at least one non-empty class', () => {
      expect(hasAutocaptureIdentifier({ classes: ['', 'valid-class', '  '] } as any)).toBe(true);
    });

    it('returns true for attr__class attribute', () => {
      expect(hasAutocaptureIdentifier({ attr__class: 'btn primary' } as any)).toBe(true);
    });
  });

  describe('returns true for valid id/name attributes (maps to css_attribute selector)', () => {
    it('returns true for id attribute', () => {
      expect(hasAutocaptureIdentifier({ attr__id: 'cta' } as any)).toBe(true);
      expect(hasAutocaptureIdentifier({ attr__id: 'submit-button' } as any)).toBe(true);
    });

    it('returns true for name attribute', () => {
      expect(hasAutocaptureIdentifier({ attr__name: 'email' } as any)).toBe(true);
      expect(hasAutocaptureIdentifier({ attr__name: 'newsletter-signup' } as any)).toBe(true);
    });
  });

  describe('returns true for valid ARIA attributes', () => {
    it('returns true for aria-label', () => {
      expect(hasAutocaptureIdentifier({ 'attr__aria-label': 'Close dialog' } as any)).toBe(true);
    });

    it('returns true for aria-labelledby', () => {
      expect(hasAutocaptureIdentifier({ 'attr__aria-labelledby': 'label-id' } as any)).toBe(true);
    });

    it('returns true for label attribute', () => {
      expect(hasAutocaptureIdentifier({ attr__label: 'Submit form' } as any)).toBe(true);
    });
  });

  describe('returns true for valid href attribute (maps to destination_url selector)', () => {
    it('returns true for href attribute', () => {
      expect(hasAutocaptureIdentifier({ attr__href: 'https://example.com' } as any)).toBe(true);
      expect(hasAutocaptureIdentifier({ attr__href: '/register' } as any)).toBe(true);
      expect(hasAutocaptureIdentifier({ attr__href: 'https://app.replug.io/register' } as any)).toBe(true);
    });
  });

  describe('returns true for valid data-* attributes (maps to css_attribute selector)', () => {
    it('returns true for various data attributes', () => {
      expect(hasAutocaptureIdentifier({ 'attr__data-um': 'hero' } as any)).toBe(true);
      expect(hasAutocaptureIdentifier({ 'attr__data-test-id': 'signup-btn' } as any)).toBe(true);
      expect(hasAutocaptureIdentifier({ 'attr__data-track': 'conversion' } as any)).toBe(true);
    });

    it('returns true when at least one data attribute is valid', () => {
      expect(
        hasAutocaptureIdentifier({
          'attr__data-empty': '',
          'attr__data-valid': 'value',
        } as any),
      ).toBe(true);
    });
  });

  describe('returns true when multiple identifiers are present', () => {
    it('returns true with combination of identifiers', () => {
      expect(
        hasAutocaptureIdentifier({
          $el_text: 'Sign up',
          attr__id: 'signup-btn',
          classes: ['btn', 'primary'],
        } as any),
      ).toBe(true);
    });

    it('returns true even if some identifiers are empty', () => {
      expect(
        hasAutocaptureIdentifier({
          $el_text: '',
          attr__id: 'valid-id',
          attr__name: '',
        } as any),
      ).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('handles non-string values gracefully', () => {
      expect(hasAutocaptureIdentifier({ $el_text: 123 } as any)).toBe(false);
      expect(hasAutocaptureIdentifier({ attr__id: null } as any)).toBe(false);
      expect(hasAutocaptureIdentifier({ classes: 'not-an-array' } as any)).toBe(false);
    });

    it('handles special characters in identifiers', () => {
      expect(hasAutocaptureIdentifier({ $el_text: 'Click → here!' } as any)).toBe(true);
      expect(hasAutocaptureIdentifier({ attr__id: 'btn-123_test' } as any)).toBe(true);
    });
  });
});
