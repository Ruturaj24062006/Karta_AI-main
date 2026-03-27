import { useMemo } from 'react';

type GraphNode = {
  id: string;
  label?: string;
  color?: string;
};

type GraphLink = {
  source?: string | number;
  target?: string | number;
  from?: string;
  to?: string;
  label?: string;
  value?: number;
};

type Props = {
  graphData?: {
    nodes?: GraphNode[];
    links?: GraphLink[];
    edges?: GraphLink[];
  };
  height?: number;
};

type PositionedNode = {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
};

type DisplayLink = {
  sourceId: string;
  targetId: string;
  label: string;
};

export default function FraudGraph({ graphData, height = 380 }: Props) {
  const rawNodes = graphData?.nodes || [];
  const rawLinks = (graphData?.links && graphData.links.length > 0 ? graphData.links : graphData?.edges) || [];

  if (rawNodes.length === 0 || rawLinks.length === 0) {
    return (
      <div
        style={{
          height,
          border: '1px solid #E2E8F0',
          borderRadius: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#F8FAFC',
          color: '#166534',
          fontWeight: 600,
        }}
      >
        No circular links detected in this analysis.
      </div>
    );
  }

  const width = 1200;
  const viewHeight = 680;
  const centerX = width / 2;
  const centerY = viewHeight / 2;
  const radius = Math.min(width, viewHeight) / 2 - 120;

  const nodes = useMemo<PositionedNode[]>(() => {
    const total = rawNodes.length;
    if (total === 1) {
      const only = rawNodes[0];
      return [{
        id: String(only.id),
        name: only.label || String(only.id),
        color: only.color || '#64748B',
        x: centerX,
        y: centerY,
      }];
    }

    return rawNodes.map((n, idx) => {
      const angle = (Math.PI * 2 * idx) / Math.max(total, 1) - Math.PI / 2;
      return {
        id: String(n.id),
        name: n.label || String(n.id),
        color: n.color || '#64748B',
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      };
    });
  }, [rawNodes, centerX, centerY, radius]);

  const nodeIds = useMemo(() => new Set(nodes.map((n) => n.id)), [nodes]);

  const links = useMemo<DisplayLink[]>(() => {
    const resolveEndpoint = (candidate: string | number | undefined): string | undefined => {
      if (typeof candidate === 'number') {
        const indexed = nodes[candidate];
        return indexed ? indexed.id : undefined;
      }
      if (typeof candidate === 'string') {
        return candidate;
      }
      return undefined;
    };

    return rawLinks
      .map((l) => {
        const sourceId = resolveEndpoint(l.source ?? l.from);
        const targetId = resolveEndpoint(l.target ?? l.to);

        if (!sourceId || !targetId) return null;
        if (!nodeIds.has(sourceId) || !nodeIds.has(targetId)) return null;

        return {
          sourceId,
          targetId,
          label: l.label || '',
        };
      })
      .filter((l): l is DisplayLink => Boolean(l));
  }, [rawLinks, nodes, nodeIds]);

  if (links.length === 0) {
    return (
      <div
        style={{
          height,
          border: '1px solid #E2E8F0',
          borderRadius: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#F8FAFC',
          color: '#166534',
          fontWeight: 600,
        }}
      >
        Graph nodes loaded, but no valid links were found.
      </div>
    );
  }

  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  return (
    <div style={{ height, border: '1px solid #E2E8F0', borderRadius: 16, background: '#FFFFFF', overflow: 'hidden' }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${viewHeight}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <marker
            id="fraud-graph-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#94A3B8" />
          </marker>
        </defs>

        <rect x={0} y={0} width={width} height={viewHeight} fill="#F8FAFC" />

        {links.map((link, idx) => {
          const source = nodeById.get(link.sourceId);
          const target = nodeById.get(link.targetId);
          if (!source || !target) return null;

          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const distance = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
          const offsetScale = source.id === target.id ? 70 : 34 + ((idx % 3) * 10);
          const nx = -dy / distance;
          const ny = dx / distance;
          const controlX = (source.x + target.x) / 2 + nx * offsetScale;
          const controlY = (source.y + target.y) / 2 + ny * offsetScale;
          const labelX = 0.25 * source.x + 0.5 * controlX + 0.25 * target.x;
          const labelY = 0.25 * source.y + 0.5 * controlY + 0.25 * target.y;

          return (
            <g key={`${link.sourceId}-${link.targetId}-${idx}`}>
              <path
                d={`M ${source.x} ${source.y} Q ${controlX} ${controlY} ${target.x} ${target.y}`}
                fill="none"
                stroke="#94A3B8"
                strokeOpacity={0.75}
                strokeWidth={2.2}
                markerEnd="url(#fraud-graph-arrow)"
              />
              {link.label && (
                <text
                  x={labelX}
                  y={labelY}
                  fontSize={14}
                  textAnchor="middle"
                  fill="#475569"
                  style={{ pointerEvents: 'none' }}
                >
                  {link.label}
                </text>
              )}
            </g>
          );
        })}

        {nodes.map((node) => {
          const labelLength = Math.min(node.name.length, 28);
          const boxWidth = Math.max(110, 16 + labelLength * 8);
          const boxHeight = 44;

          return (
            <g key={node.id} transform={`translate(${node.x - boxWidth / 2}, ${node.y - boxHeight / 2})`}>
              <rect
                width={boxWidth}
                height={boxHeight}
                rx={10}
                fill={node.color}
                stroke="#0F172A"
                strokeOpacity={0.12}
              />
              <text
                x={boxWidth / 2}
                y={boxHeight / 2 + 5}
                textAnchor="middle"
                fontSize={13}
                fontWeight={600}
                fill={node.color === '#FF0000' || node.color === '#1C335B' ? '#FFFFFF' : '#0F172A'}
              >
                {node.name.length > 28 ? `${node.name.slice(0, 25)}...` : node.name}
              </text>
              <title>{node.name}</title>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
