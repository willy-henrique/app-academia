"use client";

import { Info, NotebookPen, Plus, Search } from "lucide-react";
import { FormEvent, useState } from "react";

import type { Food } from "@/domain/nutrition/food";
import { estimateDefaultServingNutrition } from "@/domain/nutrition/food";
import type { FoodLogEntry } from "@/domain/nutrition/food-log";
import type { FoodProvider } from "@/application/nutrition/food-provider";
import { createInternalFoodProvider } from "@/infrastructure/nutrition/internal-food-provider";
import { PageHeader, SectionHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/states";

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
    <Card as="article" className="space-y-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="wt-text-h3">{food.name}</h2>
          <p className="mt-0.5 text-wt-body-sm text-wt-text-secondary-strong">
            {food.defaultServing.label}
          </p>
        </div>
        <Badge tone="info">{getSourceLabel(food)}</Badge>
      </div>

      {nutrition ? (
        <dl
          className="m-0 grid grid-cols-4 gap-2"
          aria-label={`Estimativa para ${food.defaultServing.label}`}
        >
          {[
            ["Energia", `${formatMacro(nutrition.energyKcal)} kcal`],
            ["Proteína", `${formatMacro(nutrition.proteinGrams)} g`],
            ["Carbo", `${formatMacro(nutrition.carbohydratesGrams)} g`],
            ["Gordura", `${formatMacro(nutrition.fatGrams)} g`],
          ].map(([term, value]) => (
            <div className="rounded-wt-md bg-wt-surface-elevated px-2 py-2" key={term}>
              <dt className="text-[0.6875rem] font-semibold text-wt-text-secondary-strong">
                {term}
              </dt>
              <dd className="m-0 mt-0.5 text-wt-body-sm font-bold text-wt-text-primary wt-tabular">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-wt-body-sm text-wt-text-secondary-strong">
          A massa desta porção não é conhecida; por isso não calculamos macros por suposição.
        </p>
      )}
      {onAddFood ? (
        <Button
          className="w-full sm:w-auto"
          loading={isLogging}
          loadingLabel="Adicionando"
          variant="tonal"
          onClick={onAddFood}
        >
          <Plus aria-hidden="true" className="size-4" />
          Adicionar ao diário
        </Button>
      ) : null}
    </Card>
  );
}

function FoodLogHistory({ entries }: Readonly<{ entries: readonly FoodLogEntry[] }>) {
  return (
    <section aria-labelledby="food-log-title" className="space-y-3">
      <SectionHeader
        description="Só você vê o que registra aqui."
        id="food-log-title"
        title="Diário recente"
      />

      {entries.length === 0 ? (
        <EmptyState
          description="Busque um alimento e toque em “Adicionar ao diário” quando quiser."
          icon={<NotebookPen />}
          title="Você ainda não registrou alimentos."
        />
      ) : (
        <Card as="div" className="p-2">
          <ul className="divide-y divide-wt-border">
            {entries.map((entry) => (
              <li className="flex items-center justify-between gap-3 px-3 py-3" key={entry.id}>
                <div className="min-w-0">
                  <p className="truncate text-wt-label font-semibold text-wt-text-primary">
                    {entry.food.foodName}
                  </p>
                  <p className="text-xs text-wt-text-secondary-strong">
                    {mealLabels[entry.meal]} · {entry.portionGrams} g · {entry.nutrition.energyKcal}{" "}
                    kcal
                  </p>
                </div>
                <span className="shrink-0 text-xs font-semibold text-wt-text-secondary-strong">
                  {new Date(entry.consumedAt).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                  })}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </section>
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
    <main className="wt-page space-y-8" id="main-content">
      <PageHeader
        description="Porções e macros aproximados, sempre com a origem do dado. Organiza informação — não substitui orientação profissional."
        title="Alimentação"
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-start">
        <div className="space-y-4">
          <form
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
            role="search"
            onSubmit={(event) => void search(event)}
          >
            <div className="min-w-0 flex-1">
              <Input
                autoComplete="off"
                enterKeyHint="search"
                hint="Ex.: arroz, feijão, frango ou banana"
                label="Qual alimento você procura?"
                name="food-search"
                placeholder="Buscar no catálogo"
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <Button
              className="sm:mb-[1.625rem]"
              loading={isSearching}
              loadingLabel="Buscando"
              type="submit"
            >
              <Search aria-hidden="true" size={18} />
              Buscar
            </Button>
          </form>

          <section aria-atomic="true" aria-live="polite" className="space-y-3">
            <p className="text-wt-body-sm text-wt-text-secondary-strong" role="status">
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

          <p className="flex items-start gap-2 wt-text-caption text-wt-text-secondary-strong">
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            Catálogo inicial local, sem preços em tempo real. Informações externas entrarão somente
            com origem, licença e contexto explícitos.
          </p>
        </div>
        {onAddFood ? <FoodLogHistory entries={entries} /> : null}
      </div>
    </main>
  );
}
