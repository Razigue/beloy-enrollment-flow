// Outils partagés par les tests. Aucune dépendance : uniquement Node.
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

export const ROOT = fileURLToPath(new URL("..", import.meta.url));

export const read = (path) => readFileSync(join(ROOT, path), "utf8");
export const readJson = (path) => JSON.parse(read(path));

// Retire les commentaires (les exemples qu'ils contiennent ne sont pas du code).
// « (^|[^:]) » épargne les « http:// » des chaînes.
export const stripComments = (code) => code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

// Tous les fichiers .js de l'app (js/ et js/screens/).
export function appSources() {
    const files = [];
    for (const dir of ["js", "js/screens"]) {
        for (const name of readdirSync(join(ROOT, dir))) {
            if (name.endsWith(".js")) files.push({ path: `${dir}/${name}`, code: stripComments(read(`${dir}/${name}`)) });
        }
    }
    return files;
}

// format.js et i18n.js lisent la langue sur <html lang>. Node n'a pas de DOM :
// on fournit le strict nécessaire, et la langue se change avec setLang().
globalThis.document ??= { documentElement: { lang: "fr" } };
export const setLang = (lang) => { document.documentElement.lang = lang; };

// Intl sépare les milliers et « € » par des espaces insécables (U+00A0, U+202F) :
// on les remplace par des espaces normales pour écrire des attentes lisibles.
export const plain = (text) => text.replace(/[  ]/g, " ");
