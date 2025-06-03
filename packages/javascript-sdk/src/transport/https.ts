import { Transport } from '../core/types';
import { getLogger } from '../utils/logger';
import { Config } from '@/core/types';

// Conditionally import Node.js modules only in Node.js environment
let https: any;
let url: any;

// Check if we're in a Node.js environment
if (typeof process !== 'undefined' && process.versions && process.versions.node) {
  https = require('https');
  url = require('url');
}

export class HttpsTransport implements Transport {
    private config: Config;

    constructor(private trackingHost: string, config: Config, private logger = getLogger()) {
        this.config = config;
    }

    async send(payloads: any[]): Promise<void> {
        const apiKey = this.config.key;
        const fullUrl = this.constructUrl(apiKey);

        // Use different implementations for Node.js and browser environments
        if (typeof process !== 'undefined' && process.versions && process.versions.node) {
            return this.sendNodeJs(fullUrl, payloads);
        } else {
            return this.sendBrowser(fullUrl, payloads);
        }
    }

    private async sendNodeJs(fullUrl: string, payloads: any[]): Promise<void> {
        if (!url || !https) {
            throw new Error('Node.js modules not available');
        }

        const urlObject = new url.URL(fullUrl);
        const options = {
            hostname: urlObject.hostname,
            port: 443,
            path: `${urlObject.pathname}${urlObject.search}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...this.getCustomHeaders()
            }
        };

        return new Promise<void>((resolve, reject) => {
            const req = https.request(options, (res: any) => {
                let data = '';

                res.on('data', (chunk: any) => {
                    data += chunk;
                });

                res.on('end', () => {
                    const statusCode = res.statusCode || 0;  // Default to 0 if undefined
                    if (statusCode >= 200 && statusCode < 300) {
                        this.logger.debug(`Successfully sent ${payloads.length} event(s)`);
                        resolve();
                    } else {
                        reject(new Error(`HTTP error! status: ${statusCode}`));
                    }
                });
            });

            req.on('error', (error: Error) => {
                reject(error);
            });

            req.write(JSON.stringify(payloads));
            req.end();
        });
    }

    private async sendBrowser(fullUrl: string, payloads: any[]): Promise<void> {
        try {
            const response = await fetch(fullUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.getCustomHeaders()
                },
                body: JSON.stringify(payloads)
            });

            if (response.ok) {
                this.logger.debug(`Successfully sent ${payloads.length} event(s)`);
                return;
            } else {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            this.logger.error('Error sending data:', error);
            throw error;
        }
    }

    private constructUrl(apiKey: string): string {
        const cookiePolicy = this.config.cookiePolicy !== "keep" ? `&cookie_policy=${this.config.cookiePolicy}` : "";
        const ipPolicy = this.config.ipPolicy !== "keep" ? `&ip_policy=${this.config.ipPolicy}` : "";
        return `${this.trackingHost}/api/v1/s2s/event?token=${apiKey}${cookiePolicy}${ipPolicy}`;
    }

    private getCustomHeaders(): Record<string, string> {
        if (typeof this.config.customHeaders === 'function') {
            return this.config.customHeaders();
        } else if (this.config.customHeaders) {
            return this.config.customHeaders;
        }
        return {};
    }
}
