import { beforeEach, describe, expect, it, vi } from "vitest";

const { getFirebaseClientServices, reload, sendEmailVerification } = vi.hoisted(() => ({
  getFirebaseClientServices: vi.fn(),
  reload: vi.fn(),
  sendEmailVerification: vi.fn(),
}));

vi.mock("firebase/auth", () => ({ reload, sendEmailVerification }));
vi.mock("@/infrastructure/firebase/client", () => ({ getFirebaseClientServices }));

import {
  EmailVerificationError,
  getEmailVerificationStatus,
  requestEmailVerification,
} from "./email-verification";

describe("email verification", () => {
  const user = { emailVerified: false };

  beforeEach(() => {
    getFirebaseClientServices.mockReset();
    reload.mockReset();
    sendEmailVerification.mockReset();
    user.emailVerified = false;
    getFirebaseClientServices.mockReturnValue({ auth: { currentUser: user } });
  });

  it("refreshes the current verification status", async () => {
    await expect(getEmailVerificationStatus()).resolves.toBe("UNVERIFIED");
    expect(reload).toHaveBeenCalledWith(user);
  });

  it("does not resend an email that has already been verified", async () => {
    user.emailVerified = true;

    await expect(requestEmailVerification()).resolves.toBe("ALREADY_VERIFIED");
    expect(sendEmailVerification).not.toHaveBeenCalled();
  });

  it("only sends through the authenticated Firebase user", async () => {
    sendEmailVerification.mockResolvedValue(undefined);

    await expect(requestEmailVerification()).resolves.toBe("SENT");
    expect(sendEmailVerification).toHaveBeenCalledWith(user);

    getFirebaseClientServices.mockReturnValue({ auth: { currentUser: null } });
    await expect(requestEmailVerification()).rejects.toBeInstanceOf(EmailVerificationError);
  });
});
