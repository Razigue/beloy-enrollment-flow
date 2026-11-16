// Les stubs de l'API Ardenne doivent répondre exactement comme la documentation.
import { test, describe, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { appSources } from "../helpers.js";
import { createQuote, createContract, ApiError } from "../../js/api.js";
import { QUOTE_REQUEST, QUOTE_RESPONSE, CONTRACT_REQUEST, CONTRACT_RESPONSE } from "../fixtures/api-doc.js";

// Les stubs attendent 900 ms et l'éligibilité dépend de la date du jour :
// on fige l'horloge au 15 janvier 2027 et on avance le temps à la main.
const TODAY = new Date(2027, 0, 15, 12);
beforeEach(() => mock.timers.enable({ apis: ["setTimeout", "Date"], now: TODAY }));
afterEach(() => mock.timers.reset());

async function call(fn, payload) {
    const promise = fn(payload);
    mock.timers.tick(900);
    return promise;
}
const withDriver = (driver) => ({ ...QUOTE_REQUEST, driver: { ...QUOTE_REQUEST.driver, ...driver } });

describe("POST /v1/quotes (stub)", () => {
    test("renvoie exactement la réponse d'exemple de la doc", async () => {
        assert.deepEqual(await call(createQuote, QUOTE_REQUEST), QUOTE_RESPONSE);
    });

    test("répond après un délai : l'écran a un vrai état d'attente à montrer", async () => {
        let done = false;
        const promise = createQuote(QUOTE_REQUEST).then(() => { done = true; });
        mock.timers.tick(899);
        await Promise.resolve();
        assert.equal(done, false);
        mock.timers.tick(1);
        await promise;
        assert.equal(done, true);
    });

    test("3 formules, de la moins chère à la plus chère (doc : « ascending order of cover »)", async () => {
        const { packages } = await call(createQuote, QUOTE_REQUEST);
        assert.deepEqual(packages.map((p) => p.id), ["essential", "comfort", "integral"]);
        const annual = packages.map((p) => p.price.annual);
        assert.deepEqual(annual, [...annual].sort((a, b) => a - b));
    });

    test("les 5 mêmes options sur chaque formule", async () => {
        const { packages } = await call(createQuote, QUOTE_REQUEST);
        for (const pkg of packages) {
            assert.deepEqual(pkg.options.map((o) => o.code), ["WALLBOX", "CABLE", "BATTERY", "STRANDED", "GLASS"]);
        }
    });

    test("une option incluse coûte 0", async () => {
        const { packages } = await call(createQuote, QUOTE_REQUEST);
        for (const opt of packages.flatMap((p) => p.options).filter((o) => o.included)) {
            assert.deepEqual(opt.price, { annual: 0, monthly: 0 });
        }
    });

    test("tous les montants sont des entiers en centimes", async () => {
        const quote = await call(createQuote, QUOTE_REQUEST);
        const amounts = quote.packages.flatMap((p) => [p.price, ...p.options.map((o) => o.price)]).flatMap((p) => [p.annual, p.monthly]);
        assert.ok(amounts.every(Number.isInteger));
    });

    test("le mensuel n'est pas l'annuel divisé par 12 (doc) : on ne le recalcule jamais", async () => {
        const { packages } = await call(createQuote, QUOTE_REQUEST);
        for (const pkg of packages) assert.notEqual(pkg.price.monthly, pkg.price.annual / 12);
    });

    describe("éligibilité", () => {
        test("permis depuis exactement 2 ans : accepté", async () => {
            await assert.doesNotReject(call(createQuote, withDriver({ licence_since: "2025-01-15" })));
        });

        test("permis depuis 2 ans moins un jour : refusé en 422 driver_ineligible", async () => {
            await assert.rejects(call(createQuote, withDriver({ licence_since: "2025-01-16" })),
                { name: "Error", status: 422, code: "driver_ineligible" });
        });

        test("2 sinistres : accepté", async () => {
            await assert.doesNotReject(call(createQuote, withDriver({ claims_3y: 2 })));
        });

        test("3 sinistres ou plus : refusé en 422 driver_ineligible", async () => {
            for (const claims of [3, 5]) {
                await assert.rejects(call(createQuote, withDriver({ claims_3y: claims })), { status: 422, code: "driver_ineligible" });
            }
        });
    });
});

describe("POST /v1/contracts (stub)", () => {
    test("la requête d'exemple de la doc donne la réponse d'exemple de la doc", async () => {
        assert.deepEqual(await call(createContract, CONTRACT_REQUEST), CONTRACT_RESPONSE);
    });

    test("en mensuel, le montant à payer est la première mensualité (74,80 €)", async () => {
        const { payment } = await call(createContract, CONTRACT_REQUEST);
        assert.equal(payment.amount, 7480);
    });

    test("en annuel, le montant à payer est l'année (816,00 €)", async () => {
        const { payment, premium } = await call(createContract, { ...CONTRACT_REQUEST, frequency: "annual" });
        assert.equal(payment.amount, 81600);
        assert.equal(premium.frequency, "annual");
    });

    test("le montant suit la sélection réelle (essentielle seule = 420,00 €)", async () => {
        const { payment } = await call(createContract, { ...CONTRACT_REQUEST, package_id: "essential", options: [], frequency: "annual" });
        assert.equal(payment.amount, 42000);
    });

    test("entité à 5 chiffres, référence à 9 chiffres (format de la doc)", async () => {
        const { payment } = await call(createContract, CONTRACT_REQUEST);
        assert.match(payment.entity, /^\d{5}$/);
        assert.match(payment.reference, /^\d{9}$/);
    });

    test("un consentement manquant : refusé en 422 consent_required", async () => {
        for (const name of Object.keys(CONTRACT_REQUEST.consents)) {
            const consents = { ...CONTRACT_REQUEST.consents, [name]: false };
            await assert.rejects(call(createContract, { ...CONTRACT_REQUEST, consents }), { status: 422, code: "consent_required" });
        }
    });
});

describe("client", () => {
    test("ApiError garde le statut, le code et l'identifiant de requête pour la console", () => {
        const error = new ApiError(409, "quote_expired", "Quote expired", "req_41d9c0a7");
        assert.ok(error instanceof Error);
        assert.deepEqual([error.status, error.code, error.message, error.requestId], [409, "quote_expired", "Quote expired", "req_41d9c0a7"]);
    });

    test("l'adresse de l'API est écrite à un seul endroit (doc : « keep the base URL in one place »)", () => {
        const hits = appSources().filter((s) => s.code.includes("127.0.0.1:4000"));
        assert.deepEqual(hits.map((s) => s.path), ["js/api.js"]);
    });

    test("l'en-tête x-program est envoyé (doc : « Program header »)", () => {
        const api = appSources().find((s) => s.path === "js/api.js").code;
        assert.match(api, /"x-program":\s*"bmw-fr-ev"/);
    });
});
