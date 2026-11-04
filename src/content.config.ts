/**
 * content.config.ts - collections de contenu du site.
 *
 * `projets` : une fiche Markdown par réalisation dans src/content/projets/.
 * Le frontmatter alimente la carte de /realisations et l'en-tête de la page
 * de détail ; le corps Markdown est la description longue de la fiche.
 * Le nom du fichier donne l'URL : axel-mahe.md -> /realisations/axel-mahe/.
 *
 * Ajouter un projet = créer un fichier ici (voir README) : la liste et la
 * page de détail se génèrent seules, et le build échoue avec un message
 * clair si un champ manque ou a un mauvais format.
 */
import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const fit = z.enum(["cover", "contain"]);

const projets = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/projets" }),
  schema: ({ image }) =>
    z
      .object({
        name: z.string(),
        /** Position dans la liste /realisations (1 = en premier). */
        order: z.number().int(),
        /** client = vraie livraison (rôle en accent) ; perso = projet personnel. */
        kind: z.enum(["client", "perso"]),
        /** Rôle du client, affiché en accent ; obligatoire si kind = client. */
        role: z.string().optional(),
        year: z.string(),
        tags: z.array(z.string()),
        url: z.url().nullable(),
        /** Une phrase : texte de la carte sur /realisations. */
        summary: z.string(),
        /** Meta description de la page de détail (longueur affichée par Google). */
        seoDescription: z.string().max(155),
        /** Aperçu de la carte : vidéo (fichiers de src/assets/previews/) ou image. */
        preview: z.discriminatedUnion("kind", [
          z.object({
            kind: z.literal("video"),
            webm: z.string(),
            mp4: z.string(),
            poster: image(),
            fit,
          }),
          z.object({ kind: z.literal("image"), image: image(), fit }),
        ]),
        gallery: z.object({
          /** paysage : 2 colonnes ; portrait (captures mobile) : jusqu'à 4. */
          layout: z.enum(["paysage", "portrait"]),
          images: z.array(z.object({ src: image(), alt: z.string(), legende: z.string() })),
        }),
      })
      .refine((p) => p.kind !== "client" || Boolean(p.role), {
        message: "Un projet client doit préciser son rôle (champ role).",
        path: ["role"],
      }),
});

export const collections = { projets };
