// L'état du wizard et la navigation entre les étapes.
import { test, describe, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import { state, STEPS, goTo, next, back, subscribe, resetQuote } from "../../js/state.js";
import { QUOTE_REQUEST, CONTRACT_REQUEST, QUOTE_RESPONSE } from "../fixtures/api-doc.js";

const initial = structuredClone(state);
beforeEach(() => {
    Object.assign(state, structuredClone(initial));
    subscribe(() => {});
});

describe("étapes", () => {
    test("6 écrans dans l'ordre du brief", () => {
        assert.deepEqual(STEPS, ["cover", "vehicle", "driver", "quote", "recap", "payment"]);
    });

    test("le parcours commence sur la landing", () => {
        assert.equal(state.step, 0);
    });

    test("next() et back() avancent et reculent d'une étape", () => {
        next(); next();
        assert.equal(STEPS[state.step], "driver");
        back();
        assert.equal(STEPS[state.step], "vehicle");
    });

    test("goTo() ne sort jamais des bornes", () => {
        goTo(-3);
        assert.equal(state.step, 0);
        goTo(99);
        assert.equal(state.step, STEPS.length - 1);
        back(); back(); back(); back(); back(); back(); back();
        assert.equal(state.step, 0);
    });

    test("chaque changement d'étape redessine l'écran (une fois)", () => {
        const render = mock.fn();
        subscribe(render);
        next();
        goTo(STEPS.indexOf("recap"));
        assert.equal(render.mock.callCount(), 2);
    });
});

describe("contenu de l'état", () => {
    test("rien n'est sélectionné à l'ouverture des formules (brief)", () => {
        assert.deepEqual(state.selection, { package_id: null, options: [], frequency: null });
    });

    test("tous les consentements sont décochés au départ", () => {
        assert.ok(Object.values(state.consents).every((v) => v === false));
    });

    test("le véhicule est pré-rempli avec l'exemple de la doc (i4, 59 590,00 €)", () => {
        assert.equal(state.vehicle.model_code, QUOTE_REQUEST.vehicle.model_code);
        assert.equal(state.vehicle.list_price, QUOTE_REQUEST.vehicle.list_price);
    });

    test("les champs portent les noms de l'API : la requête se construit sans conversion", () => {
        assert.deepEqual(Object.keys(state.vehicle).sort(), Object.keys(QUOTE_REQUEST.vehicle).sort());
        assert.deepEqual(Object.keys(state.driver).sort(), Object.keys(QUOTE_REQUEST.driver).sort());
        assert.deepEqual(Object.keys(state.holder).sort(), Object.keys(CONTRACT_REQUEST.holder).sort());
        assert.deepEqual(Object.keys(state.consents).sort(), Object.keys(CONTRACT_REQUEST.consents).sort());
        for (const key of ["package_id", "options", "frequency"]) assert.ok(key in state.selection, key);
    });
});

describe("resetQuote", () => {
    test("une réponse change : le devis et le choix fait dessus sont effacés", () => {
        state.quote = structuredClone(QUOTE_RESPONSE);
        state.selection = { package_id: "comfort", options: ["WALLBOX"], frequency: "monthly" };
        resetQuote();
        assert.equal(state.quote, null);
        assert.deepEqual(state.selection, { package_id: null, options: [], frequency: null });
    });

    test("les réponses du client sont conservées", () => {
        state.driver.postcode = "75011";
        state.vehicle.delivery_date = "2027-06-04";
        resetQuote();
        assert.equal(state.driver.postcode, "75011");
        assert.equal(state.vehicle.delivery_date, "2027-06-04");
    });
});
