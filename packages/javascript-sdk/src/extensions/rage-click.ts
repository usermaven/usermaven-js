import { UsermavenClient } from '../core/client';
import { _safewrap_instance_methods } from '../utils/common';

export class RageClick {
  private client: UsermavenClient;
  private clicks: { x: number; y: number; timestamp: number }[] = [];
  private threshold = 3;
  private timeWindow = 2000; // 2 seconds
  private distanceThreshold = 30;

  constructor(client: UsermavenClient) {
    this.client = client;
    this.initializeEventListener();
    _safewrap_instance_methods(this);
  }

  private initializeEventListener(): void {
    document.addEventListener('click', this.handleClick.bind(this));
  }

  private handleClick(event: MouseEvent): void {
    const element = event.target as Element;
    if (this.shouldCaptureElement(element)) {
      this.click(event.clientX, event.clientY, Date.now());
    }
  }

  private shouldCaptureElement(element: Element): boolean {
    return !element.closest('.um-no-capture');
  }

  public click(x: number, y: number, timestamp: number): void {
    const click = { x, y, timestamp };
    this.clicks.push(click);

    // Remove old clicks outside the time window
    this.clicks = this.clicks.filter(
      (c) => timestamp - c.timestamp < this.timeWindow,
    );

    if (this.clicks.length >= this.threshold) {
      this.checkRageClick();
    }
  }

  private checkRageClick(): void {
    const firstClick = this.clicks[0];
    const lastClick = this.clicks[this.clicks.length - 1];
    const totalTime = (lastClick.timestamp - firstClick.timestamp) / 1000; // in seconds

    const isRageClick = this.clicks.every((c, i) => {
      if (i === 0) return true;
      const prev = this.clicks[i - 1];
      const distance = Math.sqrt(
        Math.pow(c.x - prev.x, 2) + Math.pow(c.y - prev.y, 2),
      );
      return distance < this.distanceThreshold;
    });

    if (isRageClick) {
      this.sendRageClickEvent(totalTime);
    }
  }

  private sendRageClickEvent(totalTime: number): void {
    const lastClick = this.clicks[this.clicks.length - 1];
    const element = document.elementFromPoint(lastClick.x, lastClick.y);

    if (element) {
      this.client.track('$rage_click', {
        no_of_clicks: this.clicks.length,
        time: totalTime.toFixed(2),
      });
    }

    this.clicks = []; // Reset clicks after sending the event
  }
}
