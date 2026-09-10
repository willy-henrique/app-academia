import { equipmentOptions } from "@/domain/workout/exercise";

export type Equipment = (typeof equipmentOptions)[number];

/**
 * Nomes em português dos equipamentos do catálogo. O `Record` completo faz o
 * TypeScript recusar um equipamento novo sem tradução — o identificador cru
 * ("smith_machine") nunca chega à tela.
 */
export const equipmentLabels: Record<Equipment, string> = {
  band: "Elástico",
  barbell: "Barra",
  bench: "Banco",
  bodyweight: "Peso do corpo",
  cable: "Polia",
  cardio_machine: "Aparelho de cardio",
  dumbbell: "Halteres",
  kettlebell: "Kettlebell",
  machine: "Máquina",
  mat: "Colchonete",
  medicine_ball: "Medicine ball",
  other: "Outro",
  plate_loaded_machine: "Máquina de anilhas",
  pull_up_bar: "Barra fixa",
  rings: "Argolas",
  slam_ball: "Slam ball",
  smith_machine: "Smith",
  step: "Step",
  trap_bar: "Trap bar",
  trx: "TRX / fita suspensa",
};

export function isKnownEquipment(value: string): value is Equipment {
  return (equipmentOptions as readonly string[]).includes(value);
}

export function formatEquipment(values: readonly string[]): string {
  return values.map((value) => (isKnownEquipment(value) ? equipmentLabels[value] : value)).join(", ");
}

/** "peitoral maior" → "Peitoral maior": a primeira letra em maiúscula, o resto intacto. */
export function capitalize(value: string): string {
  return value.length > 0 ? `${value[0].toLocaleUpperCase("pt-BR")}${value.slice(1)}` : value;
}
