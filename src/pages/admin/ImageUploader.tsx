import { useRef, useState } from "react"
import { X, Upload } from "lucide-react"

interface Props {
  currentUrl?: string
  fallbackUrl?: string
  fit: "cover" | "contain"
  imagePosition: { x: number; y: number }
  onImagePositionChange: (axis: "x" | "y", value: number) => void
  onUploaded: (key: string, url: string) => void
  onClear: () => void
}

export default function ImageUploader({
  currentUrl, fallbackUrl, fit, imagePosition, onImagePositionChange, onUploaded, onClear,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const previewUrl = currentUrl || fallbackUrl

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
        <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-brand-cream-200">
          <img
            src={previewUrl}
            alt="Previzualizare decupajul fotografiei în meniul public"
            className={`h-full w-full bg-white ${fit === "cover" ? "object-cover" : "object-contain"}`}
            style={{ objectPosition: `${imagePosition.x}% ${imagePosition.y}%` }}
          />
          {currentUrl && <button
            type="button"
            onClick={onClear}
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
          <label className="flex items-center gap-3 text-xs text-brand-dark/80">
            <span className="w-16 shrink-0">Orizontală</span>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={imagePosition.x}
              onChange={(event) => onImagePositionChange("x", Number(event.target.value))}
              aria-label="Poziție orizontală a fotografiei"
              className="min-w-0 flex-1 accent-brand-green-700"
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
              onChange={(event) => onImagePositionChange("y", Number(event.target.value))}
              aria-label="Poziție verticală a fotografiei"
              className="min-w-0 flex-1 accent-brand-green-700"
            />
            <output className="w-9 text-right tabular-nums">{imagePosition.y}%</output>
          </label>
          <button
            type="button"
            onClick={() => {
              onImagePositionChange("x", 50)
              onImagePositionChange("y", 50)
            }}
            className="min-h-10 rounded-lg border border-brand-green-700/20 px-3 text-xs font-semibold text-brand-green-800 hover:bg-brand-cream-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-700"
          >
            Centrează
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
