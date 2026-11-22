/**
 * Phone verification integration point.
 *
 * No SMS/OTP provider is connected in Phase 1.5, so every call resolves to
 * { status: "unavailable" } and numbers are stored as unverified. Phase 2 should
 * implement requestCode/confirmCode against a server route that talks to the
 * provider — never call an SMS provider directly from the browser.
 */
export type RequestCodeResult = { status: "sent"; expiresInSeconds: number } | { status: "unavailable"; reason: string };
export type ConfirmCodeResult = { status: "verified" } | { status: "invalid" } | { status: "unavailable"; reason: string };

export interface PhoneVerificationProvider {
  readonly connected: boolean;
  requestCode(phoneE164: string): Promise<RequestCodeResult>;
  confirmCode(phoneE164: string, code: string): Promise<ConfirmCodeResult>;
}

const REASON = "Text-message verification isn’t connected yet.";

export const phoneVerification: PhoneVerificationProvider = {
  connected: false,
  async requestCode() {
    return { status: "unavailable", reason: REASON };
  },
  async confirmCode() {
    return { status: "unavailable", reason: REASON };
  },
};
