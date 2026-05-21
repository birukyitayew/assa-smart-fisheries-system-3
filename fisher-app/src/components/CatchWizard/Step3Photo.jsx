import { Button } from '@/components/ui/button'
import { Camera, Image } from 'lucide-react'

export default function Step3Photo({ photos, onAddPhoto }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Add 1–3 photos of your catch. Photos help with verification.
      </p>
      <div className="grid grid-cols-3 gap-3">
        {photos.map((url, i) => (
          <div
            key={i}
            className="aspect-square bg-primary/10 rounded-xl flex items-center justify-center border-2 border-primary/20"
          >
            <Image className="h-8 w-8 text-primary/60" aria-hidden />
          </div>
        ))}
        {photos.length < 3 && (
          <Button
            type="button"
            variant="outline"
            onClick={onAddPhoto}
            className="aspect-square h-auto flex-col gap-1 border-dashed"
          >
            <Camera className="h-6 w-6 text-muted-foreground" />
            <span className="text-xs">Add photo</span>
          </Button>
        )}
      </div>
      {photos.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Photo is optional but recommended for catches over 50 kg.
        </p>
      )}
    </div>
  )
}
