// Common TypeScript declarations for all test files
import { UsermavenGlobal } from '../../src/core/types';
export {};

declare global {
  interface Window {
    // Common properties
    usermaven?: UsermavenGlobal;
    usermavenClient?: Function;
    usermavenScriptTagClient?: Function;
    usermavenQ?: any[];

    // jQuery/AMD related properties
    jQuery?: any;
    $?: any;
    define?: Function & { amd?: any };
    require?: Function;
    requirejs?: Function;

    // Namespace specific properties
    analytics?: Function;
    tracker?: Function;
    analyticsQ?: any[];
    trackerQ?: any[];

    // Test helpers and results
    capturedEvents?: any[] & {
      default?: any[];
      analytics?: any[];
      tracker?: any[];
    };

    // Scroll depth test utilities
    scrollDepthTest?: {
      scrollDepthInstance: any;
      updateStatus: (message: string) => void;
      testShortPage: () => void;
      testLongPage: () => void;
      testVeryShortPage: () => void;
      simulateScroll: (percentage: number) => void;
      sendManualEvent: () => void;
      getCurrentScrollDepth: () => number;
      currentScrollDepth: number | null;
    };

    testHelpers?: {
      // AMD/jQuery test helpers
      checkAMDLoaded?: () => boolean;
      checkScriptTagLoaded?: () => boolean;
      getEventCounts?: () => {
        scriptTag?: number;
        amd?: number;
        default?: number;
        analytics?: number;
        tracker?: number;
      };

      // Namespace test helpers
      checkNamespaces?: () => {
        default: boolean;
        analytics: boolean;
        tracker: boolean;
      };
    };

    // AMD test results
    testResults?: {
      amdLoaded: boolean;
      clientCreated: boolean;
      trackingWorked: boolean;
      errors: string[];
    };
  }
}
