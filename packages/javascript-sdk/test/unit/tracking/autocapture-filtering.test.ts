import { describe, it, expect, beforeEach, vi } from 'vitest';
import AutoCapture from '../../../src/tracking/autocapture';
import { UsermavenClient } from '../../../src/core/client';
import { Config } from '../../../src/core/types';

describe('AutoCapture Event Filtering', () => {
  let autoCapture: AutoCapture;
  let mockClient: UsermavenClient;
  let mockConfig: Config;
  let trackSpy: any;

  beforeEach(() => {
    // Create a mock client
    mockClient = {
      track: vi.fn(),
      config: {
        trackingHost: 'https://api.usermaven.com',
        key: 'test-key',
        autocapture: true,
      },
    } as any;

    trackSpy = vi.spyOn(mockClient, 'track');

    mockConfig = {
      trackingHost: 'https://api.usermaven.com',
      key: 'test-key',
      autocapture: true,
      maskAllElementAttributes: false,
      maskAllText: false,
    };

    autoCapture = new AutoCapture(mockClient, mockConfig);
  });

  describe('filters events without identifiers', () => {
    it('should drop click events on elements without any identifiers', () => {
      // Create a div with no identifiable attributes
      const div = document.createElement('div');
      document.body.appendChild(div);

      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      });

      Object.defineProperty(clickEvent, 'target', {
        value: div,
        enumerable: true,
      });

      // Trigger the event
      (autoCapture as any).captureEvent(clickEvent);

      // Should not track the event
      expect(trackSpy).not.toHaveBeenCalled();

      document.body.removeChild(div);
    });

    it('should drop click events on elements with only empty identifiers', () => {
      const button = document.createElement('button');
      button.className = '   '; // whitespace only
      button.setAttribute('id', '');
      button.setAttribute('name', '');
      document.body.appendChild(button);

      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      });

      Object.defineProperty(clickEvent, 'target', {
        value: button,
        enumerable: true,
      });

      (autoCapture as any).captureEvent(clickEvent);

      expect(trackSpy).not.toHaveBeenCalled();

      document.body.removeChild(button);
    });
  });

  describe('captures events with valid identifiers', () => {
    it('should capture click events on elements with text content', () => {
      const button = document.createElement('button');
      button.textContent = 'Sign up';
      document.body.appendChild(button);

      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      });

      Object.defineProperty(clickEvent, 'target', {
        value: button,
        enumerable: true,
      });

      (autoCapture as any).captureEvent(clickEvent);

      expect(trackSpy).toHaveBeenCalledWith(
        '$autocapture',
        expect.objectContaining({
          $event_type: 'click',
          $elements: expect.arrayContaining([
            expect.objectContaining({
              $el_text: 'Sign up',
            }),
          ]),
        }),
      );

      document.body.removeChild(button);
    });

    it('should capture click events on elements with id attribute', () => {
      const button = document.createElement('button');
      button.id = 'signup-btn';
      document.body.appendChild(button);

      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      });

      Object.defineProperty(clickEvent, 'target', {
        value: button,
        enumerable: true,
      });

      (autoCapture as any).captureEvent(clickEvent);

      expect(trackSpy).toHaveBeenCalledWith(
        '$autocapture',
        expect.objectContaining({
          $event_type: 'click',
          $elements: expect.arrayContaining([
            expect.objectContaining({
              attr__id: 'signup-btn',
            }),
          ]),
        }),
      );

      document.body.removeChild(button);
    });

    it('should capture click events on elements with name attribute', () => {
      const input = document.createElement('input');
      input.type = 'button';
      input.name = 'submit-form';
      document.body.appendChild(input);

      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      });

      Object.defineProperty(clickEvent, 'target', {
        value: input,
        enumerable: true,
      });

      (autoCapture as any).captureEvent(clickEvent);

      expect(trackSpy).toHaveBeenCalledWith(
        '$autocapture',
        expect.objectContaining({
          $event_type: 'click',
          $elements: expect.arrayContaining([
            expect.objectContaining({
              attr__name: 'submit-form',
            }),
          ]),
        }),
      );

      document.body.removeChild(input);
    });

    it('should capture click events on elements with class attribute', () => {
      const button = document.createElement('button');
      button.className = 'btn btn-primary';
      document.body.appendChild(button);

      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      });

      Object.defineProperty(clickEvent, 'target', {
        value: button,
        enumerable: true,
      });

      (autoCapture as any).captureEvent(clickEvent);

      expect(trackSpy).toHaveBeenCalledWith(
        '$autocapture',
        expect.objectContaining({
          $event_type: 'click',
          $elements: expect.arrayContaining([
            expect.objectContaining({
              classes: expect.arrayContaining(['btn', 'btn-primary']),
            }),
          ]),
        }),
      );

      document.body.removeChild(button);
    });

    it('should capture click events on elements with data-* attributes', () => {
      const button = document.createElement('button');
      button.setAttribute('data-test-id', 'signup-cta');
      document.body.appendChild(button);

      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      });

      Object.defineProperty(clickEvent, 'target', {
        value: button,
        enumerable: true,
      });

      (autoCapture as any).captureEvent(clickEvent);

      expect(trackSpy).toHaveBeenCalledWith(
        '$autocapture',
        expect.objectContaining({
          $event_type: 'click',
          $elements: expect.arrayContaining([
            expect.objectContaining({
              'attr__data-test-id': 'signup-cta',
            }),
          ]),
        }),
      );

      document.body.removeChild(button);
    });

    it('should capture click events on links with href', () => {
      const link = document.createElement('a');
      link.href = 'https://app.replug.io/register';
      document.body.appendChild(link);

      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      });

      Object.defineProperty(clickEvent, 'target', {
        value: link,
        enumerable: true,
      });

      (autoCapture as any).captureEvent(clickEvent);

      expect(trackSpy).toHaveBeenCalledWith(
        '$autocapture',
        expect.objectContaining({
          $event_type: 'click',
          $elements: expect.arrayContaining([
            expect.objectContaining({
              attr__href: 'https://app.replug.io/register',
            }),
          ]),
        }),
      );

      document.body.removeChild(link);
    });

    it('should capture click events on elements with aria-label', () => {
      const button = document.createElement('button');
      button.setAttribute('aria-label', 'Close dialog');
      document.body.appendChild(button);

      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      });

      Object.defineProperty(clickEvent, 'target', {
        value: button,
        enumerable: true,
      });

      (autoCapture as any).captureEvent(clickEvent);

      expect(trackSpy).toHaveBeenCalledWith(
        '$autocapture',
        expect.objectContaining({
          $event_type: 'click',
          $elements: expect.arrayContaining([
            expect.objectContaining({
              'attr__aria-label': 'Close dialog',
            }),
          ]),
        }),
      );

      document.body.removeChild(button);
    });
  });

  describe('respects explicit capture directives', () => {
    it('should not capture events on elements with ph-no-capture class', () => {
      const button = document.createElement('button');
      button.textContent = 'Click me';
      button.className = 'ph-no-capture';
      document.body.appendChild(button);

      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      });

      Object.defineProperty(clickEvent, 'target', {
        value: button,
        enumerable: true,
      });

      (autoCapture as any).captureEvent(clickEvent);

      expect(trackSpy).not.toHaveBeenCalled();

      document.body.removeChild(button);
    });
  });

  describe('real-world scenarios matching pinned events', () => {
    it('should capture "Sign up" button click (matches pinned event rule)', () => {
      const button = document.createElement('button');
      button.textContent = 'Sign up';
      button.id = 'signup-btn';
      document.body.appendChild(button);

      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      });

      Object.defineProperty(clickEvent, 'target', {
        value: button,
        enumerable: true,
      });

      (autoCapture as any).captureEvent(clickEvent);

      expect(trackSpy).toHaveBeenCalledWith(
        '$autocapture',
        expect.objectContaining({
          $event_type: 'click',
          $elements: expect.arrayContaining([
            expect.objectContaining({
              $el_text: 'Sign up',
              attr__id: 'signup-btn',
            }),
          ]),
        }),
      );

      document.body.removeChild(button);
    });

    it('should capture "Newsletter Sign Up CTA" with name attribute', () => {
      const button = document.createElement('button');
      button.textContent = 'Newsletter Sign Up CTA';
      button.name = 'newsletter-cta';
      document.body.appendChild(button);

      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      });

      Object.defineProperty(clickEvent, 'target', {
        value: button,
        enumerable: true,
      });

      (autoCapture as any).captureEvent(clickEvent);

      expect(trackSpy).toHaveBeenCalledWith(
        '$autocapture',
        expect.objectContaining({
          $event_type: 'click',
          $elements: expect.arrayContaining([
            expect.objectContaining({
              $el_text: 'Newsletter Sign Up CTA',
              attr__name: 'newsletter-cta',
            }),
          ]),
        }),
      );

      document.body.removeChild(button);
    });

    it('should drop anonymous div clicks (no pinnable identifiers)', () => {
      const div = document.createElement('div');
      // No text, no id, no name, no classes, no data attributes
      document.body.appendChild(div);

      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      });

      Object.defineProperty(clickEvent, 'target', {
        value: div,
        enumerable: true,
      });

      (autoCapture as any).captureEvent(clickEvent);

      // Should be dropped - no identifiers
      expect(trackSpy).not.toHaveBeenCalled();

      document.body.removeChild(div);
    });
  });
});
