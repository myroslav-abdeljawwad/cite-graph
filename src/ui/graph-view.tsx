import React, { useEffect, useRef } from 'react';
import type { FC } from 'react';
import ForceGraph2D, { NodeObject, LinkObject } from 'react-force-graph-2d';
import PropTypes from 'prop-types';

/**
 * CiteGraph – Interactive Citation Map
 *
 * This component renders a force‑directed graph of citations extracted from an article.
 * It relies on the `react-force-graph` library to provide a lightweight, highly
 * configurable visualization. The data is supplied via props and can be updated
 * dynamically as new citations are parsed by the content script.
 *
 * @author Myroslav Mokhammad Abdeljawwad
 */

export interface CitationNode extends NodeObject {
  id: string;
  title?: string;
  authors?: string[];
}

export interface CitationLink extends LinkObject {
  source: string | CitationNode;
  target: string | CitationNode;
  label?: string;
}

/**
 * Props for GraphView.
 *
 * @param nodes Array of citation nodes. Each node must have a unique `id`.
 * @param links Array of directed edges representing citations (source cites target).
 * @param width Optional width in pixels; defaults to 800.
 * @param height Optional height in pixels; defaults to 600.
 */
export interface GraphViewProps {
  nodes: CitationNode[];
  links: CitationLink[];
  width?: number;
  height?: number;
}

/**
 * A React component that renders a citation graph using react-force-graph-2d.
 *
 * The component accepts an array of nodes and links. It performs minimal validation
 * to ensure the data is well‑formed before rendering. If invalid data is detected,
 * it falls back to a user‑friendly error message instead of crashing the extension.
 */
const GraphView: FC<GraphViewProps> = ({
  nodes,
  links,
  width = 800,
  height = 600,
}) => {
  const graphRef = useRef<ForceGraph2D>(null);

  // Basic validation
  const validateData = (): boolean => {
    if (!Array.isArray(nodes) || !Array.isArray(links)) return false;
    const nodeIds = new Set<string>();
    for (const n of nodes) {
      if (!n.id) return false;
      nodeIds.add(n.id);
    }
    for (const l of links) {
      const srcId =
        typeof l.source === 'string' ? l.source : l.source?.id ?? '';
      const tgtId =
        typeof l.target === 'string' ? l.target : l.target?.id ?? '';
      if (!nodeIds.has(srcId) || !nodeIds.has(tgtId)) return false;
    }
    return true;
  };

  useEffect(() => {
    if (validateData() && graphRef.current) {
      // Force re‑render when data changes
      graphRef.current.d3Force('link').distance(120);
      graphRef.current.graphData({ nodes, links });
    }
  }, [nodes, links]);

  if (!validateData()) {
    return (
      <div style={{ color: '#c00', padding: '1rem' }}>
        Invalid citation data – please check the source.
      </div>
    );
  }

  // Custom node rendering for better UX
  const nodeCanvasObject = (node: CitationNode, ctx: CanvasRenderingContext2D) => {
    const label = node.title ?? node.id;
    const fontSize = 12;
    ctx.font = `${fontSize}px sans-serif`;
    const textWidth = ctx.measureText(label).width;
    const bckgDimensions = [textWidth + 8, fontSize + 4]; // some padding

    // draw circle
    ctx.beginPath();
    ctx.arc(node.x ?? 0, node.y ?? 0, 20, 0, Math.PI * 2, false);
    ctx.fillStyle = '#ffcc00';
    ctx.fill();

    // draw text background
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillRect(
      (node.x ?? 0) - bckgDimensions[0] / 2,
      (node.y ?? 0) - fontSize / 2 - 2,
      bckgDimensions[0],
      bckgDimensions[1]
    );

    // draw text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000';
    ctx.fillText(label, node.x ?? 0, node.y ?? 0);
  };

  return (
    <ForceGraph2D
      ref={graphRef}
      width={width}
      height={height}
      graphData={{ nodes, links }}
      nodeCanvasObject={nodeCanvasObject}
      linkDirectionalArrowLength={6}
      linkDirectionalArrowRelPos={1}
      enableNodeDrag={true}
      backgroundColor="#f5f5f5"
    />
  );
};

GraphView.propTypes = {
  nodes: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string,
      authors: PropTypes.arrayOf(PropTypes.string),
    })
  ).isRequired,
  links: PropTypes.arrayOf(
    PropTypes.shape({
      source: PropTypes.oneOfType([PropTypes.string, PropTypes.object]).isRequired,
      target: PropTypes.oneOfType([PropTypes.string, PropTypes.object]).isRequired,
      label: PropTypes.string,
    })
  ).isRequired,
  width: PropTypes.number,
  height: PropTypes.number,
};

export default GraphView;