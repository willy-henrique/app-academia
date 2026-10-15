"use client";

import { BookOpen, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { LiveRegion } from "@/components/accessibility/live-region";
import { SectionHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { CreateRecipeInput, Recipe } from "@/domain/nutrition/recipe";
import type { Food } from "@/domain/nutrition/food";

type DraftIngredient = Readonly<{ food: Food; grams: number }>;

type RecipePanelProps = Readonly<{
  foods: readonly Food[];
  onSaveRecipe: (input: Omit<CreateRecipeInput, "id" | "ownerUid">) => Promise<void>;
  recipes: readonly Recipe[];
}>;

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toLocaleString("pt-BR");
}

/** Private recipe composer backed by the approved food catalogue. */
export function RecipePanel({ foods, onSaveRecipe, recipes }: RecipePanelProps) {
  const [name, setName] = useState("");
  const [servings, setServings] = useState("1");
  const [selectedFoodId, setSelectedFoodId] = useState(foods.at(0)?.id ?? "");
  const [grams, setGrams] = useState("");
  const [ingredients, setIngredients] = useState<readonly DraftIngredient[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  function addIngredient() {
    const food = foods.find((item) => item.id === selectedFoodId);
    const portion = Number(grams.replace(",", "."));

    if (!food || !Number.isFinite(portion) || portion <= 0) {
      setMessage("Escolha um alimento e informe uma quantidade em gramas maior que zero.");
      return;
    }

    setIngredients((current) => [...current, { food, grams: portion }]);
    setGrams("");
    setMessage(`${food.name} foi adicionado à receita.`);
  }

  async function save() {
    const parsedServings = Number(servings);
    if (
      name.trim().length === 0 ||
      ingredients.length === 0 ||
      !Number.isInteger(parsedServings) ||
      parsedServings < 1
    ) {
      setMessage("Informe o nome, ao menos um ingrediente e o número de porções.");
      return;
    }

    setSaving(true);
    try {
      await onSaveRecipe({ ingredients, name, servings: parsedServings });
      setName("");
      setServings("1");
      setIngredients([]);
      setMessage("Receita privada salva. As macros são uma estimativa por porção.");
    } catch {
      setMessage("Não foi possível salvar a receita agora. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby="recipes-title" className="space-y-4">
      <SectionHeader
        description="Monte receitas privadas com os alimentos do catálogo e veja a estimativa por porção."
        id="recipes-title"
        title="Minhas receitas"
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
        <Card className="space-y-4 p-5">
          <Input
            label="Nome da receita"
            maxLength={180}
            placeholder="Ex.: Frango com arroz"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Input
            inputMode="numeric"
            label="Porções"
            min="1"
            type="number"
            value={servings}
            onChange={(event) => setServings(event.target.value)}
          />

          <fieldset className="space-y-3 border-t border-wt-border pt-4">
            <legend className="wt-text-label font-semibold text-wt-text-primary">
              Adicionar ingrediente
            </legend>
            <label className="grid gap-2 text-wt-label text-wt-text-primary" htmlFor="recipe-food">
              Alimento
              <select
                className="min-h-11 rounded-wt-md border border-wt-border bg-wt-surface px-3 text-wt-body text-wt-text-primary"
                id="recipe-food"
                value={selectedFoodId}
                onChange={(event) => setSelectedFoodId(event.target.value)}
              >
                {foods.map((food) => (
                  <option key={food.id} value={food.id}>
                    {food.name}
                  </option>
                ))}
              </select>
            </label>
            <Input
              inputMode="decimal"
              label="Quantidade (g)"
              min="0.1"
              type="number"
              value={grams}
              onChange={(event) => setGrams(event.target.value)}
            />
            <Button onClick={addIngredient} variant="tonal">
              <Plus aria-hidden="true" className="size-4" /> Adicionar ingrediente
            </Button>
          </fieldset>

          {ingredients.length > 0 ? (
            <ul
              aria-label="Ingredientes da receita"
              className="divide-y divide-wt-border rounded-wt-lg border border-wt-border"
            >
              {ingredients.map((ingredient, index) => (
                <li
                  className="flex items-center justify-between gap-3 px-3 py-2"
                  key={`${ingredient.food.id}-${index}`}
                >
                  <span className="text-wt-body-sm">
                    {ingredient.food.name} · {formatNumber(ingredient.grams)} g
                  </span>
                  <Button
                    aria-label={`Remover ${ingredient.food.name}`}
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      setIngredients((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}

          <Button loading={saving} loadingLabel="Salvando" onClick={() => void save()}>
            Salvar receita
          </Button>
          <LiveRegion politeness="polite" visible={Boolean(message)}>
            {message}
          </LiveRegion>
        </Card>

        {recipes.length === 0 ? (
          <Card className="space-y-2 p-5">
            <BookOpen aria-hidden="true" className="size-6 text-wt-accent-text" />
            <p className="wt-text-label font-semibold">Nenhuma receita salva</p>
            <p className="text-wt-body-sm text-wt-text-secondary-strong">
              Suas receitas ficam somente na sua conta e podem ser usadas no seu planejamento
              depois.
            </p>
          </Card>
        ) : (
          <div className="space-y-3" aria-label="Receitas salvas">
            {recipes.map((recipe) => (
              <Card as="article" className="space-y-2 p-5" key={recipe.id}>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="wt-text-h3">{recipe.name}</h3>
                  <span className="shrink-0 text-xs font-semibold text-wt-text-secondary-strong">
                    {recipe.servings} porção{recipe.servings === 1 ? "" : "ões"}
                  </span>
                </div>
                <p className="text-wt-body-sm text-wt-text-secondary-strong">
                  {recipe.ingredients.length} ingrediente
                  {recipe.ingredients.length === 1 ? "" : "s"} ·{" "}
                  {formatNumber(recipe.estimatedNutritionPerServing.energyKcal)} kcal por porção
                </p>
                <p className="wt-text-caption text-wt-text-secondary-strong">
                  P {formatNumber(recipe.estimatedNutritionPerServing.proteinGrams)} g · C{" "}
                  {formatNumber(recipe.estimatedNutritionPerServing.carbohydratesGrams)} g · G{" "}
                  {formatNumber(recipe.estimatedNutritionPerServing.fatGrams)} g
                </p>
              </Card>
            ))}
          </div>
        )}
      </div>
      <p className="wt-text-caption text-wt-text-secondary-strong">
        Valores são aproximações do catálogo no momento em que a receita foi salva e não constituem
        prescrição alimentar.
      </p>
    </section>
  );
}
