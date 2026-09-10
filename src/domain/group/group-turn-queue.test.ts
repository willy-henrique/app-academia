import { describe, expect, it } from "vitest";

import {
  advanceGroupTurnQueue,
  createGroupTurnQueue,
  getCurrentGroupTurn,
  getUpcomingGroupTurns,
} from "./group-turn-queue";

describe("GroupTurnQueue", () => {
  it("keeps host-first rotation predictable for three participants", () => {
    const queue = createGroupTurnQueue(["host", "joao", "pedro"], "ROTATION_SHARED_STATION");

    expect(getCurrentGroupTurn(queue)).toMatchObject({ participantUid: "host", round: 1 });
    expect(getUpcomingGroupTurns(queue, 5).map((turn) => turn.participantUid)).toEqual([
      "host",
      "joao",
      "pedro",
      "host",
      "joao",
    ]);
  });

  it("advances to the next participant and begins a new round without duplicates", () => {
    const queue = createGroupTurnQueue(["host", "joao"], "ROTATION_SHARED_STATION");
    const afterHost = advanceGroupTurnQueue(queue);
    const afterJoao = advanceGroupTurnQueue(afterHost);

    expect(getCurrentGroupTurn(afterHost)).toMatchObject({ participantUid: "joao", round: 1 });
    expect(getCurrentGroupTurn(afterJoao)).toMatchObject({ participantUid: "host", round: 2 });
    expect(() => createGroupTurnQueue(["host", "host"], "ROTATION_SHARED_STATION")).toThrow(
      /única/i,
    );
  });
});
