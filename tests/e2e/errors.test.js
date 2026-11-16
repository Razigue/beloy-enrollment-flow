// Règle 6 : aucun code d'erreur visible ; un titre, une phrase, une action. Et la validation des champs.
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import {
    startServer, startBrowser, openFlow, screenName, clickContinue, fill, text, COPY,
    passVehicle, passDriver, waitForQuote, choose,
} from "./setup.js";

let server, browser, baseUrl;
before(async () => {
    server = await startServer();
    baseUrl = `http://127.0.0.1:${server.address().port}`;
    browser = await startBrowser();
});
after(async () => { await browser.close(); server.close(); });

const fr = COPY.fr;
const errorTexts = (page) => page.$$eval(".field__error", (els) => els.map((e) => e.textContent).filter(Boolean));
const focused = (page) => page.evaluate(() => document.activeElement?.closest(".field")?.querySelector(".field__label")?.textContent);

describe("refus de l'assureur (422 driver_ineligible)", () => {
    async function refused(driver) {
        const page = await openFlow(browser, baseUrl);
        await clickContinue(page);
        await passVehicle(page);
        await passDriver(page, driver);
        await page.waitForSelector(".notice--error", { timeout: 5000 });
        return page;
    }

    test("permis de moins de 2 ans : un titre, une phrase, une action", async () => {
        const page = await refused({ licence: isoYearsAgo(1) });
        const notice = await page.$eval(".notice--error", (el) => ({
            title: el.querySelector(".notice__title").textContent,
            body: el.querySelector(".notice__body").textContent,
            action: el.querySelector("button").textContent,
            role: el.getAttribute("role"),
        }));
        assert.deepEqual(notice, {
            title: fr["flow.error.driver_ineligible.title"],
            body: fr["flow.error.driver_ineligible.body"],
            action: fr["flow.error.driver_ineligible.action"],
            role: "alert",
        });
    });

    test("3 sinistres : même refus", async () => {
        const page = await refused({ claims: "3" });
        assert.equal(await page.$eval(".notice__title", (el) => el.textContent), fr["flow.error.driver_ineligible.title"]);
    });

    test("aucun code, statut ou message technique à l'écran", async () => {
        const page = await refused({ claims: "3" });
        const content = await text(page);
        for (const technical of ["422", "driver_ineligible", "req_stub", "eligibility rules", "Error"]) {
            assert.ok(!content.includes(technical), technical);
        }
    });

    test("le code part dans la console, pour le support", async () => {
        const page = await refused({ claims: "3" });
        assert.ok(page.consoleMessages.some((m) => m.includes("[api]") && m.includes("422") && m.includes("driver_ineligible")));
    });

    test("« Vérifier mes réponses » ramène à l'écran Conducteur, réponses conservées", async () => {
        const page = await refused({ claims: "3" });
        await page.click(".notice--error button");
        assert.equal(await screenName(page), "driver");
        assert.equal(await page.$eval("#app select", (el) => el.value), "3");
    });

    test("après correction, le devis est obtenu", async () => {
        const page = await refused({ claims: "3" });
        await page.click(".notice--error button");
        await fill(page, "#app select", "1");
        await clickContinue(page);
        await waitForQuote(page);
        assert.equal(await page.$$eval(".package", (els) => els.length), 3);
    });
});

describe("validation des champs", () => {
    test("Conducteur vide : un message par champ, tirés du fichier de langue", async () => {
        const page = await openFlow(browser, baseUrl);
        await clickContinue(page);
        await passVehicle(page);
        await clickContinue(page);
        const messages = await errorTexts(page);
        assert.equal(messages.length, 7);
        for (const message of messages) assert.ok(Object.values(fr).includes(message), message);
        assert.equal(await screenName(page), "driver");
    });

    test("le focus va sur le premier champ en erreur", async () => {
        const page = await openFlow(browser, baseUrl);
        await clickContinue(page);
        await passVehicle(page);
        await clickContinue(page);
        assert.equal(await focused(page), fr["flow.driver.birth_date.label"]);
    });

    test("les champs en erreur sont annoncés (aria-invalid) et reliés à leur message (aria-describedby)", async () => {
        const page = await openFlow(browser, baseUrl);
        await clickContinue(page);
        await passVehicle(page);
        await clickContinue(page);
        const fields = await page.$$eval("#app input:not([type=radio]), #app select", (els) => els.map((el) => {
            const describedBy = el.getAttribute("aria-describedby")?.split(" ") ?? [];
            const message = describedBy.map((id) => document.getElementById(id)?.textContent).find(Boolean);
            return { invalid: el.getAttribute("aria-invalid"), message: Boolean(message) };
        }));
        for (const f of fields) assert.deepEqual(f, { invalid: "true", message: true });
    });

    test("un message disparaît dès que le champ est corrigé puis revalidé", async () => {
        const page = await openFlow(browser, baseUrl);
        await clickContinue(page);
        await passVehicle(page);
        await clickContinue(page);
        await fill(page, "input[autocomplete=postal-code]", "75011");
        await clickContinue(page);
        assert.equal(await errorTexts(page).then((m) => m.length), 6);
    });

    test("date de livraison passée : message dédié", async () => {
        const page = await openFlow(browser, baseUrl);
        await clickContinue(page);
        await passVehicle(page, { delivery: "2020-01-01" });
        assert.deepEqual(await errorTexts(page), [fr["flow.error.field.delivery_past"]]);
        assert.equal(await screenName(page), "vehicle");
    });

    test("code postal de 4 chiffres : message dédié", async () => {
        const page = await openFlow(browser, baseUrl);
        await clickContinue(page);
        await passVehicle(page);
        await passDriver(page, { postcode: "7501" });
        assert.deepEqual(await errorTexts(page), [fr["flow.error.field.postcode"]]);
    });

    test("récap : e-mail et téléphone invalides, consentements manquants", async () => {
        const page = await openFlow(browser, baseUrl);
        await clickContinue(page);
        await passVehicle(page);
        await passDriver(page);
        await waitForQuote(page);
        await choose(page, { pkg: "essential", frequency: "annual" });
        await clickContinue(page);
        await fill(page, "input[autocomplete=given-name]", "Camille");
        await fill(page, "input[autocomplete=family-name]", "Fontaine");
        await fill(page, "input[type=email]", "camille@");
        await fill(page, "input[type=tel]", "12345");
        await clickContinue(page);
        const messages = await errorTexts(page);
        for (const key of ["flow.error.field.email", "flow.error.field.phone", "flow.error.field.consents"]) {
            assert.ok(messages.includes(fr[key]), key);
        }
        assert.equal(await screenName(page), "recap");
    });

    test("récap : champs valides mais un consentement manquant, le contrat n'est pas demandé", async () => {
        const page = await openFlow(browser, baseUrl);
        await clickContinue(page);
        await passVehicle(page);
        await passDriver(page);
        await waitForQuote(page);
        await choose(page, { pkg: "essential", frequency: "annual" });
        await clickContinue(page);
        await fill(page, "input[autocomplete=given-name]", "Camille");
        await fill(page, "input[autocomplete=family-name]", "Fontaine");
        await fill(page, "input[type=email]", "camille@example.fr");
        await fill(page, "input[type=tel]", "06 00 00 00 00");
        const boxes = await page.$$("input[name=consent]");
        await boxes[0].click(); await boxes[1].click();
        await clickContinue(page);
        assert.deepEqual(await errorTexts(page), [fr["flow.error.field.consents"]]);
        assert.equal(await page.$eval(".actionbar .btn", (b) => b.disabled), false);
        assert.equal(await screenName(page), "recap");
    });
});

describe("robustesse", () => {
    test("aucune erreur JavaScript pendant tout le parcours, en français et en anglais", async () => {
        for (const lang of ["fr", "en"]) {
            const page = await openFlow(browser, baseUrl, { lang });
            await clickContinue(page);
            await passVehicle(page);
            await passDriver(page);
            await waitForQuote(page);
            await choose(page, { pkg: "integral", frequency: "monthly" });
            await clickContinue(page);
            assert.deepEqual(page.pageErrors, [], lang);
            assert.ok(!page.consoleMessages.some((m) => m.includes("clé manquante")), `${lang} : clé manquante`);
        }
    });

    test("le client quitte l'écran Formules pendant l'appel : la réponse tardive est ignorée", async () => {
        const page = await openFlow(browser, baseUrl);
        await clickContinue(page);
        await passVehicle(page);
        await passDriver(page);
        await page.click(".topbar__back"); // pendant le squelette
        await new Promise((r) => setTimeout(r, 1200)); // la réponse arrive
        assert.equal(await screenName(page), "driver");
    });

    test("rien n'est cliquable deux fois : le bouton du récap est désactivé pendant l'émission", async () => {
        const page = await openFlow(browser, baseUrl);
        await clickContinue(page);
        await passVehicle(page);
        await passDriver(page);
        await waitForQuote(page);
        await choose(page, { pkg: "essential", frequency: "annual" });
        await clickContinue(page);
        await fill(page, "input[autocomplete=given-name]", "Camille");
        await fill(page, "input[autocomplete=family-name]", "Fontaine");
        await fill(page, "input[type=email]", "camille@example.fr");
        await fill(page, "input[type=tel]", "06 00 00 00 00");
        for (const box of await page.$$("input[name=consent]")) await box.click();
        const width = await page.$eval(".actionbar .btn", (b) => b.getBoundingClientRect().width);
        await clickContinue(page);
        const during = await page.$eval(".actionbar .btn", (b) => ({ disabled: b.disabled, busy: b.getAttribute("aria-busy"), width: b.getBoundingClientRect().width }));
        assert.deepEqual(during, { disabled: true, busy: "true", width });
    });
});

function isoYearsAgo(years) {
    const d = new Date();
    d.setFullYear(d.getFullYear() - years);
    return d.toISOString().slice(0, 10);
}

