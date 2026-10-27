import { useRef, useState } from "react"
import { X, Upload } from "lucide-react"
import { getImageCropStyle } from "../../features/menu/image-crop"

interface Props {
  currentUrl?: string
  fallbackUrl?: string
  fit: "cover" | "contain"
  imagePosition: { x: number; y: number }
  imageZoom: number
  onImagePositionChange: (axis: "x" | "y", value: number) => void
  onImageZoomChange: (value: number) => void
  onUploaded: (key: string, url: string) => void
  onClear: () => void
}

type CropDrag = {
  pointerId: number
  clientX: number
  clientY: number
  overflowX: number
  overflowY: number
  positionX: number
  positionY: number
}

export default function ImageUploader({
  currentUrl, fallbackUrl, fit, imagePosition, imageZoom,
  onImagePositionChange, onImageZoomChange, onUploaded, onClear,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const previewRef = useRef<HTMLImageElement>(null)
  const cropDragRef = useRef<CropDrag | null>(null)
  const [uploading, setUploading] = useState(false)
  const [isDraggingCrop, setIsDraggingCrop] = useState(false)
  const [error, setError] = useState("")
  const previewUrl = currentUrl || fallbackUrl

  const handleCropPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (fit !== "cover" || imageZoom < 100 || !previewRef.current?.naturalWidth || !previewRef.current.naturalHeight) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const image = previewRef.current
    const scale = imageZoom < 100
      ? Math.min(bounds.width / image.naturalWidth, bounds.height / image.naturalHeight)
      : Math.max(bounds.width / image.naturalWidth, bounds.height / image.naturalHeight)
    const zoomFactor = imageZoom / 100
    cropDragRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      overflowX: Math.max(0, image.naturalWidth * scale * zoomFactor - bounds.width),
      overflowY: Math.max(0, image.naturalHeight * scale * zoomFactor - bounds.height),
      positionX: imagePosition.x,
      positionY: imagePosition.y,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    setIsDraggingCrop(true)
  }

  const handleCropPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = cropDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const x = drag.overflowX
      ? Math.min(100, Math.max(0, Math.round(drag.positionX - (event.clientX - drag.clientX) / drag.overflowX * 100)))
      : drag.positionX
    const y = drag.overflowY
      ? Math.min(100, Math.max(0, Math.round(drag.positionY - (event.clientY - drag.clientY) / drag.overflowY * 100)))
      : drag.positionY
    if (x !== imagePosition.x) onImagePositionChange("x", x)
    if (y !== imagePosition.y) onImagePositionChange("y", y)
  }

  const handleCropPointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (cropDragRef.current?.pointerId !== event.pointerId) return
    cropDragRef.current = null
    setIsDraggingCrop(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const handleFile = async (file: File) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Doar jpeg, png, webp sunt acceptate")
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Fișierul depășește 2 MB")
      return
    }
    setError("")
    setUploading(true)
    try {
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      })
      const json = await res.json() as { data?: { key: string; url: string }; error?: { message: string } }
      if (!res.ok || !json.data) throw new Error(json.error?.message ?? "Upload eșuat")
      onUploaded(json.data.key, json.data.url)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Eroare necunoscută")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-2">
      {previewUrl && (
        <div
          className={`relative aspect-square w-full overflow-hidden rounded-lg bg-white ${fit === "cover" ? `touch-none select-none ${imageZoom > 100 ? isDraggingCrop ? "cursor-grabbing" : "cursor-grab" : ""}` : ""}`}
          onPointerDown={handleCropPointerDown}
          onPointerMove={handleCropPointerMove}
          onPointerUp={handleCropPointerEnd}
          onPointerCancel={handleCropPointerEnd}
        >
          <img
            ref={previewRef}
            src={previewUrl}
            alt="Previzualizare decupajul fotografiei în meniul public"
            className="absolute max-w-none"
            style={getImageCropStyle(imagePosition, imageZoom, fit)}
            draggable={false}
          />
          {currentUrl && <button
            type="button"
            onClick={onClear}
            onPointerDown={(event) => event.stopPropagation()}
            aria-label="Elimină imaginea personalizată"
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center text-brand-dark/70 hover:text-red-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>}
        </div>
      )}
      {previewUrl && fit === "cover" && (
        <fieldset className="space-y-3 rounded-lg border border-brand-green-700/15 p-3">
          <legend className="px-1 text-xs font-semibold text-brand-green-800">Încadrare fotografie</legend>
          <p className="text-xs text-brand-dark/70">La zoom peste 100%, trage fotografia pentru a alege zona afișată. Sub 100%, fotografia întreagă este încadrată în pătrat.</p>
          <label className="flex items-center gap-3 text-xs text-brand-dark/80">
            <span className="w-16 shrink-0">Zoom</span>
            <input
              type="range"
              min="50"
              max="300"
              step="10"
              value={imageZoom}
              onChange={(event) => onImageZoomChange(Number(event.target.value))}
              aria-label="Mărire fotografie"
              className="min-w-0 flex-1 accent-brand-green-700"
            />
            <output className="w-10 text-right tabular-nums">{imageZoom}%</output>
          </label>
          <label className="flex items-center gap-3 text-xs text-brand-dark/80">
            <span className="w-16 shrink-0">Orizontală</span>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={imagePosition.x}
              disabled={imageZoom < 100}
              onChange={(event) => onImagePositionChange("x", Number(event.target.value))}
              aria-label="Poziție orizontală a fotografiei"
              className="min-w-0 flex-1 accent-brand-green-700 disabled:opacity-40"
            />
            <output className="w-9 text-right tabular-nums">{imagePosition.x}%</output>
          </label>
          <label className="flex items-center gap-3 text-xs text-brand-dark/80">
            <span className="w-16 shrink-0">Verticală</span>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={imagePosition.y}
              disabled={imageZoom < 100}
              onChange={(event) => onImagePositionChange("y", Number(event.target.value))}
              aria-label="Poziție verticală a fotografiei"
              className="min-w-0 flex-1 accent-brand-green-700 disabled:opacity-40"
            />
            <output className="w-9 text-right tabular-nums">{imagePosition.y}%</output>
          </label>
          <button
            type="button"
            onClick={() => {
              onImagePositionChange("x", 50)
              onImagePositionChange("y", 50)
              onImageZoomChange(100)
            }}
            className="min-h-10 rounded-lg border border-brand-green-700/20 px-3 text-xs font-semibold text-brand-green-800 hover:bg-brand-cream-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-700"
          >
            Resetează decupajul
          </button>
        </fieldset>
      )}
      {!currentUrl && fallbackUrl && (
        <p className="text-xs text-brand-dark/70">Imagine implicită din meniu. Poți încărca o fotografie proprie pentru a o înlocui.</p>
      )}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full h-28 rounded-lg border-2 border-dashed border-brand-green-700/30 flex flex-col items-center justify-center gap-1.5 text-brand-green-700/60 hover:border-brand-green-700/60 hover:text-brand-green-700 transition-colors disabled:opacity-50"
        >
          <Upload className="w-5 h-5" />
          <span className="text-xs font-medium">{uploading ? "Se încarcă…" : previewUrl ? "Înlocuiește imaginea (jpeg/png/webp, max 2MB)" : "Alege imagine (jpeg/png/webp, max 2MB)"}</span>
        </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
