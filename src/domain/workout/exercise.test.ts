import { describe, expect, it } from "vitest";

import {
  equipmentOptions,
  exerciseMediaSchema,
  exerciseSchema,
  experienceLevelOptions,
  movementPatternOptions,
} from "./exercise";

describe("exercise domain", () => {
  it("exposes movement patterns, equipment and experience taxonomies", () => {
    expect(movementPatternOptions).toContain("squat");
    expect(movementPatternOptions).toContain("conditioning");
    expect(equipmentOptions).toContain("bodyweight");
    expect(equipmentOptions).toContain("machine");
    expect(experienceLevelOptions).toContain("all_levels");
  });

  it("validates accessible media metadata", () => {
    const media = exerciseMediaSchema.parse({
      accessibleDescription: "Demonstração lenta com instruções por fases.",
      captions: [
        {
          kind: "subtitles",
          label: "Português",
          language: "pt-BR",
          src: "https://cdn.example.com/captions/upper-a-pt-br.vtt",
        },
      ],
      thumbnail: "https://cdn.example.com/thumbnails/supino.jpg",
      video: {
        aspectRatio: "16:9",
        autoplayAllowed: false,
        durationSeconds: 42,
        mutedDefault: true,
        posterUrl: "https://cdn.example.com/posters/supino.jpg",
        src: "https://cdn.example.com/videos/supino.mp4",
      },
    });

    expect(media.video.autoplayAllowed).toBe(false);
    expect(media.captions).toHaveLength(1);
  });

  it("validates a complete curated exercise record", () => {
    const exercise = exerciseSchema.parse({
      accessibleDescription: "Versão estável com orientação visual e textual.",
      aliases: ["supino reto", "bench press"],
      alternatives: [
        {
          criteria: "Sem barra disponível.",
          exerciseId: "machine-chest-press",
          label: "Chest Press machine",
          privateReasonCodes: ["equipment_unavailable"],
          publicReason: "Mesma ação de empurrar horizontal com ajuste de equipamento.",
        },
      ],
      adaptations: [
        {
          id: "adaptation-reduced-range",
          label: "Amplitude reduzida",
          operationalResult: "Executar com amplitude menor e controle de escápulas.",
          privateReasonCodes: ["range_of_motion_limit"],
          publicNote: "Versão adaptada selecionada.",
          requiresReview: false,
        },
      ],
      attribution: "WillTreino editorial team",
      breathing: "Inspirar na descida e expirar na subida.",
      captions: [],
      defaultRestMax: 120,
      defaultRestMin: 90,
      description: "Exercício de empurrar horizontal com barra e banco.",
      equipment: ["barbell", "bench"],
      experienceLevel: "intermediate",
      estimatedSetDuration: 45,
      execution: "Descer a barra com controle até o ponto seguro e subir sem perder a base.",
      id: "barbell-bench-press",
      instructions:
        "1. Ajuste o banco. 2. Posicione os pés. 3. Faça a pegada. 4. Execute com controle.",
      license: "CC BY 4.0",
      movementPattern: "push_horizontal",
      name: "Supino reto com barra",
      primaryMuscles: ["peitoral maior"],
      mistakes: "Não perder escápulas, não abrir cotovelos excessivamente e não rebater a barra.",
      progressions: [
        {
          criteria: "3x12 com técnica estável e RIR adequado.",
          exerciseId: "paused-bench-press",
          label: "Supino com pausa",
          privateReasonCodes: ["progression_ready"],
          publicReason: "Aumenta controle e tempo sob tensão.",
        },
      ],
      regressions: [
        {
          criteria: "Dor no ombro ou instabilidade.",
          exerciseId: "machine-chest-press",
          label: "Chest Press machine",
          privateReasonCodes: ["joint_comfort"],
          publicReason: "Mantém o padrão com menos complexidade técnica.",
        },
      ],
      safetyNotes: "Use spotter quando necessário e não force amplitude dolorosa.",
      secondaryMuscles: ["tríceps", "deltoide anterior"],
      setup: "Ajuste o banco, a altura do suporte e a posição da barra.",
      slug: "supino-reto-barra",
      source: {
        name: "WillTreino content standards",
        note: "Conteúdo inicial curado para catálogo interno.",
        url: "https://willtreino.example.com/exercises/barbell-bench-press",
      },
      thumbnail: "https://cdn.example.com/thumbnails/supino.jpg",
      video: {
        aspectRatio: "16:9",
        autoplayAllowed: false,
        durationSeconds: 42,
        mutedDefault: true,
        posterUrl: "https://cdn.example.com/posters/supino.jpg",
        src: "https://cdn.example.com/videos/supino.mp4",
      },
    });

    expect(exercise.license).toBe("CC BY 4.0");
    expect(exercise.alternatives).toHaveLength(1);
    expect(exercise.regressions).toHaveLength(1);
    expect(exercise.progressions).toHaveLength(1);
  });

  it("requires attribution and license on curated exercises", () => {
    expect(() =>
      exerciseSchema.parse({
        accessibleDescription: "Descrição acessível.",
        captions: [],
        defaultRestMax: 120,
        defaultRestMin: 90,
        description: "Descrição",
        equipment: ["bodyweight"],
        experienceLevel: "beginner",
        estimatedSetDuration: 30,
        execution: "Execução",
        id: "test-exercise",
        instructions: "Instruções",
        movementPattern: "conditioning",
        name: "Teste",
        primaryMuscles: ["core"],
        mistakes: "Erros comuns",
        safetyNotes: "Notas",
        secondaryMuscles: [],
        setup: "Setup",
        slug: "test-exercise",
        source: {
          name: "Source",
          note: null,
          url: null,
        },
        thumbnail: null,
        video: {
          aspectRatio: "16:9",
          autoplayAllowed: false,
          durationSeconds: null,
          mutedDefault: true,
          posterUrl: null,
          src: null,
        },
      }),
    ).toThrow();
  });
});
