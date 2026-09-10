import { beforeEach, describe, expect, it, vi } from "vitest";

const { createGoogleAuthProvider, getFirebaseClientServices, linkWithPopup, linkWithRedirect } =
  vi.hoisted(() => ({
    createGoogleAuthProvider: vi.fn(),
    getFirebaseClientServices: vi.fn(),
    linkWithPopup: vi.fn(),
    linkWithRedirect: vi.fn(),
  }));

vi.mock("firebase/auth", () => ({
  linkWithPopup,
  linkWithRedirect,
}));

vi.mock("@/infrastructure/firebase/client", () => ({
  getFirebaseClientServices,
}));

vi.mock("./google-auth", () => ({
  createGoogleAuthProvider,
}));

import {
  GoogleLinkConflictError,
  GoogleLinkError,
  GoogleLinkRequiresRecentLoginError,
  GoogleLinkRequiresSignedInUserError,
  linkGoogleAccount,
} from "./google-link";

describe("linkGoogleAccount", () => {
  beforeEach(() => {
    getFirebaseClientServices.mockReset();
    linkWithPopup.mockReset();
    linkWithRedirect.mockReset();
    createGoogleAuthProvider.mockReset();
    createGoogleAuthProvider.mockReturnValue({ providerId: "google.com" });
  });

  it("links the current Firebase user to Google", async () => {
    const currentUser = { uid: "user-123" };
    getFirebaseClientServices.mockReturnValue({ auth: { currentUser } });
    linkWithPopup.mockResolvedValue({});

    await expect(linkGoogleAccount()).resolves.toBe("POPUP_COMPLETED");
    expect(linkWithPopup).toHaveBeenCalledWith(currentUser, { providerId: "google.com" });
  });

  it("starts redirect when the browser cannot open a popup", async () => {
    const currentUser = { uid: "user-123" };
    getFirebaseClientServices.mockReturnValue({ auth: { currentUser } });
    linkWithPopup.mockRejectedValue({ code: "auth/popup-blocked" });
    linkWithRedirect.mockResolvedValue(undefined);

    await expect(linkGoogleAccount()).resolves.toBe("REDIRECT_STARTED");
    expect(linkWithRedirect).toHaveBeenCalledWith(currentUser, { providerId: "google.com" });
  });

  it("asks for a recent reauthentication when Firebase requires it", async () => {
    const currentUser = { uid: "user-123" };
    getFirebaseClientServices.mockReturnValue({ auth: { currentUser } });
    linkWithPopup.mockRejectedValue({ code: "auth/requires-recent-login" });

    await expect(linkGoogleAccount()).rejects.toBeInstanceOf(GoogleLinkRequiresRecentLoginError);
  });

  it("rejects when no authenticated user is present", async () => {
    getFirebaseClientServices.mockReturnValue({ auth: { currentUser: null } });

    await expect(linkGoogleAccount()).rejects.toBeInstanceOf(GoogleLinkRequiresSignedInUserError);
  });

  it("hides other Firebase failures behind a generic error", async () => {
    const currentUser = { uid: "user-123" };
    getFirebaseClientServices.mockReturnValue({ auth: { currentUser } });
    linkWithPopup.mockRejectedValue({ code: "auth/internal-error" });

    await expect(linkGoogleAccount()).rejects.toBeInstanceOf(GoogleLinkError);
  });

  it("treats an already linked provider as a conflict", async () => {
    const currentUser = { uid: "user-123" };
    getFirebaseClientServices.mockReturnValue({ auth: { currentUser } });
    linkWithPopup.mockRejectedValue({ code: "auth/provider-already-linked" });

    await expect(linkGoogleAccount()).rejects.toBeInstanceOf(GoogleLinkConflictError);
  });
});
