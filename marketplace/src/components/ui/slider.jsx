import * as React from 'react';
import { Slider as SliderPrimitive } from '@base-ui/react/slider';

import { cn } from '@/lib/utils';

function Slider({ className, min = 0, max = 100, step = 1, value, onValueChange, ...props }) {
  // Base UI Slider expects an array for value
  const val = Array.isArray(value) ? value : [value || 0];

  return (
    <SliderPrimitive.Root
      value={val}
      onValueChange={(v) => {
        if (onValueChange) {
          onValueChange(Array.isArray(value) ? v : v[0]);
        }
      }}
      min={min}
      max={max}
      step={step}
      className={cn(
        'relative flex w-full touch-none select-none items-center',
        className
      )}
      {...props}
    >
      <SliderPrimitive.Control className="relative flex w-full items-center">
        <SliderPrimitive.Track className="relative h-1.5 w-full grow rounded-full bg-muted">
          <SliderPrimitive.Indicator className="absolute h-full rounded-full bg-primary" />
        </SliderPrimitive.Track>
        {val.map((_, index) => (
          <SliderPrimitive.Thumb
            key={index}
            className="block h-4 w-4 rounded-full border border-primary/50 bg-background shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
          />
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

export { Slider };
