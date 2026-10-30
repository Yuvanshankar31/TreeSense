import { vi } from 'vitest';

const documentListeners = [];
let addEventListenerPatched = false;

// The scripts register listeners on `document`, which outlives a single test in
// a jsdom environment. Recording them keeps stale handlers from earlier loads
// out of the next test.
function patchDocumentAddEventListener() {
  if (addEventListenerPatched) return;
  const original = document.addEventListener.bind(document);
  document.addEventListener = (type, listener, options) => {
    documentListeners.push([type, listener, options]);
    original(type, listener, options);
  };
  addEventListenerPatched = true;
}

function removeDocumentListeners() {
  for (const [type, listener, options] of documentListeners) {
    document.removeEventListener(type, listener, options);
  }
  documentListeners.length = 0;
}

/**
 * Re-executes one of the browser scripts inside the current jsdom document.
 * The scripts have no exports, so they are imported for their side effects
 * only; resetting the module registry first makes each test start from a
 * freshly evaluated copy of the script.
 */
export async function loadScript(name) {
  patchDocumentAddEventListener();
  removeDocumentListeners();
  vi.resetModules();
  switch (name) {
    case 'app':
      await import('../../src/assets/js/app.js');
      break;
    case 'bar':
      await import('../../src/assets/js/bar.js');
      break;
    case 'chatbot':
      await import('../../src/assets/js/chatbot.js');
      break;
    case 'script':
      await import('../../src/assets/js/script.js');
      break;
    default:
      throw new Error(`Unknown script: ${name}`);
  }
}

export function fireDomReady() {
  document.dispatchEvent(new Event('DOMContentLoaded'));
}

/** Lets pending promise callbacks and zero-delay timers run. */
export function flushAsync() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
