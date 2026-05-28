import { Card, CardContent } from '@/components/ui/card';

export default function Step4Review({ form, selectedZone }) {
  const rows = [
    ['Species', form.species],
    ['Quantity', `${form.quantity_kg} kg`],
    ...(form.number_of_fish ? [['No. of Fish', form.number_of_fish]] : []),
    ['Gear', form.fishing_gear],
    ['Date', form.fishing_date],
    ['Time', form.fishing_time],
    ['Zone', selectedZone?.name],
    ['Photos', `${form.photo_urls.length} photo${form.photo_urls.length !== 1 ? 's' : ''}`],
  ];

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Review your catch details before submitting.</p>
      <Card>
        <CardContent className="pt-6 space-y-3 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between">
              <span className="text-muted-foreground">{label}</span>
              <span className="font-medium text-right max-w-[60%]">{value}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
