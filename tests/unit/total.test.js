// Le total de l'écran Formules : formule + options choisies, en centimes, pour le rythme choisi.
import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import "../helpers.js";
import { state } from "../../js/state.js";
import { computeTotal } from "../../js/screens/quote.js";
import { QUOTE_RESPONSE } from "../fixtures/api-doc.js";

const select = (package_id, options = []) => { state.selection = { package_id, options, frequency: null }; };

beforeEach(() => {
    state.quote = structuredClone(QUOTE_RESPONSE);
    select(null);
});

describe("computeTotal", () => {
    test("rien de choisi : pas de total (Continuer reste désactivé)", () => {
        assert.equal(computeTotal("annual"), null);
    });

    test("une formule mais pas de rythme : pas de total", () => {
        select("comfort");
        assert.equal(computeTotal(null), null);
    });

    test("pas encore de devis : pas de total", () => {
        state.quote = null;
        select("comfort");
        assert.equal(computeTotal("annual"), null);
    });

    test("formule seule : son prix pour le rythme choisi", () => {
        select("essential");
        assert.equal(computeTotal("annual"), 42000);
        assert.equal(computeTotal("monthly"), 3850);
    });

    test("exemple chiffré de la doc : confort + WALLBOX, BATTERY, GLASS = 81600 / 7480", () => {
        select("comfort", ["WALLBOX", "BATTERY", "GLASS"]);
        assert.equal(computeTotal("annual"), 81600);
        assert.equal(computeTotal("monthly"), 7480);
    });

    test("l'ordre des options ne change rien (doc : « order does not matter »)", () => {
        select("comfort", ["GLASS", "WALLBOX", "BATTERY"]);
        assert.equal(computeTotal("annual"), 81600);
    });

    test("une option incluse n'est jamais comptée deux fois", () => {
        select("comfort", ["CABLE", "STRANDED"]);
        assert.equal(computeTotal("annual"), 61200);
    });

    test("intégrale + toutes les options : seule BATTERY s'ajoute", () => {
        select("integral", ["WALLBOX", "CABLE", "BATTERY", "STRANDED", "GLASS"]);
        assert.equal(computeTotal("annual"), 86400 + 9600);
        assert.equal(computeTotal("monthly"), 7920 + 880);
    });

    test("le mensuel vient de l'API, pas de l'annuel divisé par 12", () => {
        select("comfort");
        assert.equal(computeTotal("monthly"), 5610);
        assert.notEqual(computeTotal("monthly"), Math.round(61200 / 12));
    });

    test("12 mensualités coûtent plus que l'année : 897,60 € contre 816,00 € (doc)", () => {
        select("comfort", ["WALLBOX", "BATTERY", "GLASS"]);
        assert.equal(computeTotal("monthly") * 12, 89760);
        assert.equal(computeTotal("monthly") * 12 - computeTotal("annual"), 8160);
    });

    test("toujours un entier : aucune erreur d'arrondi possible", () => {
        for (const pkg of ["essential", "comfort", "integral"]) {
            select(pkg, ["WALLBOX", "CABLE", "BATTERY", "STRANDED", "GLASS"]);
            for (const f of ["annual", "monthly"]) assert.ok(Number.isInteger(computeTotal(f)));
        }
    });

    test("toutes les combinaisons d'options de toutes les formules (96 cas)", () => {
        const codes = ["WALLBOX", "CABLE", "BATTERY", "STRANDED", "GLASS"];
        for (const pkg of QUOTE_RESPONSE.packages) {
            for (let mask = 0; mask < 2 ** codes.length; mask++) {
                const chosen = codes.filter((_, i) => mask & (1 << i));
                select(pkg.id, chosen);
                for (const f of ["annual", "monthly"]) {
                    const expected = pkg.price[f] + pkg.options
                        .filter((o) => !o.included && chosen.includes(o.code))
                        .reduce((sum, o) => sum + o.price[f], 0);
                    assert.equal(computeTotal(f), expected, `${pkg.id} ${chosen.join("+")} ${f}`);
                }
            }
        }
    });
});
