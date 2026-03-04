/**
 * Content script for cite-graph.
 *
 * Injected into every page by the browser extension. It scans the DOM for
 * citation references, parses them using {@link parseCitations}, and sends the
 * resulting graph data to the background script. The background script then
 * forwards it to any active popup or other components that need to render
 * the interactive graph.
 *
 * @author Myroslav Mokhammad Abdeljawwad
 */

import { parseCitations } from '../utils/parseCitations';
import type { CitationNode, GraphData } from '../types.d';

/**
 * Extracts citation elements from the page and returns an array of
 * {@link CitationNode} objects. It looks for common patterns such as superscript
 * numbers, bracketed references, or custom data attributes.
 *
 * @returns {CitationNode[]} Array of parsed citations found on the page.
 */
function extractCitations(): CitationNode[] {
  const nodes: CitationNode[] = [];

  // Common citation selectors used in academic articles.
  const selectors = [
    'sup[data-cite]',          // e.g., <sup data-cite="ref1">[1]</sup>
    'a[href^="#cite-"]',       // e.g., <a href="#cite-123">1</a>
    '[data-reference-id]',     // custom attribute
  ];

  selectors.forEach((sel) => {
    const elements = document.querySelectorAll<HTMLElement>(sel);
    elements.forEach((el) => {
      try {
        const id = el.getAttribute('id') || el.getAttribute('href')?.slice(1) || '';
        const text = el.textContent?.trim() ?? '';

        if (!id && !text) return;

        nodes.push({
          id,
          label: text,
          sourceElement: el as HTMLElement,
        });
      } catch (e) {
        // Log but continue scanning.
        console.warn('cite-graph: failed to parse citation element', el, e);
      }
    });
  });

  return nodes;
}

/**
 * Builds a graph data structure from the extracted citations. For this
 * simplified example, each citation is considered a node with no edges,
 * but the infrastructure allows future expansion.
 *
 * @param {CitationNode[]} citations
 * @returns {GraphData}
 */
function buildGraph(citations: CitationNode[]): GraphData {
  return {
    nodes: citations.map((c) => ({ id: c.id, label: c.label })),
    links: [], // No relationships yet; placeholder for future link extraction.
  };
}

/**
 * Sends the graph data to the background script. If the background
 * does not respond within a timeout, it logs an error.
 *
 * @param {GraphData} graph
 */
function sendGraphToBackground(graph: GraphData): void {
  const message = { type: 'CITATION_GRAPH', payload: graph };

  chrome.runtime.sendMessage(message, (response) => {
    if (chrome.runtime.lastError) {
      console.error('cite-graph: failed to send graph to background:', chrome.runtime.lastError);
      return;
    }
    // Optional: handle acknowledgment from background.
    if (response && response.status !== 'ok') {
      console.warn('cite-graph: background responded with non-ok status', response);
    }
  });
}

/**
 * Main entry point for the content script. It extracts citations,
 * builds a graph, and sends it to the background.
 */
function main(): void {
  try {
    const citations = extractCitations();
    if (!citations.length) {
      console.info('cite-graph: no citations found on this page.');
      return;
    }

    const graph = buildGraph(citations);
    sendGraphToBackground(graph);
  } catch (err) {
    console.error('cite-graph: unexpected error in content script', err);
  }
}

// Run the main function when the DOM is fully loaded.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}