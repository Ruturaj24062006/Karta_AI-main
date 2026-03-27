import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type BenchmarkMetric = {
  metric: string;
  bharat: number;
  benchmark: number;
};

type Props = {
  data?: BenchmarkMetric[];
  height?: number;
};

const defaultData: BenchmarkMetric[] = [
  { metric: 'Current Ratio', bharat: 1.7, benchmark: 1.5 },
  { metric: 'DSCR', bharat: 1.35, benchmark: 1.25 },
  { metric: 'Interest Coverage', bharat: 1.8, benchmark: 2.0 },
];

export default function SectorBenchmarkChart({ data = defaultData, height = 300 }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
        <XAxis dataKey="metric" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip
          formatter={(value: any, name: any) => {
            const numeric = Number(value);
            const label = String(name || 'Value');
            const suffix = label === 'Bharat Precision' ? 'x' : 'x';
            return [Number.isFinite(numeric) ? `${numeric.toFixed(2)}${suffix}` : String(value), label];
          }}
        />
        <Legend />
        <Bar dataKey="bharat" name="Bharat Precision" fill="#16A34A" radius={[4, 4, 0, 0]} />
        <Bar dataKey="benchmark" name="Benchmark" fill="#94A3B8" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
