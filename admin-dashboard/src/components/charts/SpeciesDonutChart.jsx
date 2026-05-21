import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const SPECIES_COLORS = {
  Tilapia: 'var(--chart-1)',
  Catfish: 'var(--chart-4)',
  'Nile Perch': 'var(--chart-3)',
  Carp: 'var(--chart-2)',
  'Barbus (Ganfo)': 'var(--chart-5)',
}

export default function SpeciesDonutChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
        No verified catches today
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          dataKey="total_kg"
          nameKey="species"
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={80}
        >
          {data.map((entry) => (
            <Cell key={entry.species} fill={SPECIES_COLORS[entry.species] || 'var(--muted-foreground)'} />
          ))}
        </Pie>
        <Tooltip formatter={(v) => [`${v} kg`]} />
        <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  )
}
