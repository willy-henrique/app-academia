import "server-only";

import { z } from "zod";

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

const workoutPlanSchema = z.object({
  title: z.string().trim().min(1),
  focus: z.string().trim().min(1),
  level: z.string().trim().min(1),
  duration: z.string().trim().min(1),
  exercises: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        muscleGroup: z.string().trim().min(1),
        sets: z.number().int().positive(),
        reps: z.string().trim().min(1),
        rir: z.number().int().min(0).max(10),
        restSeconds: z.number().int().positive(),
        tip: z.string(),
      }),
    )
    .length(3),
});

const nutritionPlanSchema = z.object({
  dailyCaloriesTarget: z.number().int().positive(),
  macros: z.object({
    proteinGrams: z.number().int().nonnegative(),
    carbsGrams: z.number().int().nonnegative(),
    fatsGrams: z.number().int().nonnegative(),
  }),
  guidelines: z.array(z.string().trim().min(1)).length(2),
  suggestedMeals: z
    .array(
      z.object({
        meal: z.string().trim().min(1),
        description: z.string().trim().min(1),
        protein: z.string().trim().min(1),
        carbs: z.string().trim().min(1),
      }),
    )
    .length(2),
});

export class AiRateLimitError extends Error {
  constructor(readonly retryAfterSeconds: number | null) {
    super("A IA atingiu o limite temporário. Aguarde um instante e tente novamente.");
    this.name = "AiRateLimitError";
  }
}

function retryAfterSeconds(response: Response, errorText: string): number | null {
  const headerValue = Number.parseInt(response.headers.get("retry-after") ?? "", 10);
  if (Number.isInteger(headerValue) && headerValue > 0) {
    return headerValue;
  }

  const match = errorText.match(/try again in\s+([\d.]+)s/i);
  if (!match) {
    return null;
  }

  const seconds = Math.ceil(Number(match[1]));
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}

async function requestGroqJson(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
): Promise<unknown> {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 429) {
      throw new AiRateLimitError(retryAfterSeconds(response, errorText));
    }
    throw new Error(`Erro na chamada Groq (${response.status}): ${errorText}`);
  }

  const json = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const rawContent = json.choices?.[0]?.message?.content;
  if (!rawContent) {
    throw new Error("Resposta vazia da IA.");
  }

  try {
    return JSON.parse(rawContent);
  } catch {
    throw new Error("A IA retornou uma resposta inválida. Tente gerar o plano novamente.");
  }
}

export async function generateCustomWorkoutAndDietPlan(
  input: AiGenerateInput,
): Promise<AiWorkoutDietPlan> {
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL || "qwen/qwen3.8-27b";

  if (!apiKey) {
    throw new Error("GROQ_API_KEY não configurada no ambiente.");
  }

  const studentContext = `DADOS DO ALUNO:
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
 - Preferência de cardio: ${input.cardioPreference || "opcional"}`;

  const workout = workoutPlanSchema.safeParse(
    await requestGroqJson(
      apiKey,
      model,
      "Você é um treinador baseado em evidências. Responda somente JSON válido, sem markdown.",
      `${studentContext}\n\nCrie o treino de hoje com exatamente este JSON: {"title":"","focus":"","level":"","duration":"","exercises":[{"name":"","muscleGroup":"","sets":3,"reps":"8-12","rir":2,"restSeconds":90,"tip":""},{"name":"","muscleGroup":"","sets":3,"reps":"8-12","rir":2,"restSeconds":90,"tip":""},{"name":"","muscleGroup":"","sets":3,"reps":"8-12","rir":2,"restSeconds":90,"tip":""}]}. Dicas: até 10 palavras.`,
      320,
    ),
  );
  const nutrition = nutritionPlanSchema.safeParse(
    await requestGroqJson(
      apiKey,
      model,
      "Você é um nutricionista esportivo baseado em evidências. Responda somente JSON válido, sem markdown.",
      `${studentContext}\n\nCrie a estratégia alimentar com exatamente este JSON: {"dailyCaloriesTarget":2400,"macros":{"proteinGrams":160,"carbsGrams":280,"fatsGrams":70},"guidelines":["",""],"suggestedMeals":[{"meal":"","description":"","protein":"30g","carbs":"45g"},{"meal":"","description":"","protein":"30g","carbs":"45g"}]}. Descrições: até 10 palavras.`,
      260,
    ),
  );

  if (!workout.success || !nutrition.success) {
    throw new Error("A IA retornou um plano incompleto. Tente gerar o plano novamente.");
  }

  return { nutrition: nutrition.data, workout: workout.data };
}
