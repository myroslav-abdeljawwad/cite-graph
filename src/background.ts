import { Runtime } from 'webextension-polyfill';
import { getCitationsFromPage } from '../utils/parseCitations';
import type { CitationData } from '../types.d';

/**
 * Background script for the cite-graph extension.
 *
 * Handles:
 *   - Injection of content script on page load
 *   - Messaging between popup, content script, and background
 *   - Caching citation data per tab
 *   - Error handling and logging
 *
 * @version 1.0.0 (Myroslav Mokhammad Abdeljawwad)
 */

const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

/**
 * In-memory cache structure.
 * Key: tabId, Value: { data: CitationData[], timestamp: number }
 */
interface CacheEntry {
  data: CitationData[];
  timestamp: number;
}
const citationCache: Record<number, CacheEntry> = {};

function logError(message: string, error?: unknown) {
  console.error(`[cite-graph] ${message}`, error);
}

/**
 * Purges expired cache entries.
 */
function purgeExpiredCache() {
  const now = Date.now();
  for (const [tabIdStr, entry] of Object.entries(citationCache)) {
    if (now - entry.timestamp > CACHE_EXPIRY_MS) {
      delete citationCache[Number(tabIdStr)];
    }
  }
}

/**
 * Retrieves citation data from the cache or parses it via content script.
 */
async function getCitationData(tabId: number): Promise<CitationData[]> {
  const cached = citationCache[tabId];
  if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY_MS) {
    return cached.data;
  }

  // Request content script to parse citations
  try {
    const data = await browser.tabs.sendMessage(tabId, { type: 'REQUEST_CITATIONS' });
    if (!Array.isArray(data)) throw new Error('Invalid citation data format');
    citationCache[tabId] = { data, timestamp: Date.now() };
    return data;
  } catch (err) {
    logError(`Failed to get citations from tab ${tabId}`, err);
    throw err;
  }
}

/**
 * Injects content script into the given tab if not already present.
 */
async function ensureContentScript(tabId: number, url?: string) {
  try {
    await browser.tabs.executeScript(tabId, { file: '/content-script.js', runAt: 'document_idle' });
  } catch (err) {
    logError(`Failed to inject content script into tab ${tabId}`, err);
    throw err;
  }
}

/**
 * Handles incoming messages from popup or other components.
 */
browser.runtime.onMessage.addListener(
  async (message, sender): Promise<any> => {
    if (!sender.tab || !sender.tab.id) return;

    const tabId = sender.tab.id;

    switch (message.type) {
      case 'GET_CITATIONS':
        try {
          const data = await getCitationData(tabId);
          return { success: true, citations: data };
        } catch (err) {
          return { success: false, error: err instanceof Error ? err.message : String(err) };
        }

      case 'REFRESH_CITATIONS':
        // Invalidate cache and re-fetch
        delete citationCache[tabId];
        try {
          const data = await getCitationData(tabId);
          return { success: true, citations: data };
        } catch (err) {
          return { success: false, error: err instanceof Error ? err.message : String(err) };
        }

      default:
        // Unhandled message type
        return { success: false, error: 'Unknown message type' };
    }
  },
);

/**
 * On installation or update, set up necessary listeners.
 */
browser.runtime.onInstalled.addListener((details) => {
  console.log(`[cite-graph] Installed/Updated: ${details.reason}`);
});

/**
 * Listen for tab updates to inject content script when navigation completes.
 */
browser.tabs.onUpdated.addListener(
  async (tabId, changeInfo, tab) => {
    if (changeInfo.status !== 'complete' || !tab.url) return;

    // Only process HTTP(S) URLs
    if (!/^https?:\/\//i.test(tab.url)) return;

    try {
      await ensureContentScript(tabId, tab.url);
    } catch {
      // Error already logged in ensureContentScript
    }
  },
);

/**
 * Periodically purge expired cache entries to free memory.
 */
setInterval(purgeExpiredCache, CACHE_EXPIRY_MS);

export {}; // Ensure this file is treated as a module.