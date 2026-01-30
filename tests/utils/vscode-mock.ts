/**
 * VS Code API Mock for Playwright Tests
 *
 * Provides a mock implementation of the VS Code webview API
 * that can be injected into the test harness.
 */

export interface MockVSCodeAPI {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}

export interface MockVSCodeWindow {
  vscode: MockVSCodeAPI;
  _vscodeMessages: unknown[];
  _simulateMessage(message: unknown): void;
  _clearMessages(): void;
  _getMessages(): unknown[];
}

/**
 * JavaScript code to inject into the test harness that creates
 * a mock acquireVsCodeApi function and exposes test hooks.
 */
export const vscodeApiMockScript = `
(function() {
  // Store for messages sent via postMessage
  window._vscodeMessages = [];

  // State storage
  let _state = {};

  // The mock VS Code API
  const mockVSCodeAPI = {
    postMessage: function(message) {
      console.log('[vscode-mock] postMessage:', JSON.stringify(message));
      window._vscodeMessages.push(message);

      // Dispatch a custom event so tests can listen for messages
      window.dispatchEvent(new CustomEvent('vscode-message', {
        detail: message
      }));
    },
    getState: function() {
      return _state;
    },
    setState: function(state) {
      _state = state;
    }
  };

  // Expose the mock API
  window.vscode = mockVSCodeAPI;

  // Mock acquireVsCodeApi to return our mock
  window.acquireVsCodeApi = function() {
    return mockVSCodeAPI;
  };

  // Test helper: Simulate a message from the extension to the webview
  window._simulateMessage = function(message) {
    console.log('[vscode-mock] Simulating message:', JSON.stringify(message));
    window.postMessage(message, '*');
  };

  // Test helper: Clear all captured messages
  window._clearMessages = function() {
    window._vscodeMessages = [];
  };

  // Test helper: Get all captured messages
  window._getMessages = function() {
    return window._vscodeMessages;
  };

  // Test helper: Get messages of a specific type
  window._getMessagesByType = function(type) {
    return window._vscodeMessages.filter(m => m.type === type);
  };

  // Test helper: Wait for a message of a specific type
  window._waitForMessage = function(type, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const existing = window._vscodeMessages.find(m => m.type === type);
      if (existing) {
        resolve(existing);
        return;
      }

      const handler = (event) => {
        if (event.detail.type === type) {
          window.removeEventListener('vscode-message', handler);
          resolve(event.detail);
        }
      };

      window.addEventListener('vscode-message', handler);

      setTimeout(() => {
        window.removeEventListener('vscode-message', handler);
        reject(new Error('Timeout waiting for message: ' + type));
      }, timeout);
    });
  };

  console.log('[vscode-mock] Mock VS Code API initialized');
})();
`;

/**
 * Type declarations for window extensions in tests
 */
declare global {
  interface Window {
    vscode: MockVSCodeAPI;
    _vscodeMessages: unknown[];
    _simulateMessage(message: unknown): void;
    _clearMessages(): void;
    _getMessages(): unknown[];
    _getMessagesByType(type: string): unknown[];
    _waitForMessage(type: string, timeout?: number): Promise<unknown>;
  }
}

export {};
