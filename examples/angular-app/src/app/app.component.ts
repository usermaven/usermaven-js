import { Component, OnInit } from '@angular/core';
import { NgIf } from '@angular/common';
import { UsermavenService } from './usermaven.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [NgIf],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  statusMessage = '';

  constructor(private readonly usermaven: UsermavenService) {}

  ngOnInit(): void {
    this.usermaven.trackPageView();
    this.statusMessage = 'Page view sent';
  }

  identify(): void {
    this.usermaven.identifyUser();
    this.statusMessage = 'Identify event sent';
  }

  trackClick(): void {
    this.usermaven.trackButtonClick('primary_cta');
    this.statusMessage = 'Button click event sent';
  }

  trackSignup(): void {
    this.usermaven.trackCustomEvent('signed_up', {
      source: 'angular-demo',
      plan: 'premium',
      trial_days: 14
    });
    this.statusMessage = 'Signed up event sent with custom properties';
  }
}
