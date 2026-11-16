// La fonction t() et le chargement des fichiers de langue.
import { test, describe, before, after, mock } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { ROOT, readJson } from "../helpers.js";
import { loadLocale, t } from "../../js/i18n.js";

// fetch("i18n/fr.json") lit le fichier du projet, comme le ferait le navigateur.
before(() => {
    mock.method(globalThis, "fetch", async (url) => {
        const found = existsSync(join(ROOT, url));
        return { ok: found, status: found ? 200 : 404, json: async () => readJson(url) };
    });
});
after(() => mock.restoreAll());

describe("loadLocale", () => {
    test("charge le français et met à jour <html lang>", async () => {
        await loadLocale("fr");
        assert.equal(document.documentElement.lang, "fr");
        assert.equal(t("flow.nav.continue"), readJson("i18n/fr.json")["flow.nav.continue"]);
    });

    test("charge l'anglais", async () => {
        await loadLocale("en");
        assert.equal(document.documentElement.lang, "en");
        assert.equal(t("flow.nav.continue"), readJson("i18n/en.json")["flow.nav.continue"]);
    });

    test("fichier introuvable : lève une erreur (main.js affiche alors son message de secours)", async () => {
        await assert.rejects(loadLocale("xx"), /introuvable/);
    });
});

describe("t()", () => {
    before(() => loadLocale("fr"));

    test("remplace un marqueur {price}", () => {
        assert.equal(t("flow.quote.per.annual", { price: "420,00 €" }), "420,00 € / an");
    });

    test("remplace plusieurs marqueurs", () => {
        const text = t("flow.quote.per.both", { annual: "A", monthly: "M" });
        assert.ok(text.includes("A") && text.includes("M") && !text.includes("{"));
    });

    test("un paramètre manquant laisse le marqueur visible (bug repérable plutôt que « undefined »)", () => {
        assert.match(t("flow.quote.per.annual"), /\{price\}/);
    });

    test("clé inconnue : renvoie la clé et prévient dans la console, sans planter", () => {
        const warn = mock.method(console, "warn", () => {});
        assert.equal(t("flow.nope"), "flow.nope");
        assert.equal(warn.mock.callCount(), 1);
        warn.mock.restore();
    });

    test("un texte sans marqueur est rendu tel quel, même avec des paramètres", () => {
        assert.equal(t("flow.nav.continue", { price: "x" }), readJson("i18n/fr.json")["flow.nav.continue"]);
    });
});
