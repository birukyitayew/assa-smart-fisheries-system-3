import { LineChart, Line, ResponsiveContainer } from 'recharts'

export default function PriceSparkline({ data = [] }) {
  if (!data.length) return null

  const chartData = data.map((d) => ({
    price: Number(d.price ?? d.avg_price ?? d.price_per_kg ?? 0),
  }))

  return (
    <div className="h-8 w-24 mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line
            type="monotone"
            dataKey="price"
            stroke="hsl(var(--primary))"
            strokeWidth={1.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
