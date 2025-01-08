/// <reference types="vitest" />

import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';

declare global {
    namespace Vi {
        interface JestAssertion<T = any>
            extends jest.Matchers<void, T>,
                TestingLibraryMatchers<T, void> {}
    }

    interface Window {
        localStorage: Storage;
    }

    var localStorage: Storage;
    var XMLHttpRequest: new () => XMLHttpRequest;
}

export {};
