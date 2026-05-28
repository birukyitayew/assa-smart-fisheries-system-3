import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function CatchesLineChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          tickFormatter={(d) => d.slice(5)}
        />
        <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
        <Tooltip
          formatter={(v, name) => [`${Math.round(v)} kg`, name]}
          labelFormatter={(l) => `Date: ${l}`}
          contentStyle={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
          }}
        />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
        <Line
          type="monotone"
          dataKey="verified_kg"
          name="Verified"
          stroke="#10b981"
          strokeWidth={2}
          dot={{ r: 3, fill: '#10b981' }}
        />
        <Line
          type="monotone"
          dataKey="pending_kg"
          name="Pending"
          stroke="#f59e0b"
          strokeWidth={2}
          strokeDasharray="5 5"
          dot={{ r: 3, fill: '#f59e0b' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
