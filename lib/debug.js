// lib/debug.js
export const DEBUG_ENABLED = true;

export function debugLog(...args) {
  if (DEBUG_ENABLED) {
    console.log('[DEBUG]', ...args);
  }
}