/** Browser notifications for when a session ends. */

export type NotifyPermission = NotificationPermission | "unsupported";

export function notificationPermission(): NotifyPermission {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

/** Asks the browser for permission. Only call this after the student clicks "Allow". */
export async function requestNotificationPermission(): Promise<NotifyPermission> {
  if (notificationPermission() === "unsupported") return "unsupported";
  return Notification.requestPermission();
}

/**
 * Shows a notification. Phones (Android) only allow notifications through a
 * service worker, so we use one when it's available (added in Phase 5).
 */
export async function showNotification(title: string, body: string) {
  if (notificationPermission() !== "granted") return;
  const options: NotificationOptions = { body, tag: "windowsill-timer" };
  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration) {
      await registration.showNotification(title, options);
      return;
    }
    new Notification(title, options);
  } catch {
    // Some browsers refuse notifications in certain modes — the chime still plays.
  }
}
