import React, { useEffect, useState } from 'react';
import { render } from 'react-dom';
import type { CitationMap } from '../types.d';
import GraphView from './graph-view';

/**
 * Popup component for the cite-graph extension.
 *
 * @author Myroslav Mokhammad Abdeljawwad
 */
const Popup: React.FC = () => {
  const [citationMap, setCitationMap] = useState<CitationMap | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Requests the current page's citation map from the background script.
   */
  const fetchCitations = async () => {
    try {
      setLoading(true);
      // Ask the background script for the citations of the active tab
      const result = await chrome.runtime.sendMessage({
        type: 'GET_CITATIONS',
      }) as { success: boolean; data?: CitationMap; error?: string };

      if (!result.success) {
        throw new Error(result.error ?? 'Unknown error retrieving citations');
      }

      setCitationMap(result.data!);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Unexpected error fetching citations';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCitations();
    // Re-fetch when the tab changes
    const listener = () => fetchCitations();
    chrome.tabs.onActivated.addListener(listener);
    return () => chrome.tabs.onActivated.removeListener(listener);
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '1rem', textAlign: 'center' }}>
        Loading citation graph...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '1rem', color: '#d00' }}>
        Error loading citations: {error}
      </div>
    );
  }

  if (!citationMap || Object.keys(citationMap).length === 0) {
    return (
      <div style={{ padding: '1rem', textAlign: 'center' }}>
        No citations found on this page.
      </div>
    );
  }

  return (
    <div style={{ width: '500px', height: '400px' }}>
      <GraphView citationMap={citationMap} />
    </div>
  );
};

// Render the popup into the extension's popup container
document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('root');
  if (root) render(<Popup />, root);
});