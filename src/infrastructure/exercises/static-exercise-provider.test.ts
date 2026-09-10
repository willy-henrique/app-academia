import { describe, expect, it } from "vitest";

import { seedExercises } from "@/domain/workout/exercise-seed";

import {
  createStaticExerciseProvider,
  getSeedExercise,
  StaticExerciseProvider,
} from "./static-exercise-provider";

describe("static exercise provider", () => {
  it("exposes the curated seed exercises", async () => {
    const provider = new StaticExerciseProvider();

    const exercises = await provider.list();

    expect(exercises).toHaveLength(seedExercises.length);
    expect(exercises[0]?.license).toBe("CC BY 4.0");
  });

  it("resolves exercises by id and slug", async () => {
    const provider = createStaticExerciseProvider();

    await expect(provider.getById("barbell-bench-press")).resolves.toMatchObject({
      slug: "supino-reto-barra",
    });
    await expect(provider.getBySlug("agachamento-livre")).resolves.toMatchObject({
      id: "bodyweight-squat",
    });
    await expect(provider.getBySlug("nao-existe")).resolves.toBeNull();
  });

  it("exposes direct seed lookup for tooling", () => {
    expect(getSeedExercise("one-arm-dumbbell-row")).toMatchObject({
      name: "Remada unilateral com halter",
    });
  });
});
