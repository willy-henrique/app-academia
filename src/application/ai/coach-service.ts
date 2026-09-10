import "server-only";

export type AiWorkoutDietPlan = {
  workout: {
    title: string;
    focus: string;
    level: string;
    duration: string;
    exercises: Array<{
      name: string;
      muscleGroup: string;
      sets: number;
      reps: string;
      rir: number;
      restSeconds: number;
      tip: string;
    }>;
  };
  nutrition: {
    dailyCaloriesTarget: number;
    macros: {
      proteinGrams: number;
      carbsGrams: number;
      fatsGrams: number;
    };
    guidelines: string[];
    suggestedMeals: Array<{
      meal: string;
      description: string;
      protein: string;
      carbs: string;
    }>;
  };
};

export type AiGenerateInput = {
  goal: string;
  experience: string;
  daysPerWeek: number;
  sessionMinutes: number;
  location: string;
  equipment: string[];
  heightCm?: number | null;
  weightKg?: number | null;
  limitations?: string[];
  safetyNotes?: string;
  cardioPreference?: string;
};

export async function generateCustomWorkoutAndDietPlan(
  input: AiGenerateInput,
): Promise<AiWorkoutDietPlan> {
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL || "qwen/qwen3.8-27b";

  if (!apiKey) {
    throw new Error("GROQ_API_KEY não configurada no ambiente.");
  }

  const systemPrompt = `Você é o WillCoach, um dos maiores especialistas mundiais em Treinamento de Força, Fisiologia do Exercício e Nutrição Esportiva baseada em evidências.
Sua missão é gerar um plano de treino personalizado e uma estratégia alimentar ultra-precisa e individualizada.
Responda ESTRITAMENTE em formato JSON válido, sem texto antes ou depois, sem markdown fences, conforme este schema:
{
  "workout": {
    "title": "string (ex: Hipertrofia & Força - Push/Pull)",
    "focus": "string (ex: Peito, Ombros e Tríceps)",
    "level": "string",
    "duration": "string (ex: 1h ou 45 min)",
    "exercises": [
      {
        "name": "string (nome em português do exercício)",
        "muscleGroup": "string (ex: Peitoral)",
        "sets": 3,
        "reps": "8-12",
        "rir": 2,
        "restSeconds": 90,
        "tip": "string (instrução biomecânica crucial)"
      }
    ]
  },
  "nutrition": {
    "dailyCaloriesTarget": 2400,
    "macros": {
      "proteinGrams": 160,
      "carbsGrams": 280,
      "fatsGrams": 70
    },
    "guidelines": ["string", "string"],
    "suggestedMeals": [
      {
        "meal": "string (ex: Café da manhã)",
        "description": "string",
        "protein": "string (ex: 30g)",
        "carbs": "string (ex: 45g)"
      }
    ]
  }
}`;

  const userPrompt = `DADOS DO ALUNO:
- Objetivo principal: ${input.goal || "saude"}
- Nível de experiência: ${input.experience || "iniciante"}
- Frequência semanal: ${input.daysPerWeek || 3} dias por semana
- Tempo disponível por sessão: ${input.sessionMinutes || 60} minutos
- Local de treino: ${input.location || "academia"}
- Equipamentos disponíveis: ${input.equipment.length > 0 ? input.equipment.join(", ") : "equipamentos completos de academia"}
- Altura: ${input.heightCm ? input.heightCm + " cm" : "Não informada"}
- Peso: ${input.weightKg ? input.weightKg + " kg" : "Não informado"}
- Adaptações/Limitações: ${input.limitations && input.limitations.length > 0 ? input.limitations.join(", ") : "Nenhuma"}
- Observações de segurança: ${input.safetyNotes || "Nenhuma"}
- Preferência de cardio: ${input.cardioPreference || "opcional"}

Gere um treino específico para a sessão de hoje e as diretrizes de dieta correspondentes respeitando a duração e os equipamentos.`;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro na chamada Groq (${response.status}): ${errorText}`);
  }

  const json = await response.json();
  const rawContent = json.choices?.[0]?.message?.content;
  if (!rawContent) {
    throw new Error("Resposta vazia da IA.");
  }

  const parsed = JSON.parse(rawContent) as AiWorkoutDietPlan;
  return parsed;
}
