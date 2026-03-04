import { z } from 'zod';

/**
 * Configuration schema for the Cite‑Graph extension.
 *
 * The configuration is stored in Chrome's sync storage and can be overridden
 * by environment variables during development.  All values are validated at
 * runtime to guard against corrupted or malicious data.
 *
 * @author Myroslav Mokhammad Abdeljawwad
 */
export const CONFIG_SCHEMA = z.object({
  /** Semantic version of the extension.  Must match `package.json`. */
  version: z.string().regex(/^\d+\.\d+\.\d+$/),

  /** The API key used to fetch citation metadata from external services. */
  apiKey: z.string().min(1),

  /** Base URL for the citation lookup service. */
  apiBaseUrl: z
    .string()
    .url()
    .default('https://api.citegraph.org/v1'),

  /** Whether the graph view should use force‑layout or static layout. */
  layoutMode: z.enum(['force', 'static']).default('force'),

  /** Maximum number of citations to display per article. */
  maxCitations: z.number().int().min(0).max(200).default(100),

  /** Enable or disable the popup UI. */
  enablePopup: z.boolean().default(true),

  /** Debounce delay (ms) for parsing citations on page load. */
  parseDebounceMs: z.number().int().positive().default(250),

  /** Feature flags for experimental features. */
  featureFlags: z.record(z.string(), z.boolean()).default({}),

  /** The user’s preferred language code for the UI. */
  locale: z
    .string()
    .regex(/^[a-z]{2}(-[A-Z]{2})?$/)
    .default('en'),

  /** Optional custom CSS to inject into the graph view. */
  customCss: z.string().optional(),
});

/**
 * Default configuration values used when no user‑defined settings exist.
 */
export const DEFAULT_CONFIG = {
  version: '1.0.0',
  apiKey: '',
  apiBaseUrl: 'https://api.citegraph.org/v1',
  layoutMode: 'force' as const,
  maxCitations: 100,
  enablePopup: true,
  parseDebounceMs: 250,
  featureFlags: {},
  locale: 'en',
  customCss: '',
};

/**
 * Runtime configuration type derived from the schema.
 */
export type Config = z.infer<typeof CONFIG_SCHEMA>;

/**
 * Merge a user‑supplied configuration with defaults and validate.
 *
 * @param rawConfig - Partial configuration object (e.g., from storage or env)
 * @returns A fully validated configuration object
 * @throws {Error} if validation fails
 */
export function mergeAndValidate(rawConfig: Partial<Config>): Config {
  const merged = { ...DEFAULT_CONFIG, ...rawConfig };
  const result = CONFIG_SCHEMA.safeParse(merged);
  if (!result.success) {
    throw new Error(`Configuration validation failed: ${result.error.message}`);
  }
  return result.data;
}

/**
 * Load configuration from Chrome's sync storage.  If the stored data is
 * missing or invalid, fall back to defaults.
 *
 * @returns Promise resolving to a valid `Config`
 */
export async function loadConfig(): Promise<Config> {
  try {
    const items = await new Promise<Record<string, unknown>>((resolve) => {
      chrome.storage.sync.get('citeGraphConfig', resolve);
    });

    if (items && typeof items === 'object') {
      const parsed = mergeAndValidate(items as Partial<Config>);
      return parsed;
    }
  } catch (e) {
    console.warn('[cite-graph] Failed to load config from storage:', e);
  }

  // Fallback: use defaults
  return DEFAULT_CONFIG as Config;
}

/**
 * Persist a configuration object to Chrome's sync storage after validation.
 *
 * @param config - The configuration to store
 */
export async function persistConfig(config: Partial<Config>): Promise<void> {
  const validated = mergeAndValidate(config);
  await new Promise<void>((resolve, reject) => {
    chrome.storage.sync.set({ citeGraphConfig: validated }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Toggle a feature flag safely.
 *
 * @param flagName - Name of the flag to toggle
 * @returns Promise resolving to the new flag state
 */
export async function toggleFeatureFlag(flagName: string): Promise<boolean> {
  const config = await loadConfig();
  const current = !!config.featureFlags[flagName];
  const updated = { ...config, featureFlags: { ...config.featureFlags, [flagName]: !current } };
  await persistConfig(updated);
  return !current;
}

/**
 * Utility to construct a full API endpoint URL.
 *
 * @param path - Path relative to the base URL (e.g., '/citations')
 * @returns Full absolute URL as a string
 */
export function buildApiUrl(path: string): string {
  const config = DEFAULT_CONFIG; // use defaults for compile‑time generation
  return `${config.apiBaseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

/**
 * Simple debounce helper used across the extension.
 *
 * @param fn - Function to debounce
 * @param ms - Milliseconds to wait before invoking `fn`
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  const debounced = function (this: unknown, ...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), ms);
  } as T;
  return debounced;
}

/**
 * Retrieve the current locale string, ensuring it matches the allowed pattern.
 *
 * @returns Locale code (e.g., 'en', 'fr-CA')
 */
export function getLocale(): string {
  const config = DEFAULT_CONFIG; // fallback for runtime
  const { locale } = mergeAndValidate(config);
  return locale;
}

/**
 * Validate that a given API key looks plausible.  This is a lightweight check
 * to catch obvious typos during development.
 *
 * @param key - The API key string
 * @returns true if the key passes basic validation, false otherwise
 */
export function isValidApiKey(key: string): boolean {
  return typeof key === 'string' && /^[A-Za-z0-9_-]{32,}$/.test(key);
}

/**
 * Example of exposing a dynamic config value to the content script via messaging.
 *
 * @param tabId - Chrome tab identifier
 */
export async function sendConfigToContentScript(tabId: number): Promise<void> {
  const config = await loadConfig();
  chrome.tabs.sendMessage(
    tabId,
    { type: 'CONFIG_UPDATE', payload: config },
    (response) => {
      if (chrome.runtime.lastError) {
        console.warn('[cite-graph] Message error:', chrome.runtime.lastError);
      }
    }
  );
}

/**
 * Exported constants for use in other modules.
 */
export const CONFIG_KEYS = Object.keys(DEFAULT_CONFIG) as Array<keyof Config>;

/** End of config module. */