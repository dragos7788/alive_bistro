import { describe, expect, it } from "vitest"
import { parseCommerceResponse } from "./api"

describe("commerce response validation", () => {
  it.each([true, false])("accepts the explicit sales state %s", async salesEnabled => {
    expect(await parseCommerceResponse(Response.json({ data: { salesEnabled } }))).toEqual({ salesEnabled })
  })

  it.each([null, {}, { data: {} }, { data: { salesEnabled: 1 } }, { data: { salesEnabled: "false" } }])(
    "rejects missing or invalid sales state %j", async body => {
      await expect(parseCommerceResponse(Response.json(body))).rejects.toThrow()
    },
  )

  it("reports failed requests even when their payload looks enabled", async () => {
    const response = Response.json({ data: { salesEnabled: true } }, { status: 503 })

    await expect(parseCommerceResponse(response)).rejects.toThrow()
  })

  it("preserves explicit server errors and rejects HTML instead of assuming sales are enabled", async () => {
    const response = Response.json({ error: { message: "Acces neautorizat" } }, { status: 401 })

    await expect(parseCommerceResponse(response)).rejects.toThrow("Acces neautorizat")
    await expect(parseCommerceResponse(new Response("<html>SPA</html>"))).rejects.toThrow()
  })
})
