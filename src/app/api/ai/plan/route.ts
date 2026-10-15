import { NextResponse } from "next/server";
import {
  AiRateLimitError,
  generateCustomWorkoutAndDietPlan,
  type AiGenerateInput,
} from "@/application/ai/coach-service";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<AiGenerateInput>;

    const input: AiGenerateInput = {
      daysPerWeek: body.daysPerWeek ?? 3,
      equipment: body.equipment ?? [],
      experience: body.experience ?? "iniciante",
      goal: body.goal ?? "saude",
      location: body.location ?? "academia",
      sessionMinutes: body.sessionMinutes ?? 60,
      cardioPreference: body.cardioPreference,
      heightCm: body.heightCm,
      limitations: body.limitations,
      safetyNotes: body.safetyNotes,
      weightKg: body.weightKg,
    };

    const plan = await generateCustomWorkoutAndDietPlan(input);
    return NextResponse.json({ ok: true, plan });
  } catch (error) {
    if (error instanceof AiRateLimitError) {
      const retryAfterSeconds = error.retryAfterSeconds;
      return NextResponse.json(
        {
          ok: false,
          error: retryAfterSeconds
            ? `A IA está no limite temporário. Aguarde ${retryAfterSeconds} segundos e tente novamente.`
            : error.message,
        },
        {
          status: 429,
          headers: retryAfterSeconds ? { "Retry-After": String(retryAfterSeconds) } : undefined,
        },
      );
    }

    const message = error instanceof Error ? error.message : "Erro ao gerar plano de IA";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
