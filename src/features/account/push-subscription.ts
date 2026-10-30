import { accountRequest } from "./api"

/** Whether this secure browser exposes the APIs required for device push. */
export function supportsPush(): boolean {
  return typeof window !== "undefined" && window.isSecureContext
    && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window
}

/** Requests permission from the click gesture and persists the explicitly chosen push subscription. */
export async function enableDevicePush(publicKey: string): Promise<void> {
  const permission = await Notification.requestPermission()
  if (permission !== "granted") throw new Error("push.permissionDenied")
  let created: PushSubscription | null = null
  try {
    await navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" })
    const registration = await navigator.serviceWorker.ready
    let subscription = await registration.pushManager.getSubscription()
    if (!subscription) {
      const raw = atob(publicKey.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - publicKey.length % 4) % 4))
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true, applicationServerKey: Uint8Array.from(raw, char => char.charCodeAt(0)),
      })
      created = subscription
    }
    const result = await accountRequest("push", {
      action: "subscribe", consent: true, noticeVersion: "push-marketing-v1", subscription: subscription.toJSON(),
    })
    if (!result || typeof result !== "object" || !("consent" in result) || result.consent !== true) {
      throw new Error("account.error")
    }
  } catch (reason) {
    if (created) {
      try { await created.unsubscribe() } catch (cleanupError) {
        console.error("ALIVE push subscription cleanup failed", cleanupError instanceof Error ? cleanupError.name : "UnknownError")
      }
    }
    throw reason
  }
}
