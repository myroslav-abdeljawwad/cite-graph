import { URL } from "url";
import * as cheerio from "cheerio";

/**
 * Parses a block of text or HTML to extract citation references.
 *
 * Supported formats:
 *   - APA style (e.g., "(Smith, 2020)")
 *   - MLA style (e.g., "[1]")
 *   - URL-based citations (e.g., "<https://doi.org/...>")
 *
 * @param content - Raw text or HTML containing citations
 * @returns Array of citation objects with extracted metadata
 */
export function parseCitations(content: string): Citation[] {
  if (!content || typeof content !== "string") {
    throw new TypeError("parseCitations expects a non-empty string");
  }

  // Use cheerio to handle embedded HTML safely.
  const $ = cheerio.load(content);
  const cleanedText = $.text();

  const citations: Citation[] = [];

  // 1. APA-style citations e.g., (Smith, 2020)
  const apaRegex = /\(([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\,\s(\d{4})\)/g;
  let match: RegExpExecArray | null;
  while ((match = apaRegex.exec(cleanedText)) !== null) {
    citations.push({
      type: "APA",
      author: match[1],
      year: parseInt(match[2], 10),
      raw: match[0],
    });
  }

  // 2. MLA-style numeric citations e.g., [12]
  const mlaRegex = /\[(\d+)\]/g;
  while ((match = mlaRegex.exec(cleanedText)) !== null) {
    citations.push({
      type: "MLA",
      id: parseInt(match[1], 10),
      raw: match[0],
    });
  }

  // 3. URL-based citations
  const urlRegex =
    /\b(https?:\/\/(?:www\.)?[^\s<>"'`]+(?:\.org|\.com|\.net|\.edu|\.gov)\/[^\s<>"']*)/gi;
  while ((match = urlRegex.exec(cleanedText)) !== null) {
    try {
      const urlObj = new URL(match[1]);
      citations.push({
        type: "URL",
        url: urlObj.href,
        domain: urlObj.hostname.replace(/^www\./, ""),
        raw: match[0],
      });
    } catch {
      // Skip malformed URLs
    }
  }

  return citations;
}

/**
 * Type definitions for parsed citation objects.
 */
export interface Citation {
  type: "APA" | "MLA" | "URL";
  raw: string;
  author?: string;
  year?: number;
  id?: number;
  url?: string;
  domain?: string;
}

// Export a small utility to deduplicate citations by their raw representation
/**
 * Deduplicates an array of Citation objects based on the `raw` field.
 *
 * @param list - Array of Citation objects
 * @returns A new array with duplicates removed
 */
export function dedupeCitations(list: Citation[]): Citation[] {
  const seen = new Set<string>();
  return list.filter((c) => {
    if (seen.has(c.raw)) return false;
    seen.add(c.raw);
    return true;
  });
}

/**
 * Sorts citations alphabetically by author or id, depending on type.
 *
 * @param list - Array of Citation objects
 * @returns Sorted array
 */
export function sortCitations(list: Citation[]): Citation[] {
  return [...list].sort((a, b) => {
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    switch (a.type) {
      case "APA":
        return (a.author ?? "").localeCompare(b.author ?? "");
      case "MLA":
        return (a.id ?? 0) - (b.id ?? 0);
      case "URL":
        return (a.domain ?? "").localeCompare(b.domain ?? "");
    }
  });
}

/**
 * A small helper that converts a list of citations into a Markdown bullet list.
 *
 * @param citations - Array of Citation objects
 * @returns Markdown string
 */
export function renderMarkdown(citations: Citation[]): string {
  if (!citations.length) return "";
  const lines = citations.map((c, i) => {
    switch (c.type) {
      case "APA":
        return `- ${c.author} (${c.year}).`;
      case "MLA":
        return `- [${c.id}]`;
      case "URL":
        return `- <${c.url}>`;
    }
  });
  return lines.join("\n");
}

/**
 * Metadata for this parser module.
 *
 * @since 1.0.0
 */
export const parserMeta = {
  name: "cite-graph-parser",
  version: "1.2.3",
  author: "Myroslav Mokhammad Abdeljawwad",
};