import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const SPECIES = ['Tilapia', 'Catfish', 'Nile Perch', 'Carp', 'Barbus (Ganfo)']
const GEARS = ['Gill Net', 'Hook & Line', 'Cast Net', 'Trap', 'Seine Net']

export default function Step1Details({ form, errors, onChange }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Fish Species *</Label>
        <Select value={form.species} onValueChange={(v) => onChange('species', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select species..." />
          </SelectTrigger>
          <SelectContent>
            {SPECIES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.species && <p className="text-destructive text-xs">{errors.species}</p>}
      </div>

      <div className="space-y-2">
        <Label>Quantity (kg) *</Label>
        <Input
          type="number"
          step="0.1"
          min="0.1"
          max="500"
          value={form.quantity_kg}
          onChange={(e) => onChange('quantity_kg', e.target.value)}
          placeholder="e.g. 25"
        />
        {errors.quantity_kg && <p className="text-destructive text-xs">{errors.quantity_kg}</p>}
      </div>

      <div className="space-y-2">
        <Label>Number of Fish (optional)</Label>
        <Input
          type="number"
          min="1"
          value={form.number_of_fish}
          onChange={(e) => onChange('number_of_fish', e.target.value)}
          placeholder="e.g. 12"
        />
      </div>

      <div className="space-y-2">
        <Label>Fishing Gear *</Label>
        <Select value={form.fishing_gear} onValueChange={(v) => onChange('fishing_gear', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select gear..." />
          </SelectTrigger>
          <SelectContent>
            {GEARS.map((g) => (
              <SelectItem key={g} value={g}>
                {g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.fishing_gear && <p className="text-destructive text-xs">{errors.fishing_gear}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Date *</Label>
          <Input
            type="date"
            value={form.fishing_date}
            onChange={(e) => onChange('fishing_date', e.target.value)}
            max={new Date().toISOString().split('T')[0]}
          />
          {errors.fishing_date && <p className="text-destructive text-xs">{errors.fishing_date}</p>}
        </div>
        <div className="space-y-2">
          <Label>Time *</Label>
          <Input
            type="time"
            value={form.fishing_time}
            onChange={(e) => onChange('fishing_time', e.target.value)}
          />
          {errors.fishing_time && <p className="text-destructive text-xs">{errors.fishing_time}</p>}
        </div>
      </div>
    </div>
  )
}
