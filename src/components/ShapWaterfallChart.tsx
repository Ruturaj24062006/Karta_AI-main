import {
  Bar,
  CartesianGrid,
  ComposedChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type RiskDriverInput = {
  feature: string;
  impact: number | string;
};

type WaterfallRow = {
  feature: string;
  change: number;
  start: number;
  end: number;
  offset: number;
  magnitude: number;
  direction: 'up' | 'down' | 'neutral' | 'total';
};

type Props = {
  drivers: RiskDriverInput[];
  baseRisk?: number;
  height?: number;
};

function toNumber(value: number | string): number {
  if (typeof value === 'number') return value;
  const parsed = parseFloat(String(value).replace('%', '').trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildWaterfallData(drivers: RiskDriverInput[], baseRisk: number): WaterfallRow[] {
  let cumulative = baseRisk;

  const rows: WaterfallRow[] = drivers.map((driver) => {
    const change = toNumber(driver.impact);
    const start = cumulative;
    const end = cumulative + change;
    cumulative = end;

    const direction: WaterfallRow['direction'] =
      change > 0 ? 'up' : change < 0 ? 'down' : 'neutral';

    return {
      feature: driver.feature,
      change,
      start,
      end,
      offset: Math.min(start, end),
      magnitude: Math.abs(change),
      direction,
    };
  });

  rows.push({
    feature: 'Final Risk',
    change: cumulative - baseRisk,
    start: 0,
    end: cumulative,
    offset: 0,
    magnitude: Math.abs(cumulative),
    direction: 'total',
  });

  return rows;
}

export default function SHAPWaterfallChart({ drivers, baseRisk = 0, height = 320 }: Props) {
  const chartData = buildWaterfallData(drivers, baseRisk);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: 4, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
        <XAxis dataKey="feature" tick={{ fontSize: 12 }} />
        <YAxis
          tick={{ fontSize: 12 }}
          tickFormatter={(v) => `${Number(v).toFixed(1)}%`}
        />

        <Tooltip
          formatter={(value: any, name: any, payload: any) => {
            if (name === 'magnitude') {
              const row = payload?.payload as WaterfallRow | undefined;
              if (!row) return [String(value ?? ''), 'Value'];
              if (row.direction === 'total') {
                return [`${row.end.toFixed(2)}%`, 'Final Risk'];
              }
              const sign = row.change > 0 ? '+' : '';
              return [`${sign}${row.change.toFixed(2)}%`, 'Driver Impact'];
            }
            return [String(value ?? ''), String(name ?? 'Value')];
          }}
          labelFormatter={(_, items) => {
            const row = items?.[0]?.payload as WaterfallRow | undefined;
            if (!row) return '';
            if (row.direction === 'total') {
              return `Final Risk: ${row.end.toFixed(2)}%`;
            }
            return `${row.feature}: ${row.start.toFixed(2)}% -> ${row.end.toFixed(2)}%`;
          }}
        />

        <ReferenceLine
          y={baseRisk}
          stroke="#64748B"
          strokeDasharray="4 4"
          label={{ value: 'Base Risk', position: 'insideTopRight', fill: '#64748B', fontSize: 11 }}
        />

        <Bar dataKey="offset" stackId="wf" fill="transparent" isAnimationActive={false} />
        <Bar
          dataKey="magnitude"
          stackId="wf"
          radius={[4, 4, 0, 0]}
          isAnimationActive={false}
          fill="#64748B"
          shape={(props) => {
            const { x, y, width, height, payload } = props as {
              x: number;
              y: number;
              width: number;
              height: number;
              payload: WaterfallRow;
            };

            let color = '#94A3B8';
            if (payload.direction === 'up') color = '#DC2626';
            if (payload.direction === 'down') color = '#16A34A';
            if (payload.direction === 'total') color = '#1D4ED8';

            return <rect x={x} y={y} width={width} height={height} fill={color} rx={4} ry={4} />;
          }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
