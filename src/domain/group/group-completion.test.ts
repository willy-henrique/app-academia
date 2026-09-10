import { describe, expect, it } from "vitest";

import { decideGroupParticipationCompletion, resolveGroupSessionClosure } from "./group-completion";

describe("group completion rules", () => {
  it("lets an active participant close their own participation", () => {
    expect(decideGroupParticipationCompletion({ status: "ACTIVE" }, { status: "ACTIVE" })).toEqual({
      allowed: true,
      alreadyCompleted: false,
    });
  });

  it("is idempotent for someone who already finished", () => {
    expect(
      decideGroupParticipationCompletion({ status: "COMPLETED" }, { status: "COMPLETED" }),
    ).toEqual({ allowed: true, alreadyCompleted: true });
  });

  it("refuses completion after leaving or before starting", () => {
    expect(decideGroupParticipationCompletion({ status: "LEFT" }, { status: "ACTIVE" })).toEqual({
      allowed: false,
      reason: "Quem saiu do treino não pode concluí-lo.",
    });
    expect(decideGroupParticipationCompletion({ status: "INVITED" }, { status: "ACTIVE" })).toEqual(
      {
        allowed: false,
        reason: "É necessário estar no treino para concluí-lo.",
      },
    );
  });

  it("refuses completion while the session is not running", () => {
    expect(decideGroupParticipationCompletion({ status: "ACTIVE" }, { status: "LOBBY" })).toEqual({
      allowed: false,
      reason: "Esta sessão não está em andamento.",
    });
  });

  it("keeps the session active while someone is still training", () => {
    expect(
      resolveGroupSessionClosure(
        [
          { status: "COMPLETED", uid: "alice" },
          { status: "ACTIVE", uid: "bob" },
        ],
        "ACTIVE",
      ),
    ).toBe("ACTIVE");
  });

  it("completes the session when everyone finished or left", () => {
    expect(
      resolveGroupSessionClosure(
        [
          { status: "COMPLETED", uid: "alice" },
          { status: "LEFT", uid: "bob" },
        ],
        "ACTIVE",
      ),
    ).toBe("COMPLETED");
  });

  it("cancels the session when everyone left without finishing", () => {
    expect(
      resolveGroupSessionClosure(
        [
          { status: "LEFT", uid: "alice" },
          { status: "LEFT", uid: "bob" },
        ],
        "ACTIVE",
      ),
    ).toBe("CANCELLED");
  });

  it("never reopens a closed session", () => {
    expect(resolveGroupSessionClosure([{ status: "LEFT", uid: "alice" }], "COMPLETED")).toBe(
      "COMPLETED",
    );
  });
});
