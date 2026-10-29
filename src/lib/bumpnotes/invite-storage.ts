// BN-INVITE: the code checked on "Create account" is kept on this device until the
// first sign-in uses it (the email-confirm link can open in a new tab).
const KEY = "bn_invite_code";
export function rememberInviteCode(code: string) {
  try {
    localStorage.setItem(KEY, code.trim());
  } catch {
    /* storage blocked: the code is asked again */
  }
}
export function rememberedInviteCode(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}
export function forgetInviteCode() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to do */
  }
}
