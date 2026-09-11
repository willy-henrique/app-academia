import { describe, expect, it } from "vitest";
import { resolveMuscleFocusFromExercises } from "./muscle-split";

describe("muscle split resolution", () => {
  it("resolves Chest when bench press is included", () => {
    const title = resolveMuscleFocusFromExercises(["barbell-bench-press"]);
    expect(title).toContain("Peito");
  });

  it("resolves Back when row or pull is included", () => {
    const title = resolveMuscleFocusFromExercises(["one-arm-dumbbell-row"]);
    expect(title).toContain("Costas");
  });

  it("resolves Legs when squat or leg press is included", () => {
    const title = resolveMuscleFocusFromExercises(["barbell-back-squat"]);
    expect(title).toContain("Pernas");
  });

  it("resolves fallback when empty", () => {
    const title = resolveMuscleFocusFromExercises([]);
    expect(title).toBe("Treino de Força");
  });
});
