import { UsermavenClient } from './core/client';
import { Config, defaultConfig } from './core/config';
import { RageClick } from './extensions/rage-click';
import { ScrollDepth } from './extensions/scroll-depth';

export function createUsermavenClient(config: Partial<Config>): UsermavenClient {
    const mergedConfig: Config = { ...defaultConfig, ...config } as Config;

    if (!mergedConfig.apiKey) {
        throw new Error('API key is required');
    }

    if (!mergedConfig.trackingHost) {
        throw new Error('Tracking host is required');
    }

    const client = new UsermavenClient(mergedConfig);

    // Initialize extensions
    new RageClick(client);
    new ScrollDepth(client);

    return client;
}

export { Config } from './core/config';
export { UserProps, EventPayload } from './core/types';
export { LogLevel } from './utils/logger';
