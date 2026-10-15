"use client";

import {
  collection,
  doc,
  getDocs,
  limit as queryLimit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { recipeSchema, type Recipe } from "@/domain/nutrition/recipe";
import { getFirebaseClientServices } from "@/infrastructure/firebase/client";

function recipesCollection(uid: string) {
  const { firestore } = getFirebaseClientServices();
  return collection(firestore, "recipes", uid, "items");
}

/** Saves only the signed-in person's private recipe. */
export async function saveRecipe(recipe: Recipe): Promise<Recipe> {
  const parsed = recipeSchema.parse(recipe);
  const { auth } = getFirebaseClientServices();
  const uid = auth.currentUser?.uid;

  if (!uid) {
    throw new Error("É necessário entrar na conta para salvar uma receita.");
  }

  if (uid !== parsed.ownerUid) {
    throw new Error("Uma pessoa só pode salvar as próprias receitas.");
  }

  await setDoc(doc(recipesCollection(uid), parsed.id), {
    ...parsed,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return parsed;
}

/** Reads a bounded page of the signed-in person's own recipe library. */
export async function listRecipes(uid: string, maximum = 12): Promise<Recipe[]> {
  const { auth } = getFirebaseClientServices();
  if (auth.currentUser?.uid !== uid) {
    throw new Error("Uma pessoa só pode consultar as próprias receitas.");
  }

  const snapshot = await getDocs(
    query(recipesCollection(uid), orderBy("updatedAt", "desc"), queryLimit(Math.max(1, maximum))),
  );

  return snapshot.docs
    .map((item) => recipeSchema.safeParse(item.data()))
    .filter((parsed) => parsed.success)
    .map((parsed) => parsed.data);
}
