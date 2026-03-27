import { ResponsiveContainer, Sankey, Tooltip } from 'recharts';

type GraphNode = {
  id: string;
  label?: string;
  color?: string;
};

type GraphLink = {
  source: string;
  target: string;
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

function normalizeValue(link: GraphLink): number {
  if (typeof link.value === 'number' && Number.isFinite(link.value) && link.value > 0) {
    return link.value;
  }

  if (link.label) {
    const parsed = parseFloat(link.label.replace(/[^\d.]/g, ''));
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }

  return 1;
}

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

  const indexByNodeId = new Map<string, number>();
  const nodes = rawNodes.map((n, idx) => {
    const id = String(n.id);
    indexByNodeId.set(id, idx);
    return {
      id,
      name: n.label || id,
      color: n.color || '#64748B',
    };
  });

  const links = rawLinks
    .map((l) => {
      const source = indexByNodeId.get(String(l.source));
      const target = indexByNodeId.get(String(l.target));
      if (source === undefined || target === undefined) return null;

      return {
        source,
        target,
        value: normalizeValue(l),
        label: l.label || '',
      };
    })
    .filter((l): l is NonNullable<typeof l> => Boolean(l));

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

  return (
    <div style={{ height, border: '1px solid #E2E8F0', borderRadius: 16, background: '#FFFFFF' }}>
      <ResponsiveContainer width="100%" height="100%">
        <Sankey
          data={{ nodes, links }}
          node={{
            width: 14,
          }}
          nodePadding={16}
          link={{
            stroke: '#94A3B8',
            strokeOpacity: 0.45,
          }}
          margin={{ top: 24, right: 24, bottom: 24, left: 24 }}
        >
          <Tooltip
            formatter={(value: any, _name, props: any) => {
              const label = props?.payload?.label;
              const display = typeof value === 'number' ? value.toLocaleString('en-IN') : value;
              return [label || display, 'Transaction Flow'];
            }}
          />
        </Sankey>
      </ResponsiveContainer>
    </div>
  );
}
