"use client";

import { useRef, useState, useTransition } from "react";
import { fetchRecipePhoto, removeRecipePhoto, setUploadedPhoto } from "@/app/actions";
import { createClient } from "@/lib/supabase/client";

/** Côté le plus long d'une photo envoyée : assez pour l'écran, léger pour le stockage. */
const MAX_SIDE = 1280;

/** Réduit la photo dans le téléphone avant l'envoi : une photo d'appareil fait souvent 4 à 8 Mo. */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const ratio = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * ratio);
  canvas.height = Math.round(bitmap.height * ratio);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("conversion"))), "image/jpeg", 0.82));
}

/** Choisir la photo d'une recette : la sienne (galerie ou appareil photo), ou une proposition d'Unsplash. */
export function RecipePhotoButton({ recipeId, householdId, hasPhoto }: { recipeId: string; householdId: string; hasPhoto: boolean }) {
  const [skip, setSkip] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const busy = pending || uploading;

  async function upload(file: File) {
    setError(null);
    setUploading(true);
    try {
      const blob = await shrink(file);
      const path = `${householdId}/${recipeId}-${Date.now()}.jpg`;
      const { error: sent } = await createClient().storage.from("recipe-photos").upload(path, blob, { contentType: "image/jpeg" });
      if (sent) throw new Error(sent.message);
      const res = await setUploadedPhoto(recipeId, path);
      if (res.error) setError(res.error);
    } catch {
      setError("Envoi impossible. Vérifiez la connexion, ou essayez une autre photo.");
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-label="Choisir une photo depuis le téléphone"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
        }}
      />
      <button type="button" disabled={busy} onClick={() => input.current?.click()} className="btn-secondary min-h-9 text-xs">
        {uploading ? "Envoi…" : hasPhoto ? "Ma photo" : "Ajouter ma photo"}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() =>
          start(async () => {
            setError(null);
            const next = hasPhoto ? skip + 1 : skip;
            setSkip(next);
            const res = await fetchRecipePhoto(recipeId, next);
            if (res.error) setError(res.error);
          })
        }
        className="btn-secondary min-h-9 text-xs"
      >
        {pending ? "Recherche…" : hasPhoto ? "Autre photo" : "Chercher une photo"}
      </button>
      {hasPhoto && (
        <button type="button" disabled={busy} onClick={() => start(() => removeRecipePhoto(recipeId))} className="text-xs font-medium text-muted underline">
          Retirer
        </button>
      )}
      {error && (
        <p role="alert" className="w-full text-xs text-warn">
          {error}
        </p>
      )}
    </div>
  );
}
