// Entra External ID NATIVE authentication (AZURE Phase I.1, "B" login) — the
// engine under BumpNotes' own sign-in form. Credential entry stays on our page;
// Entra is the identity engine. This is the REUSABLE core: every flow is driven
// by VITE_ env, so a second product = register its SPA app, enable native auth
// on its tenant, swap the env, done. The form is a theme on top of this.
//
// Native auth's CIAM API has no CORS, so all calls go through the same-origin
// proxy route in `src/server.ts` (`/api/ciam`) — see `authApiProxyUrl` below.
//
// The SDK (`@azure/msal-browser/custom-auth`) is loaded via a DYNAMIC import so
// the browser-only bundle never enters the server build (same discipline as
// entra-config). Everything no-ops when native auth is off/unconfigured, so the
// callers are safe to invoke unconditionally.

import type {
  ICustomAuthPublicClientApplication,
  CustomAuthAccountData,
  SignInResult,
  SignInSubmitCodeResult,
  SignInSubmitPasswordResult,
  SignInCodeRequiredState,
  SignInPasswordRequiredState,
  ResetPasswordCodeRequiredState,
  ResetPasswordPasswordRequiredState,
} from "@azure/msal-browser/custom-auth";

/** Build-time flag. The native sign-in path is inert unless this is exactly "true". */
export const ENTRA_NATIVE_ENABLED = import.meta.env.VITE_ENTRA_NATIVE === "true";

const CLIENT_ID = import.meta.env.VITE_ENTRA_CLIENT_ID as string | undefined;
const AUTHORITY = import.meta.env.VITE_ENTRA_AUTHORITY as string | undefined; // https://<sub>.ciamlogin.com/<tenantId>
const API_SCOPE = import.meta.env.VITE_ENTRA_API_SCOPE as string | undefined; // api://<apiClientId>/access_as_user

/** openid/offline_access get us an id-token + refresh token; API_SCOPE gets the access token for our API. */
const SCOPES = ["openid", "offline_access", ...(API_SCOPE ? [API_SCOPE] : [])];

function isConfigured(): boolean {
  return ENTRA_NATIVE_ENABLED && !!CLIENT_ID && !!AUTHORITY && typeof window !== "undefined";
}

/** Same-origin proxy base the SDK appends native-auth endpoints onto (see server.ts). */
function authApiProxyUrl(): string {
  return `${window.location.origin}/api/ciam`;
}

let appPromise: Promise<ICustomAuthPublicClientApplication | null> | undefined;

/** The native-auth client (browser only, initialised once) — or null when off/unconfigured. */
function getNativeApp(): Promise<ICustomAuthPublicClientApplication | null> {
  if (appPromise) return appPromise;
  if (!isConfigured()) {
    appPromise = Promise.resolve(null);
    return appPromise;
  }
  appPromise = (async () => {
    try {
      const { CustomAuthPublicClientApplication } = await import("@azure/msal-browser/custom-auth");
      return await CustomAuthPublicClientApplication.create({
        auth: {
          clientId: CLIENT_ID!,
          authority: AUTHORITY!,
          knownAuthorities: [new URL(AUTHORITY!).host],
        },
        customAuth: {
          // "password" for email+password, "oob" for email one-time passcode,
          // "redirect" so the SDK can fall back to browser redirect if the tenant
          // is configured for a challenge native auth can't do.
          challengeTypes: ["password", "oob", "redirect"],
          authApiProxyUrl: authApiProxyUrl(),
        },
        cache: { cacheLocation: "sessionStorage" }, // per-tab; not persisted to localStorage
      });
    } catch (error) {
      console.error("Entra native auth init failed:", error);
      return null;
    }
  })();
  return appPromise;
}

// --- Normalized, SDK-free result surface -------------------------------------
// The form never touches SDK state types: each "next step" is handed back as a
// closure, so the UI just renders a code box or a password box and calls back.

export type NativeAccount = { username: string; name?: string };

export type NativeSignInResult =
  | { status: "signed_in"; account: NativeAccount }
  | {
      status: "code_required";
      codeLength: number;
      submitCode: (code: string) => Promise<NativeSignInResult>;
      resendCode: () => Promise<NativeSignInResult>;
    }
  | { status: "error"; message: string }
  // Native auth can't complete this challenge in-page (e.g. social IdP / MFA the
  // SDK maps to a redirect). The caller should fall back to the redirect flow.
  | { status: "redirect_required"; message: string };

function toAccount(data: CustomAuthAccountData): NativeAccount {
  const info = data.getAccount();
  return { username: info.username, name: info.name };
}

function errMessage(
  error: { errorData?: { message?: string } } | undefined,
  fallback: string,
): string {
  return error?.errorData?.message ?? fallback;
}

/**
 * The SDK's state-check methods are `this is this & { state: X }` type guards.
 * Calling them in chained `if`s narrows the result binding down to `never`
 * (and then the next guard call is a type error). We only want the runtime
 * boolean, so we view the result through an interface whose methods return
 * plain `boolean` — that strips the predicate and leaves the binding un-narrowed.
 * State is then read from the hoisted union and cast per branch.
 */
type ResultFlags = {
  isCompleted(): boolean;
  isFailed(): boolean;
  isPasswordRequired(): boolean;
  isCodeRequired(): boolean;
};
function flags(result: object): ResultFlags {
  const r = result as Partial<ResultFlags>;
  return {
    isCompleted: () => r.isCompleted?.() ?? false,
    isFailed: () => r.isFailed?.() ?? false,
    isPasswordRequired: () => r.isPasswordRequired?.() ?? false,
    isCodeRequired: () => r.isCodeRequired?.() ?? false,
  };
}

/**
 * Normalize the result of `signIn()` into our SDK-free surface. `password` is
 * carried so that when the SDK asks for it (password_required) we submit it
 * automatically — the caller only ever supplies it once.
 */
// NOTE on the guard pattern below: the SDK's type guards are `this is this &
// { state: X }`, so chaining `if (result.isA()) …; if (result.isB()) …` makes
// TypeScript negatively narrow `result` to `never` after the first check. We
// avoid that by reading the guard booleans up front (a bare guard call does not
// narrow the binding), then accessing `.data`/`.error` (declared on the base
// result type, so no narrowing is needed) and casting `.state` only in the
// branch whose boolean guarantees that state.
function codeStepFromState(
  state: SignInCodeRequiredState,
  onDone: (r: SignInSubmitCodeResult) => Promise<NativeSignInResult>,
): NativeSignInResult {
  return {
    status: "code_required",
    codeLength: state.getCodeLength(),
    submitCode: async (code: string) => onDone(await state.submitCode(code)),
    resendCode: async () => {
      await state.resendCode();
      return codeStepFromState(state, onDone);
    },
  };
}

async function normalizeSignIn(
  result: SignInResult,
  password: string | undefined,
): Promise<NativeSignInResult> {
  // Hoist state/data/error off the base result BEFORE any branching: the early
  // returns below negatively narrow `result` (via aliased type guards) down to
  // `never`, so `result.state`/`.error` would be unusable afterwards. Captured
  // here they keep their base union types.
  const state = result.state;
  const data = result.data;
  const error = result.error;
  const g = flags(result);

  if (g.isCompleted()) {
    return { status: "signed_in", account: toAccount(data!) };
  }
  if (g.isPasswordRequired()) {
    if (!password) {
      return { status: "error", message: "A password is required to sign in." };
    }
    return normalizeSubmit(await (state as SignInPasswordRequiredState).submitPassword(password));
  }
  if (g.isCodeRequired()) {
    return codeStepFromState(state as SignInCodeRequiredState, normalizeSubmit);
  }
  if (g.isFailed()) {
    return { status: "error", message: errMessage(error, "Sign-in failed. Please try again.") };
  }
  // isMfaRequired / isAuthMethodRegistrationRequired — not offered in-page here.
  return {
    status: "redirect_required",
    message: "This sign-in needs an extra step in your browser.",
  };
}

async function normalizeSubmit(
  result: SignInSubmitPasswordResult | SignInSubmitCodeResult,
): Promise<NativeSignInResult> {
  const data = result.data;
  const error = result.error;
  const g = flags(result);
  if (g.isCompleted()) {
    return { status: "signed_in", account: toAccount(data!) };
  }
  if (g.isFailed()) {
    return { status: "error", message: errMessage(error, "That didn't work. Please try again.") };
  }
  return {
    status: "redirect_required",
    message: "This sign-in needs an extra step in your browser.",
  };
}

/**
 * Sign in with BumpNotes' own form.
 * - password supplied  → email + password flow.
 * - password omitted   → email one-time passcode ("email me a code") flow.
 * Returns a normalized result; on `code_required` the caller collects the code
 * and calls the returned `submitCode`.
 */
export async function nativeSignIn(email: string, password?: string): Promise<NativeSignInResult> {
  const app = await getNativeApp();
  if (!app) return { status: "error", message: "Sign-in is unavailable right now." };
  try {
    const result = await app.signIn({ username: email, password, scopes: SCOPES });
    return normalizeSignIn(result, password);
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Sign-in failed." };
  }
}

/** Start a password reset for this email. Returns a code-collecting step or an error. */
export type NativeResetResult =
  | {
      status: "code_required";
      codeLength: number;
      submitCode: (code: string) => Promise<NativeResetStep>;
    }
  | { status: "error"; message: string };

export type NativeResetStep =
  | {
      status: "password_required";
      submitPassword: (newPassword: string) => Promise<NativeResetStep>;
    }
  | { status: "completed" }
  | { status: "error"; message: string };

export async function nativeStartPasswordReset(email: string): Promise<NativeResetResult> {
  const app = await getNativeApp();
  if (!app) return { status: "error", message: "Password reset is unavailable right now." };
  try {
    const start = await app.resetPassword({ username: email });
    const startState = start.state;
    const startError = start.error;
    const startFlags = flags(start);
    if (startFlags.isFailed()) {
      return {
        status: "error",
        message: errMessage(startError, "Couldn't start a password reset."),
      };
    }
    if (!startFlags.isCodeRequired()) {
      return { status: "error", message: "Couldn't start a password reset." };
    }
    const codeState = startState as ResetPasswordCodeRequiredState;
    return {
      status: "code_required",
      codeLength: codeState.getCodeLength(),
      submitCode: async (code: string) => {
        const afterCode = await codeState.submitCode(code);
        const afterState = afterCode.state;
        const afterError = afterCode.error;
        const afterFlags = flags(afterCode);
        if (afterFlags.isFailed()) {
          return { status: "error", message: errMessage(afterError, "That code didn't work.") };
        }
        if (!afterFlags.isPasswordRequired()) {
          return { status: "error", message: "Couldn't continue the password reset." };
        }
        const pwState = afterState as ResetPasswordPasswordRequiredState;
        const submitNewPassword = async (newPassword: string): Promise<NativeResetStep> => {
          const done = await pwState.submitNewPassword(newPassword);
          const doneError = done.error;
          const doneFlags = flags(done);
          if (doneFlags.isCompleted()) return { status: "completed" };
          if (doneFlags.isFailed()) {
            return {
              status: "error",
              message: errMessage(doneError, "Couldn't set the new password."),
            };
          }
          return { status: "error", message: "Couldn't complete the password reset." };
        };
        return { status: "password_required", submitPassword: submitNewPassword };
      },
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Password reset failed.",
    };
  }
}

/** The current native account, or null. */
export async function getNativeAccount(): Promise<NativeAccount | null> {
  const app = await getNativeApp();
  if (!app) return null;
  const result = app.getCurrentAccount();
  if (result.isCompleted() && result.data) return toAccount(result.data);
  return null;
}

// (getCurrentAccount / getAccessToken results have only completed|failed states,
// so a single positive guard narrows cleanly — no boolean-hoisting needed.)

/** A fresh API access token for the current native account, or null. */
export async function getNativeAccessToken(): Promise<string | null> {
  const app = await getNativeApp();
  if (!app) return null;
  const account = app.getCurrentAccount();
  if (!account.isCompleted() || !account.data) return null;
  try {
    const token = await account.data.getAccessToken({
      forceRefresh: false,
      scopes: API_SCOPE ? [API_SCOPE] : [],
    });
    if (token.isCompleted() && token.data) return token.data.accessToken;
    return null;
  } catch {
    return null;
  }
}

export async function nativeSignOut(): Promise<void> {
  const app = await getNativeApp();
  if (!app) return;
  const account = app.getCurrentAccount();
  if (account.isCompleted() && account.data) {
    try {
      await account.data.signOut();
    } catch {
      /* ignore */
    }
  }
}
