export type CommerceSettings = { salesEnabled: boolean }

/** Validates the server response instead of assuming sales are enabled on errors. */
export async function parseCommerceResponse(response: Response): Promise<CommerceSettings> {
  const json: unknown = await response.json()
  if (!response.ok) {
    const error = json && typeof json === "object" && "error" in json ? json.error : null
    throw new Error(error && typeof error === "object" && "message" in error && typeof error.message === "string"
      ? error.message : "Starea comercializării nu a putut fi verificată.")
  }
  const data = json && typeof json === "object" && "data" in json ? json.data : null
  if (!data || typeof data !== "object" || !("salesEnabled" in data) || typeof data.salesEnabled !== "boolean") {
    throw new Error("Răspuns invalid pentru starea comercializării.")
  }
  return { salesEnabled: data.salesEnabled }
}
