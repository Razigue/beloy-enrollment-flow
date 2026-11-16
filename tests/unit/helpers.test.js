// Petites fonctions des écrans : dates des champs, téléphone, groupement de la référence.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import "../helpers.js";
import { isoDate, addYears } from "../../js/form.js";
import { toInternational, PHONE_PATTERN } from "../../js/screens/recap.js";
import { group } from "../../js/screens/payment.js";

describe("dates des champs", () => {
    test("isoDate : format AAAA-MM-JJ des <input type=date> et de l'API, avec zéros", () => {
        assert.equal(isoDate(new Date(2027, 5, 4)), "2027-06-04");
        assert.equal(isoDate(new Date(2027, 11, 31)), "2027-12-31");
    });

    test("isoDate : date locale, pas de décalage à minuit", () => {
        assert.equal(isoDate(new Date(2027, 0, 1, 0, 30)), "2027-01-01");
    });

    test("addYears : limite des 18 ans (date de naissance maximale)", () => {
        assert.equal(isoDate(addYears(new Date(2026, 10, 16), -18)), "2008-11-16");
    });

    test("addYears ne modifie pas la date d'origine", () => {
        const today = new Date(2026, 10, 16);
        addYears(today, -18);
        assert.equal(isoDate(today), "2026-11-16");
    });
});

describe("téléphone", () => {
    const valid = new RegExp(PHONE_PATTERN);

    test("formats français acceptés", () => {
        for (const phone of ["0612345678", "06 12 34 56 78", "06.12.34.56.78", "+33612345678", "+33 6 12 34 56 78"]) {
            assert.ok(valid.test(phone), phone);
        }
    });

    test("formats refusés", () => {
        for (const phone of ["", "061234567", "06123456789", "0012345678", "+44612345678", "06-12-34-56-78", "abcdefghij"]) {
            assert.ok(!valid.test(phone), phone);
        }
    });

    test("envoyé au format international de la doc (+33600000000)", () => {
        assert.equal(toInternational("06 00 00 00 00"), "+33600000000");
        assert.equal(toInternational("06.12.34.56.78"), "+33612345678");
        assert.equal(toInternational("+33612345678"), "+33612345678");
        assert.equal(toInternational("+33 6 12 34 56 78"), "+33612345678");
    });
});

describe("référence de paiement", () => {
    test("groupée par 3 chiffres pour être recopiée sans erreur", () => {
        assert.equal(group("907318442"), "907 318 442");
    });

    test("l'entité à 5 chiffres", () => {
        assert.equal(group("21456"), "214 56");
    });

    test("pas d'espace en fin de chaîne", () => {
        assert.equal(group("123456"), "123 456");
    });
});
