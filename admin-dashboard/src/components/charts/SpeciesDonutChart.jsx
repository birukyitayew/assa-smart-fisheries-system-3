import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const SPECIES_COLORS = {
  Tilapia: '#38bdf8',
  Catfish: '#a78bfa',
  'Nile Perch': '#10b981',
  Carp: '#f59e0b',
  'Barbus (Ganfo)': '#f472b6',
};

const FALLBACK_COLORS = ['#38bdf8', '#a78bfa', '#10b981', '#f59e0b', '#f472b6', '#06b6d4'];

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { species, total_kg } = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-card/95 backdrop-blur-sm px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-foreground">{species}</p>
      <p className="text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">{Math.round(total_kg)} kg</span> caught
      </p>
    </div>
  );
}

export default function SpeciesDonutChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
        No verified catches today
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          dataKey="total_kg"
          nameKey="species"
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={3}
          cornerRadius={4}
          strokeWidth={0}
        >
          {data.map((entry, i) => (
            <Cell
              key={entry.species}
              fill={SPECIES_COLORS[entry.species] || FALLBACK_COLORS[i % FALLBACK_COLORS.length]}
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconSize={8}
          iconType="circle"
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
