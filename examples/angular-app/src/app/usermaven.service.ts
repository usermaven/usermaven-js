import { Injectable } from '@angular/core';
import { usermavenClient } from '@usermaven/sdk-js';

@Injectable({ providedIn: 'root' })
export class UsermavenService {
  private client = usermavenClient({
    trackingHost: 'https://events.usermaven.com',
    key: 'UMXLIktQsI',
    autocapture: true
  });

  trackPageView(): void {
    console.log('📄 Sending pageview event');
    this.client.pageview();
  }

  identifyUser(): void {
    this.client.id({
      // Required attributes
      id: '123123213213',
      email: 'sheharyar.khalid@usermaven.com',
      created_at: '2024-01-01T10:00:00',
      
      // Recommended attributes - First name and last name
      first_name: 'Sheharyar',
      last_name: 'Khalid',
      
      // Optional custom attributes
      custom: {
        plan_name: 'premium',
        signup_source: 'angular-demo'
      },
      
      // Company attributes (optional)
      company: {
        id: 'company-456',
        name: 'Demo Company Inc',
        created_at: '2023-12-01T10:00:00',
        custom: {
          plan: 'enterprise',
          industry: 'Technology',
          employees: 50
        }
      }
    });
  }

  trackCustomEvent(eventName: string, properties?: Record<string, any>): void {
    console.log(`🎯 Tracking custom event: ${eventName}`, properties);
    this.client.track(eventName, properties);
  }

  trackButtonClick(label: string): void {
    console.log(`🔘 Tracking button click: ${label}`);
    this.client.track('button_click', { label });
  }
}
