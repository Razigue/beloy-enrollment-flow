// Règle 3 : tous les montants passent par un seul formateur (Intl.NumberFormat).
import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { setLang, plain } from "../helpers.js";
import { formatPrice, formatDate, formatNumber } from "../../js/format.js";

describe("formatPrice", () => {
    beforeEach(() => setLang("fr"));

    test("divise les centimes par 100 au moment d'afficher (exemple de la doc : 42000 → 420,00 €)", () => {
        assert.equal(plain(formatPrice(42000)), "420,00 €");
    });

    test("français : espace des milliers, virgule, € après", () => {
        assert.equal(plain(formatPrice(5959000)), "59 590,00 €");
    });

    test("garde toujours deux décimales", () => {
        assert.equal(plain(formatPrice(3850)), "38,50 €");
        assert.equal(plain(formatPrice(7480)), "74,80 €");
        assert.equal(plain(formatPrice(5)), "0,05 €");
    });

    test("zéro s'affiche 0,00 €", () => {
        assert.equal(plain(formatPrice(0)), "0,00 €");
    });

    test("les totaux de la doc : 816,00 € / an, 74,80 € / mois, 897,60 € sur 12 mois", () => {
        assert.equal(plain(formatPrice(81600)), "816,00 €");
        assert.equal(plain(formatPrice(7480)), "74,80 €");
        assert.equal(plain(formatPrice(7480 * 12)), "897,60 €");
    });

    test("anglais : € avant, point décimal, virgule des milliers", () => {
        setLang("en");
        assert.equal(formatPrice(5959000), "€59,590.00");
        assert.equal(formatPrice(3850), "€38.50");
    });

    test("respecte la devise reçue de l'API", () => {
        setLang("en");
        assert.equal(formatPrice(1000, "USD"), "US$10.00");
    });

    test("langue inconnue : repli sur le français", () => {
        setLang("de");
        assert.equal(plain(formatPrice(42000)), "420,00 €");
    });

    test("utilise des espaces insécables : le montant ne se coupe jamais en fin de ligne", () => {
        assert.match(formatPrice(5959000), /59[  ]590,00[  ]€/);
    });
});

describe("formatDate", () => {
    beforeEach(() => setLang("fr"));

    test("français : « 4 juin 2027 »", () => {
        assert.equal(formatDate("2027-06-04"), "4 juin 2027");
    });

    test("français : le premier du mois s'écrit « 1er »", () => {
        assert.equal(formatDate("2027-06-01"), "1er juin 2027");
    });

    test("français : « 11 » et « 21 » ne deviennent pas « 11er » ou « 21er »", () => {
        assert.equal(formatDate("2027-06-11"), "11 juin 2027");
        assert.equal(formatDate("2027-06-21"), "21 juin 2027");
        assert.equal(formatDate("2027-06-10"), "10 juin 2027");
    });

    test("anglais : « 1 June 2027 », sans suffixe français", () => {
        setLang("en");
        assert.equal(formatDate("2027-06-01"), "1 June 2027");
        assert.equal(formatDate("2028-06-03"), "3 June 2028");
    });

    test("pas de décalage d'un jour lié au fuseau horaire (1er janvier, 31 décembre)", () => {
        assert.equal(formatDate("2027-01-01"), "1er janvier 2027");
        assert.equal(formatDate("2027-12-31"), "31 décembre 2027");
    });
});

describe("formatNumber", () => {
    test("kilométrage en français : 15 000", () => {
        setLang("fr");
        assert.equal(plain(formatNumber(15000)), "15 000");
    });

    test("kilométrage en anglais : 15,000", () => {
        setLang("en");
        assert.equal(formatNumber(15000), "15,000");
    });
});
