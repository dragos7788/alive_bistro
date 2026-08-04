import { useRef, useState } from "react"
import { X, Upload } from "lucide-react"

interface Props {
  currentUrl?: string
  onUploaded: (key: string, url: string) => void
  onClear: () => void
}

export default function ImageUploader({ currentUrl, onUploaded, onClear }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")

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
      {currentUrl ? (
        <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-brand-cream-200">
          <img src={currentUrl} alt="Preview" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={onClear}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center text-brand-dark/70 hover:text-red-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full h-28 rounded-lg border-2 border-dashed border-brand-green-700/30 flex flex-col items-center justify-center gap-1.5 text-brand-green-700/60 hover:border-brand-green-700/60 hover:text-brand-green-700 transition-colors disabled:opacity-50"
        >
          <Upload className="w-5 h-5" />
          <span className="text-xs font-medium">{uploading ? "Se încarcă…" : "Alege imagine (jpeg/png/webp, max 2MB)"}</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
