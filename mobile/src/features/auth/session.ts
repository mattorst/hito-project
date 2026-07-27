let logoutHandler: (() => Promise<void> | void) | null = null;

export function registerLogoutHandler(
  handler: () => Promise<void> | void,
) {
  logoutHandler = handler;
}

export async function triggerLogout() {
  if (logoutHandler) {
    await logoutHandler();
  }
}