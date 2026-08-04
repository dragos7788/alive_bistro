const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"])
const MAX_BYTES = 2 * 1024 * 1024

export function validateUpload(contentType: string | null, size: number): string | null {
  if (!contentType || !ALLOWED_MIME.has(contentType)) return "Only jpeg, png, webp allowed"
  if (size > MAX_BYTES) return "File exceeds 2 MB"
  return null
}
