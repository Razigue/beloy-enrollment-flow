// Le parcours complet dans un vrai navigateur : écrans, choix, total, paiement.
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import {
    startServer, startBrowser, openFlow, screenName, waitForScreen, clickContinue, fill, text,
    passVehicle, passDriver, tap, waitForQuote, choose, toggleOption, total, totalHint, passRecap, DESKTOP,
} from "./setup.js";

let server, browser, baseUrl;
before(async () => {
    server = await startServer();
    baseUrl = `http://127.0.0.1:${server.address().port}`;
    browser = await startBrowser();
});
after(async () => { await browser.close(); server.close(); });

async function toQuote(options) {
    const page = await openFlow(browser, baseUrl, options);
    await clickContinue(page);
    await passVehicle(page);
    await passDriver(page);
    await waitForQuote(page);
    return page;
}

describe("parcours complet", () => {
    test("les 6 écrans s'enchaînent, de la landing à la référence de paiement", async () => {
        const page = await openFlow(browser, baseUrl);
        const seen = [await screenName(page)];
        await clickContinue(page); seen.push(await screenName(page));
        await passVehicle(page); seen.push(await screenName(page));
        await passDriver(page); seen.push(await screenName(page));
        await waitForQuote(page);
        await choose(page, { pkg: "comfort", frequency: "monthly", options: ["WALLBOX", "BATTERY", "GLASS"] });
        await clickContinue(page); seen.push(await screenName(page));
        await passRecap(page); seen.push(await screenName(page));
        assert.deepEqual(seen, ["cover", "vehicle", "driver", "quote", "recap", "payment"]);
        assert.deepEqual(page.pageErrors, []);
    });

    test("le prix « à partir de » de la landing passe par le formateur", async () => {
        const page = await openFlow(browser, baseUrl);
        assert.match(await text(page), /38,50\s€/);
    });

    test("la landing ne montre pas de bouton Retour", async () => {
        const page = await openFlow(browser, baseUrl);
        assert.equal(await page.$(".topbar__back"), null);
    });

    test("le véhicule est pré-rempli depuis la commande (i4, 59 590,00 €)", async () => {
        const page = await openFlow(browser, baseUrl);
        await clickContinue(page);
        assert.equal(await page.$eval("#app select", (el) => el.value), "i4");
        assert.match(await text(page), /59\s590,00\s€/);
    });

    test("changer de modèle met à jour le prix affiché", async () => {
        const page = await openFlow(browser, baseUrl);
        await clickContinue(page);
        await fill(page, "#app select", "i7");
        const price = await page.$eval(".order-total__amount", (el) => el.textContent.replace(/[  ]/g, " "));
        assert.equal(price, "119 900,00 €");
    });

    test("changer de modèle après un devis efface le devis et la sélection", async () => {
        const page = await toQuote();
        await choose(page, { pkg: "comfort", frequency: "annual" });
        await page.click(".topbar__back");
        await page.click(".topbar__back");
        await fill(page, "#app select", "iX1");
        await clickContinue(page);
        await clickContinue(page);
        await waitForQuote(page);
        assert.equal(await total(page), "—");
    });
});

describe("écran Formules", () => {
    test("rien n'est sélectionné à l'ouverture, Continuer est désactivé", async () => {
        const page = await toQuote();
        assert.equal(await page.$$eval("input[name=package]:checked, input[name=frequency]:checked", (els) => els.length), 0);
        assert.equal(await total(page), "—");
        assert.equal(await page.$eval(".actionbar .btn", (b) => b.disabled), true);
    });

    test("pendant l'appel, un squelette est affiché et la zone est marquée occupée", async () => {
        const page = await openFlow(browser, baseUrl);
        await clickContinue(page);
        await passVehicle(page);
        await passDriver(page);
        assert.equal(await page.$eval("#app .form", (el) => el.getAttribute("aria-busy")), "true");
        assert.ok(await page.$(".skeleton"));
        await waitForQuote(page);
        assert.equal(await page.$(".skeleton"), null);
    });

    test("une formule sans rythme : toujours pas de total", async () => {
        const page = await toQuote();
        await tap(page, "input[name=package][value=comfort] + .package__card");
        assert.equal(await total(page), "—");
        assert.equal(await page.$eval(".actionbar .btn", (b) => b.disabled), true);
    });

    test("exemple de la doc en annuel : confort + Wallbox, Batterie, Bris de glace = 816,00 €", async () => {
        const page = await toQuote();
        await choose(page, { pkg: "comfort", frequency: "annual", options: ["WALLBOX", "BATTERY", "GLASS"] });
        assert.equal(await total(page), "816,00 €");
        assert.equal(await page.$eval(".actionbar .btn", (b) => b.disabled), false);
    });

    test("le même choix en mensuel : 74,80 €, soit 897,60 € sur l'année", async () => {
        const page = await toQuote();
        await choose(page, { pkg: "comfort", frequency: "monthly", options: ["WALLBOX", "BATTERY", "GLASS"] });
        assert.equal(await total(page), "74,80 €");
        assert.match(await totalHint(page), /897,60 €/);
    });

    test("la bascule annuel / mensuel affiche les vrais chiffres de l'API sur chaque carte", async () => {
        const page = await toQuote();
        await tap(page, "input[name=frequency][value=annual] + span");
        const annual = await page.$$eval(".package__price", (els) => els.map((e) => e.textContent.replace(/[  ]/g, " ")));
        await tap(page, "input[name=frequency][value=monthly] + span");
        const monthly = await page.$$eval(".package__price", (els) => els.map((e) => e.textContent.replace(/[  ]/g, " ")));
        assert.deepEqual(annual, ["420,00 € / an", "612,00 € / an", "864,00 € / an"]);
        assert.deepEqual(monthly, ["38,50 € / mois", "56,10 € / mois", "79,20 € / mois"]);
    });

    test("décocher une option la retire du total", async () => {
        const page = await toQuote();
        await choose(page, { pkg: "comfort", frequency: "annual", options: ["WALLBOX", "BATTERY"] });
        assert.equal(await total(page), "756,00 €");
        await toggleOption(page, "BATTERY");
        assert.equal(await total(page), "660,00 €");
    });

    test("une option incluse est cochée, grisée, marquée « Inclus » et non comptée", async () => {
        const page = await toQuote();
        await choose(page, { pkg: "comfort", frequency: "annual" });
        const included = await page.$$eval(".option.is-included", (els) =>
            els.map((li) => ({ checked: li.querySelector("input").checked, disabled: li.querySelector("input").disabled, price: li.querySelector(".option__price").textContent })));
        assert.equal(included.length, 2);
        for (const opt of included) assert.deepEqual(opt, { checked: true, disabled: true, price: "Inclus" });
        assert.equal(await total(page), "612,00 €");
    });

    test("changer de formule retire les options devenues incluses (doc : ne pas les envoyer)", async () => {
        const page = await toQuote();
        await choose(page, { pkg: "comfort", frequency: "annual", options: ["WALLBOX", "BATTERY"] });
        await tap(page, "input[name=package][value=integral] + .package__card");
        assert.equal(await total(page), "960,00 €"); // 864 + Batterie 96 : la Wallbox est incluse, plus comptée
    });

    test("changer une réponse du conducteur efface le devis et la sélection", async () => {
        const page = await toQuote();
        await choose(page, { pkg: "comfort", frequency: "annual" });
        await page.click(".topbar__back");
        await fill(page, "input[autocomplete=postal-code]", "69001");
        await clickContinue(page);
        await waitForQuote(page);
        assert.equal(await total(page), "—");
        assert.equal(await page.$$eval("input[name=package]:checked", (els) => els.length), 0);
    });

    test("revenir en arrière sans rien changer garde la sélection", async () => {
        const page = await toQuote();
        await choose(page, { pkg: "comfort", frequency: "annual", options: ["GLASS"] });
        await page.click(".topbar__back");
        await clickContinue(page);
        assert.equal(await total(page), "672,00 €");
    });
});

describe("récapitulatif", () => {
    async function toRecap() {
        const page = await toQuote();
        await choose(page, { pkg: "comfort", frequency: "monthly", options: ["WALLBOX", "BATTERY", "GLASS"] });
        await clickContinue(page);
        return page;
    }

    test("relit les réponses : modèle, date en toutes lettres, formule, options, total", async () => {
        const page = await toRecap();
        const content = (await text(page)).replace(/[  ]/g, " ");
        for (const expected of ["BMW i4", "4 juin 2027", "Confort", "Wallbox", "Bris de glace", "74,80 € / mois"]) {
            assert.ok(content.includes(expected), expected);
        }
    });

    test("trois documents précontractuels et trois consentements, décochés", async () => {
        const page = await toRecap();
        assert.equal(await page.$$eval(".doc-list a", (els) => els.length), 3);
        assert.deepEqual(await page.$$eval("input[name=consent]", (els) => els.map((e) => e.checked)), [false, false, false]);
    });

    test("« Modifier » ramène à l'écran concerné, la sélection est conservée", async () => {
        const page = await toRecap();
        const links = await page.$$(".summary__head button, .summary__head a");
        await links[2].click();
        await waitForScreen(page, "quote");
        assert.equal(await total(page), "74,80 €");
    });
});

describe("référence de paiement", () => {
    async function toPayment(frequency = "monthly") {
        const page = await toQuote({ viewport: DESKTOP });
        await choose(page, { pkg: "comfort", frequency, options: ["WALLBOX", "BATTERY", "GLASS"] });
        await clickContinue(page);
        await passRecap(page);
        return page;
    }

    test("entité, référence groupée par 3 et montant de la première mensualité", async () => {
        const page = await toPayment();
        const values = await page.$$eval(".reference__value", (els) => els.map((e) => e.textContent.replace(/[  ]/g, " ")));
        assert.deepEqual(values, ["21456", "907 318 442", "74,80 €"]);
        const labels = await page.$$eval(".reference__item .label", (els) => els.map((e) => e.textContent));
        assert.equal(labels[2], "Première mensualité");
    });

    test("en annuel, le montant est celui de l'année", async () => {
        const page = await toPayment("annual");
        const values = await page.$$eval(".reference__value", (els) => els.map((e) => e.textContent.replace(/[  ]/g, " ")));
        assert.equal(values[2], "816,00 €");
        const labels = await page.$$eval(".reference__item .label", (els) => els.map((e) => e.textContent));
        assert.equal(labels[2], "Montant de l'année");
    });

    test("échéance, numéro de contrat et marche à suivre sont affichés", async () => {
        const page = await toPayment();
        const content = await text(page);
        assert.match(content, /1er juin 2027/);
        assert.match(content, /ARD-FR-2026-0481233/);
        assert.equal(await page.$$eval(".steps li", (els) => els.length), 3);
    });

    test("plus de bouton Retour : le contrat est émis", async () => {
        const page = await toPayment();
        assert.equal(await page.$(".topbar__back"), null);
    });

    test("« Copier » met la référence brute (sans espaces) dans le presse-papiers et affiche « Copié »", async () => {
        const page = await toPayment();
        await browser.defaultBrowserContext().overridePermissions(baseUrl, ["clipboard-read", "clipboard-write", "clipboard-sanitized-write"]);
        await page.bringToFront();
        const buttons = await page.$$(".reference__item .copy");
        await buttons[1].click();
        await page.waitForSelector(".reference__item .copy.is-done");
        assert.equal(await page.evaluate(() => navigator.clipboard.readText()), "907318442");
    });

    test("« Copier les trois informations » copie entité, référence, montant et échéance ensemble", async () => {
        const page = await toPayment();
        await browser.defaultBrowserContext().overridePermissions(baseUrl, ["clipboard-read", "clipboard-write", "clipboard-sanitized-write"]);
        await page.bringToFront();
        await page.click(".reference__actions .btn--primary");
        const copied = (await page.evaluate(() => navigator.clipboard.readText())).replace(/[  ]/g, " ");
        for (const part of ["21456", "907 318 442", "Première mensualité : 74,80 €", "1er juin 2027"]) assert.ok(copied.includes(part), part);
    });

    test("le bouton change de libellé sans changer de largeur (règle 7)", async () => {
        const page = await toPayment();
        await browser.defaultBrowserContext().overridePermissions(baseUrl, ["clipboard-read", "clipboard-write", "clipboard-sanitized-write"]);
        await page.bringToFront();
        const button = (await page.$$(".reference__item .copy"))[0];
        const before = await button.evaluate((b) => b.getBoundingClientRect().width);
        await button.click();
        await page.waitForSelector(".reference__item .copy.is-done");
        assert.equal(await button.evaluate((b) => b.getBoundingClientRect().width), before);
    });
});

describe("anglais", () => {
    test("?lang=en : tout le parcours en anglais, montants au format anglais", async () => {
        const page = await openFlow(browser, baseUrl, { lang: "en" });
        assert.equal(await page.$eval("html", (el) => el.lang), "en");
        assert.equal(await screenName(page), "cover");
        assert.match(await text(page), /€38\.50/);
    });
});
