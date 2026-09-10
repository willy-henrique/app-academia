import { exerciseSchema, type Exercise } from "./exercise";

const seedExerciseRecords = [
  {
    accessibleDescription:
      "Supino com barra em banco reto, com instruções passo a passo e legenda.",
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
        id: "bench-press-reduced-range",
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
    mistakes: "Não perder escápulas, não abrir cotovelos excessivamente e não rebater a barra.",
    movementPattern: "push_horizontal",
    name: "Supino reto com barra",
    primaryMuscles: ["peitoral maior"],
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
  },
  {
    accessibleDescription: "Agachamento com peso corporal com instruções simples e apoio visual.",
    aliases: ["agachamento livre", "bodyweight squat"],
    alternatives: [
      {
        criteria: "Sem carga externa ou espaço reduzido.",
        exerciseId: "box-squat",
        label: "Box squat",
        privateReasonCodes: ["environment_constraint"],
        publicReason: "Mantém o padrão de agachar com referência clara de profundidade.",
      },
    ],
    adaptations: [
      {
        id: "squat-box-support",
        label: "Box squat",
        operationalResult: "Usar caixa ou banco para controlar amplitude e equilíbrio.",
        privateReasonCodes: ["balance_support"],
        publicNote: "Versão adaptada selecionada.",
        requiresReview: false,
      },
    ],
    attribution: "WillTreino editorial team",
    breathing: "Inspirar antes da descida e expirar ao subir.",
    captions: [],
    defaultRestMax: 90,
    defaultRestMin: 60,
    description: "Agachamento com peso corporal para padrão de movimento básico.",
    equipment: ["bodyweight", "mat"],
    experienceLevel: "beginner",
    estimatedSetDuration: 35,
    execution: "Descer mantendo tronco estável e subir com controle, sem colapsar os joelhos.",
    id: "bodyweight-squat",
    instructions:
      "1. Pés na largura confortável. 2. Desça controlando. 3. Suba mantendo o alinhamento.",
    license: "CC BY 4.0",
    mistakes:
      "Não arredondar as costas, não tirar os calcanhares do chão e não colapsar os joelhos.",
    movementPattern: "squat",
    name: "Agachamento livre",
    primaryMuscles: ["quadríceps", "glúteo máximo"],
    progressions: [
      {
        criteria: "3 séries estáveis com boa amplitude.",
        exerciseId: "goblet-squat",
        label: "Goblet squat",
        privateReasonCodes: ["progression_ready"],
        publicReason: "Introduz carga frontal leve para consolidar o padrão.",
      },
    ],
    regressions: [
      {
        criteria: "Perda de equilíbrio na descida.",
        exerciseId: "box-squat",
        label: "Box squat",
        privateReasonCodes: ["balance_support"],
        publicReason: "Usa referência física para facilitar o controle.",
      },
    ],
    safetyNotes: "Pare se houver dor aguda e mantenha controle de joelho e tronco.",
    secondaryMuscles: ["isquiotibiais", "core"],
    setup: "Escolha um espaço livre e uma base estável.",
    slug: "agachamento-livre",
    source: {
      name: "WillTreino content standards",
      note: "Conteúdo inicial curado para catálogo interno.",
      url: "https://willtreino.example.com/exercises/bodyweight-squat",
    },
    thumbnail: "https://cdn.example.com/thumbnails/agachamento.jpg",
    video: {
      aspectRatio: "16:9",
      autoplayAllowed: false,
      durationSeconds: 31,
      mutedDefault: true,
      posterUrl: "https://cdn.example.com/posters/agachamento.jpg",
      src: "https://cdn.example.com/videos/agachamento.mp4",
    },
  },
  {
    accessibleDescription:
      "Remada unilateral com halter, com demonstração lateral e instruções por etapas.",
    aliases: ["remada unilateral", "one-arm dumbbell row"],
    alternatives: [
      {
        criteria: "Sem banco disponível.",
        exerciseId: "cable-row",
        label: "Seated cable row",
        privateReasonCodes: ["equipment_unavailable"],
        publicReason: "Mantém o padrão de puxar horizontal com suporte estável.",
      },
    ],
    adaptations: [
      {
        id: "row-supported-chest",
        label: "Remada apoiada",
        operationalResult: "Apoiar o tronco para reduzir demanda lombar.",
        privateReasonCodes: ["trunk_support"],
        publicNote: "Versão adaptada selecionada.",
        requiresReview: false,
      },
    ],
    attribution: "WillTreino editorial team",
    breathing: "Inspirar no alongamento e expirar ao puxar.",
    captions: [],
    defaultRestMax: 90,
    defaultRestMin: 75,
    description: "Padrão de puxar horizontal com halter e apoio.",
    equipment: ["dumbbell", "bench"],
    experienceLevel: "intermediate",
    estimatedSetDuration: 40,
    execution: "Trazer o halter ao quadril mantendo ombros estáveis e coluna neutra.",
    id: "one-arm-dumbbell-row",
    instructions: "1. Apoie uma mão no banco. 2. Puxe com controle. 3. Desça sem perder a postura.",
    license: "CC BY 4.0",
    mistakes: "Não girar o tronco demais, não elevar o ombro e não usar impulso.",
    movementPattern: "pull_horizontal",
    name: "Remada unilateral com halter",
    primaryMuscles: ["latíssimo do dorso"],
    progressions: [
      {
        criteria: "Controle estável sem compensação.",
        exerciseId: "chest-supported-row",
        label: "Remada apoiada no peito",
        privateReasonCodes: ["progression_ready"],
        publicReason: "Aumenta estabilidade e permite maior foco no padrão de puxar.",
      },
    ],
    regressions: [
      {
        criteria: "Desconforto lombar ou dificuldade de estabilização.",
        exerciseId: "seated-cable-row",
        label: "Seated cable row",
        privateReasonCodes: ["lumbar_comfort"],
        publicReason: "Reduz exigência de estabilização sem perder o padrão.",
      },
    ],
    safetyNotes: "Evite rotação excessiva e mantenha o banco estável.",
    secondaryMuscles: ["romboides", "bíceps"],
    setup: "Posicione o banco e o halter ao alcance.",
    slug: "remada-unilateral-halter",
    source: {
      name: "WillTreino content standards",
      note: "Conteúdo inicial curado para catálogo interno.",
      url: "https://willtreino.example.com/exercises/one-arm-dumbbell-row",
    },
    thumbnail: "https://cdn.example.com/thumbnails/remada.jpg",
    video: {
      aspectRatio: "16:9",
      autoplayAllowed: false,
      durationSeconds: 39,
      mutedDefault: true,
      posterUrl: "https://cdn.example.com/posters/remada.jpg",
      src: "https://cdn.example.com/videos/remada.mp4",
    },
  },
] as const;

export const seedExercises: Exercise[] = seedExerciseRecords.map((exercise) =>
  exerciseSchema.parse(exercise),
);

export function getSeedExerciseById(id: string): Exercise | null {
  return seedExercises.find((exercise) => exercise.id === id) ?? null;
}
