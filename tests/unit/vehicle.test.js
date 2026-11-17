// Prix de catalogue par modèle (écran Véhicule).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import "../helpers.js";
import { MODEL_PRICES } from "../../js/screens/vehicle.js";
import { QUOTE_REQUEST } from "../fixtures/api-doc.js";

describe("prix par modèle", () => {
    test("exactement les 6 modèles acceptés par l'API (doc : i4, i5, i7, iX1, iX2, iX3)", () => {
        assert.deepEqual(Object.keys(MODEL_PRICES), ["i4", "i5", "i7", "iX1", "iX2", "iX3"]);
    });

    test("l'i4 garde le prix de l'exemple de la doc (59 590,00 €)", () => {
        assert.equal(MODEL_PRICES.i4, QUOTE_REQUEST.vehicle.list_price);
    });

    test("des entiers en centimes, comme list_price dans l'API", () => {
        for (const [model, price] of Object.entries(MODEL_PRICES)) assert.ok(Number.isInteger(price) && price > 0, model);
    });

    test("des prix plausibles pour des BMW électriques (entre 40 000 et 150 000 €)", () => {
        for (const [model, price] of Object.entries(MODEL_PRICES)) assert.ok(price >= 4000000 && price <= 15000000, model);
    });

    test("la gamme est cohérente : i4 < i5 < i7, iX1 < iX2 < iX3", () => {
        const p = MODEL_PRICES;
        assert.ok(p.i4 < p.i5 && p.i5 < p.i7);
        assert.ok(p.iX1 < p.iX2 && p.iX2 < p.iX3);
    });
});
