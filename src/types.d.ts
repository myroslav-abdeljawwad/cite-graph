/**
 * Global Type Definitions for the cite-graph extension.
 *
 * These definitions provide strongly‑typed interfaces used across the
 * background script, content script, utilities, UI components, and tests.
 *
 * Author: Myroslav Mokhammad Abdeljawwad
 */

/// <reference lib="dom" />

import type { URL } from 'url';

/**
 * Represents a single citation extracted from an article.
 */
export interface Citation {
  /** Unique identifier for the citation (e.g., DOI or internal ID). */
  id: string;
  /** Human‑readable title of the cited work. */
  title: string;
  /** Primary author(s) in canonical form. */
  authors: readonly string[];
  /** Publication year, if available. */
  year?: number;
  /** URL pointing to the source (e.g., DOI link). */
  url?: string;
  /** The raw text that was parsed as this citation. */
  rawText: string;
}

/**
 * Metadata about an article being processed.
 */
export interface ArticleMetadata {
  /** The article's title. */
  title: string;
  /** Primary author(s) of the article. */
  authors: readonly string[];
  /** Publication year. */
  year?: number;
  /** URL of the article page. */
  url: URL | string;
  /** Optional DOI or other identifier. */
  doi?: string;
}

/**
 * Options that influence how citations are parsed.
 */
export interface ParseOptions {
  /**
   * If true, perform fuzzy matching against known databases
   * (e.g., CrossRef) to enrich citation data.
   */
  enableFuzzyMatch?: boolean;
  /** Maximum number of concurrent API requests. */
  maxConcurrentRequests?: number;
}

/**
 * A node in the citation graph.
 */
export interface GraphNode {
  /** The unique identifier for this node (usually a DOI). */
  id: string;
  /** Display name shown on the graph. */
  label: string;
  /** Type of node: article, book, conference paper, etc. */
  type: 'article' | 'book' | 'conference' | 'thesis' | 'other';
  /** Optional additional metadata for richer tooltips. */
  meta?: Partial<Citation>;
}

/**
 * An edge in the citation graph.
 */
export interface GraphEdge {
  /** Source node ID (citing work). */
  source: string;
  /** Target node ID (cited work). */
  target: string;
  /** Weight indicating strength of citation (e.g., frequency). */
  weight?: number;
}

/**
 * The full structure sent to the UI for rendering.
 */
export interface CitationGraph {
  nodes: readonly GraphNode[];
  edges: readonly GraphEdge[];
}

/**
 * Error type thrown when parsing fails due to malformed input.
 */
export class ParseError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(`Citation parse error: ${message}`);
    this.name = 'ParseError';
    if (cause) {
      // Preserve stack trace of original error for debugging.
      const stack = (cause as any).stack;
      if (stack) this.stack += `\nCaused by: ${stack}`;
    }
  }
}

/**
 * Type guard to check if an object is a Citation.
 */
export function isCitation(obj: unknown): obj is Citation {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as any).id === 'string' &&
    typeof (obj as any).title === 'string' &&
    Array.isArray((obj as any).authors) &&
    (obj as any).rawText && typeof (obj as any).rawText === 'string'
  );
}

/**
 * Type guard to validate GraphNode.
 */
export function isGraphNode(obj: unknown): obj is GraphNode {
  const n = obj as Partial<GraphNode>;
  return (
    typeof n.id === 'string' &&
    typeof n.label === 'string' &&
    ['article', 'book', 'conference', 'thesis', 'other'].includes(n.type ?? '')
  );
}

/**
 * Type guard to validate GraphEdge.
 */
export function isGraphEdge(obj: unknown): obj is GraphEdge {
  const e = obj as Partial<GraphEdge>;
  return (
    typeof e.source === 'string' &&
    typeof e.target === 'string' &&
    (e.weight === undefined || typeof e.weight === 'number')
  );
}

/**
 * Utility to convert a plain object into a strongly typed Citation,
 * throwing ParseError on invalid structure.
 */
export function castToCitation(obj: unknown): Citation {
  if (!isCitation(obj)) {
    throw new ParseError('Invalid citation structure', obj);
  }
  return obj as Citation;
}

/**
 * Utility to create a GraphNode from a Citation, applying defaults.
 */
export function nodeFromCitation(citation: Citation, type?: GraphNode['type']): GraphNode {
  return {
    id: citation.id,
    label: `${citation.title} (${citation.year ?? 'n.d.'})`,
    type: type ?? 'article',
    meta: { ...citation },
  };
}

/**
 * Utility to generate edges from a list of citations referenced by an article.
 */
export function buildEdges(
  citingId: string,
  citedCitations: readonly Citation[],
): GraphEdge[] {
  return citedCitations.map((c) => ({
    source: citingId,
    target: c.id,
    weight: 1, // basic weight; can be enriched later
  }));
}

/**
 * Normalize a URL string or object into a stable canonical form.
 */
export function normalizeUrl(url: string | URL): string {
  try {
    const u = typeof url === 'string' ? new URL(url) : url;
    return `${u.protocol}//${u.host}${u.pathname}`;
  } catch {
    throw new ParseError(`Invalid URL: ${url}`);
  }
}

/**
 * Helper to fetch citation data from an external service.
 *
 * @param doi - DOI of the work to enrich
 * @returns Promise resolving to a Citation or null if not found
 */
export async function fetchCitationByDoi(doi: string): Promise<Citation | null> {
  const endpoint = `https://api.crossref.org/works/${encodeURIComponent(doi)}`;
  try {
    const resp = await fetch(endpoint, { method: 'GET' });
    if (!resp.ok) return null;
    const json = (await resp.json()) as any;
    const item = json.message;
    return {
      id: doi,
      title: Array.isArray(item.title) ? item.title[0] : item.title ?? '',
      authors: (item.author || []).map((a: any) => `${a.given} ${a.family}`),
      year: Number(item.issued?.['date-parts']?.[0]?.[0]),
      url: item.URL,
      rawText: '', // original text not available via API
    };
  } catch {
    return null;
  }
}

/**
 * Exported constants for default configuration.
 */
export const DEFAULT_PARSE_OPTIONS: Required<ParseOptions> = {
  enableFuzzyMatch: false,
  maxConcurrentRequests: 5,
};

/** End of types.d.ts */