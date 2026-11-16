// Règle 2 : tous les textes viennent d'un seul endroit, par clé, en FR et EN, mêmes clés.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readJson, appSources } from "../helpers.js";

const fr = readJson("i18n/fr.json");
const en = readJson("i18n/en.json");
const sources = appSources();
const code = sources.map((s) => s.code).join("\n");

// Clés écrites en entier dans le code : "flow.cover.title".
const staticKeys = new Set([...code.matchAll(/["'](flow\.[a-z0-9_.]+)["']/gi)].map((m) => m[1]));

// Clés construites : `flow.quote.option.${opt.code}.name` → une famille, en expression régulière.
const families = [...code.matchAll(/`(flow\.[^`]*\$\{[^`]*)`/g)].map((m) => {
    const pattern = m[1].split(/\$\{[^}]*\}/).map((part) => part.replace(/\./g, "\\.")).join("[a-z0-9_]+");
    return { template: m[1], regex: new RegExp(`^${pattern}$`, "i") };
});

const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("fichiers de langue", () => {
    test("FR et EN ont exactement les mêmes clés", () => {
        assert.deepEqual(Object.keys(en).sort(), Object.keys(fr).sort());
    });

    test("aucun texte vide", () => {
        for (const [lang, messages] of [["fr", fr], ["en", en]]) {
            for (const [key, text] of Object.entries(messages)) {
                assert.ok(typeof text === "string" && text.trim() !== "", `${lang} : ${key} est vide`);
            }
        }
    });

    test("toutes les clés suivent la convention flow.écran.élément", () => {
        for (const key of Object.keys(fr)) assert.match(key, /^flow(\.[a-z0-9_]+)+$/i, key);
    });

    test("chaque texte a les mêmes marqueurs {…} en FR et en EN", () => {
        for (const key of Object.keys(fr)) {
            assert.deepEqual(placeholders(en[key]), placeholders(fr[key]), key);
        }
    });

    test("aucun montant écrit dans un texte (règle 3 : il passe par {price})", () => {
        for (const [lang, messages] of [["fr", fr], ["en", en]]) {
            for (const [key, text] of Object.entries(messages)) {
                assert.doesNotMatch(text, /\d+[,.]\d{2}\s?€|€\s?\d/, `${lang} : ${key}`);
            }
        }
    });
});

describe("clés utilisées par le code", () => {
    test("chaque clé écrite dans le code existe", () => {
        const missing = [...staticKeys].filter((key) => !(key in fr));
        assert.deepEqual(missing, []);
    });

    test("chaque famille de clés construites a au moins une clé", () => {
        for (const { template, regex } of families) {
            assert.ok(Object.keys(fr).some((key) => regex.test(key)), `aucune clé pour ${template}`);
        }
    });

    test("aucune clé orpheline : chaque clé est utilisée par le code", () => {
        const unused = Object.keys(fr).filter((key) => !staticKeys.has(key) && !families.some((f) => f.regex.test(key)));
        assert.deepEqual(unused, []);
    });

    test("chaque code d'erreur connu a un titre, une phrase et une action (règle 6)", () => {
        const codes = ["driver_ineligible", "quote_expired", "quote_not_found", "consent_required", "invalid_request", "network_error", "generic"];
        for (const c of codes) {
            for (const part of ["title", "body", "action"]) assert.ok(`flow.error.${c}.${part}` in fr, `flow.error.${c}.${part}`);
        }
    });

    test("chaque raison de validation a un message", () => {
        for (const reason of ["valueMissing", "badInput", "patternMismatch", "rangeUnderflow", "rangeOverflow", "typeMismatch"]) {
            assert.ok(`flow.error.field.${reason}` in fr, reason);
        }
    });

    test("chaque option, formule et modèle du stub a son nom", () => {
        for (const opt of ["WALLBOX", "CABLE", "BATTERY", "STRANDED", "GLASS"]) {
            assert.ok(`flow.quote.option.${opt}.name` in fr && `flow.quote.option.${opt}.desc` in fr, opt);
        }
        for (const pkg of ["essential", "comfort", "integral"]) {
            assert.ok(`flow.quote.package.${pkg}.name` in fr && `flow.quote.package.${pkg}.desc` in fr, pkg);
        }
        for (const model of ["i4", "i5", "i7", "iX1", "iX2", "iX3"]) assert.ok(`flow.vehicle.models.${model}` in fr, model);
    });
});

describe("aucun texte en dur dans le code", () => {
    test("pas de phrase française ou anglaise dans un élément créé par h()", () => {
        // h("p", {}, "Un texte") : le 3e argument d'un h() ne doit jamais être une chaîne littérale.
        const offenders = [];
        for (const { path, code: src } of sources) {
            for (const m of src.matchAll(/\bh\(\s*"[a-z0-9]+"\s*,\s*\{[^}]*\}\s*,\s*"([^"]*[A-Za-zÀ-ÿ]{2,}[^"]*)"/g)) {
                offenders.push(`${path} : "${m[1]}"`);
            }
        }
        assert.deepEqual(offenders, []);
    });

    test("le seul texte en dur est le message affiché si la langue ne charge pas", () => {
        // api.js est exclu : ses messages anglais imitent ceux du serveur et ne vont qu'à la console.
        const sentences = sources.filter((s) => s.path !== "js/api.js").flatMap(({ path, code: src }) =>
            [...src.matchAll(/"([A-ZÀ-Ý][a-zà-ÿ]+ [^"]{10,})"/g)].map((m) => `${path} : ${m[1]}`));
        assert.equal(sentences.length, 1, sentences.join("\n"));
        assert.match(sentences[0], /^js\/main\.js/);
    });
});
