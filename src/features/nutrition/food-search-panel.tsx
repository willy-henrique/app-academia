"use client";

import { Search, Sparkles } from "lucide-react";
import { FormEvent, useState } from "react";

import type { Food } from "@/domain/nutrition/food";
import { estimateDefaultServingNutrition } from "@/domain/nutrition/food";
import type { FoodLogEntry } from "@/domain/nutrition/food-log";
import type { FoodProvider } from "@/application/nutrition/food-provider";
import { createInternalFoodProvider } from "@/infrastructure/nutrition/internal-food-provider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const defaultProvider = createInternalFoodProvider();

type FoodSearchPanelProps = Readonly<{
  entries?: readonly FoodLogEntry[];
  onAddFood?: (food: Food) => Promise<void>;
  provider?: FoodProvider;
}>;

const mealLabels: Record<FoodLogEntry["meal"], string> = {
  BREAKFAST: "Café da manhã",
  DINNER: "Jantar",
  LUNCH: "Almoço",
  OTHER: "Outro momento",
  SNACK: "Lanche",
};

function getSourceLabel(food: Food): string {
  if (food.source.provider === "INTERNAL") {
    return "Catálogo WillTreino · estimativa";
  }

  return `${food.source.provider} · ${food.source.confidence.toLocaleLowerCase("pt-BR")}`;
}

function formatMacro(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toLocaleString("pt-BR");
}

function FoodResultCard({
  food,
  isLogging,
  onAddFood,
}: Readonly<{
  food: Food;
  isLogging: boolean;
  onAddFood?: () => void;
}>) {
  const nutrition = estimateDefaultServingNutrition(food);

  return (
    <article className="rounded-wt-md border border-wt-border bg-wt-background/45 p-4 transition-colors hover:border-wt-accent/40">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold tracking-[-0.02em] text-wt-text-primary">
            {food.name}
          </h2>
          <p className="mt-1 text-sm text-wt-text-secondary">{food.defaultServing.label}</p>
        </div>
        <span className="rounded-wt-full border border-wt-accent/25 bg-wt-accent/10 px-2.5 py-1 text-xs font-bold text-wt-accent">
          {getSourceLabel(food)}
        </span>
      </div>

      {nutrition ? (
        <dl
          className="mt-4 grid grid-cols-4 gap-2"
          aria-label={`Estimativa para ${food.defaultServing.label}`}
        >
          <div className="rounded-wt-sm bg-wt-surface px-2 py-2">
            <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-wt-text-secondary">
              Energia
            </dt>
            <dd className="mt-1 text-sm font-bold text-wt-text-primary">
              {formatMacro(nutrition.energyKcal)} kcal
            </dd>
          </div>
          <div className="rounded-wt-sm bg-wt-surface px-2 py-2">
            <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-wt-text-secondary">
              Proteína
            </dt>
            <dd className="mt-1 text-sm font-bold text-wt-text-primary">
              {formatMacro(nutrition.proteinGrams)} g
            </dd>
          </div>
          <div className="rounded-wt-sm bg-wt-surface px-2 py-2">
            <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-wt-text-secondary">
              Carbo
            </dt>
            <dd className="mt-1 text-sm font-bold text-wt-text-primary">
              {formatMacro(nutrition.carbohydratesGrams)} g
            </dd>
          </div>
          <div className="rounded-wt-sm bg-wt-surface px-2 py-2">
            <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-wt-text-secondary">
              Gordura
            </dt>
            <dd className="mt-1 text-sm font-bold text-wt-text-primary">
              {formatMacro(nutrition.fatGrams)} g
            </dd>
          </div>
        </dl>
      ) : (
        <p className="mt-4 text-sm text-wt-text-secondary">
          A massa desta porção não é conhecida; por isso não calculamos macros por suposição.
        </p>
      )}
      {onAddFood ? (
        <Button
          className="mt-4 w-full sm:w-auto"
          loading={isLogging}
          loadingLabel="Adicionando"
          variant="secondary"
          onClick={onAddFood}
        >
          Adicionar ao diário
        </Button>
      ) : null}
    </article>
  );
}

function FoodLogHistory({ entries }: Readonly<{ entries: readonly FoodLogEntry[] }>) {
  return (
    <Card className="space-y-4 p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="wt-kicker">Somente você</p>
          <h2 className="mt-2 text-xl font-extrabold tracking-[-0.035em]">Diário recente</h2>
        </div>
        <span className="text-sm font-semibold text-wt-text-secondary">
          Dados privados por padrão
        </span>
      </div>

      {entries.length === 0 ? (
        <p className="rounded-wt-md border border-dashed border-wt-border p-4 text-sm text-wt-text-secondary">
          Você ainda não registrou alimentos. Adicione um item do catálogo quando quiser.
        </p>
      ) : (
        <ul className="divide-y divide-wt-border/70">
          {entries.map((entry) => (
            <li className="flex flex-wrap items-center justify-between gap-3 py-3" key={entry.id}>
              <div>
                <p className="font-bold text-wt-text-primary">{entry.food.foodName}</p>
                <p className="mt-1 text-sm text-wt-text-secondary">
                  {mealLabels[entry.meal]} · {entry.portionGrams} g · {entry.nutrition.energyKcal}{" "}
                  kcal
                </p>
              </div>
              <span className="text-xs font-bold text-wt-text-secondary">
                {new Date(entry.consumedAt).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** A catalogue search that always surfaces the source and confidence of food data. */
export function FoodSearchPanel({
  entries = [],
  onAddFood,
  provider = defaultProvider,
}: FoodSearchPanelProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<readonly Food[] | null>(null);
  const [message, setMessage] = useState("Busque um alimento para ver valores aproximados.");
  const [isSearching, setIsSearching] = useState(false);
  const [loggingFoodId, setLoggingFoodId] = useState<string | null>(null);

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (query.trim().length < 2) {
      setResults([]);
      setMessage("Digite pelo menos 2 caracteres para pesquisar.");
      return;
    }

    setIsSearching(true);
    try {
      const nextResults = await provider.search(query, { limit: 8 });
      setResults(nextResults);
      setMessage(
        nextResults.length === 0
          ? "Nenhum alimento encontrado no catálogo disponível."
          : `${nextResults.length} alimento${nextResults.length === 1 ? "" : "s"} encontrado${nextResults.length === 1 ? "" : "s"}.`,
      );
    } catch {
      setResults([]);
      setMessage("Não foi possível pesquisar alimentos agora. Tente novamente.");
    } finally {
      setIsSearching(false);
    }
  }

  async function addToFoodLog(food: Food) {
    if (!onAddFood) {
      return;
    }

    setLoggingFoodId(food.id);
    try {
      await onAddFood(food);
      setMessage(`${food.name} foi adicionado ao seu diário privado.`);
    } catch {
      setMessage("Não foi possível registrar esse alimento agora. Tente novamente.");
    } finally {
      setLoggingFoodId(null);
    }
  }

  return (
    <main className="wt-page wt-page-grid mx-auto flex max-w-5xl flex-col gap-5" id="main-content">
      <Card elevated className="space-y-5 p-5 sm:p-7">
        <div className="max-w-2xl">
          <p className="wt-kicker">WillFood · catálogo</p>
          <h1 className="wt-section-title mt-3">Encontre o que faz sentido no seu prato.</h1>
          <p className="mt-3 wt-text-body text-wt-text-secondary">
            Consulte porções e macros aproximados com a origem do dado sempre visível. Esta busca
            organiza informação — ela não substitui orientação profissional individual.
          </p>
        </div>

        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(event) => void search(event)}
        >
          <div className="min-w-0 flex-1">
            <Input
              autoComplete="off"
              hint="Ex.: arroz, feijão, frango ou banana"
              label="Qual alimento você procura?"
              name="food-search"
              placeholder="Buscar no catálogo"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <Button
            className="sm:mb-[1.75rem]"
            loading={isSearching}
            loadingLabel="Buscando"
            type="submit"
          >
            <Search aria-hidden="true" size={18} />
            Buscar
          </Button>
        </form>

        <div className="flex items-start gap-3 rounded-wt-md border border-wt-border/80 bg-wt-background/45 p-3 text-sm text-wt-text-secondary">
          <Sparkles aria-hidden="true" className="mt-0.5 shrink-0 text-wt-accent" size={17} />
          <p>
            Catálogo inicial local, sem preços em tempo real. Informações externas e planejamento
            alimentar entrarão somente com origem, licença e contexto explícitos.
          </p>
        </div>
      </Card>

      <section aria-live="polite" aria-atomic="true" className="space-y-3">
        <p className="wt-text-body text-wt-text-secondary" role="status">
          {message}
        </p>
        {results?.map((food) => (
          <FoodResultCard
            food={food}
            isLogging={loggingFoodId === food.id}
            key={food.id}
            onAddFood={onAddFood ? () => void addToFoodLog(food) : undefined}
          />
        ))}
      </section>
      {onAddFood ? <FoodLogHistory entries={entries} /> : null}
    </main>
  );
}
