// Outils des tests de bout en bout : un petit serveur statique et un vrai navigateur (Edge ou Chrome).
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, extname } from "node:path";
import puppeteer from "puppeteer-core";
import { ROOT, readJson } from "../helpers.js";

export const COPY = { fr: readJson("i18n/fr.json"), en: readJson("i18n/en.json") };
const SCREENS = ["cover", "vehicle", "driver", "quote", "recap", "payment"];

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml" };

// Le même rôle que « npx serve . » : servir les fichiers du projet tels quels.
export function startServer() {
    const server = createServer(async (req, res) => {
        const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
        try {
            const body = await readFile(join(ROOT, path === "/" ? "index.html" : path));
            res.writeHead(200, { "Content-Type": TYPES[extname(path) || ".html"] ?? "application/octet-stream" });
            res.end(body);
        } catch {
            res.writeHead(404).end();
        }
    });
    return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

// Navigateur déjà installé sur la machine (aucun téléchargement) ; CHROME_PATH pour en imposer un.
const CANDIDATES = [
    process.env.CHROME_PATH,
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/microsoft-edge",
];

export async function startBrowser() {
    const executablePath = CANDIDATES.find((p) => p && existsSync(p));
    if (!executablePath) throw new Error("Aucun Chrome / Edge trouvé : définir CHROME_PATH.");
    return puppeteer.launch({ executablePath, headless: true });
}

export const PHONE = { width: 375, height: 812, deviceScaleFactor: 1, isMobile: true, hasTouch: true };
export const DESKTOP = { width: 1280, height: 900, deviceScaleFactor: 1 };

// Ouvre le flow et relève tous les messages de la console (les codes d'erreur doivent y être).
export async function openFlow(browser, baseUrl, { viewport = PHONE, dark = false, lang = "fr" } = {}) {
    const page = await browser.newPage();
    page.consoleMessages = [];
    page.on("console", (msg) => page.consoleMessages.push(msg.text()));
    page.pageErrors = [];
    page.on("pageerror", (error) => page.pageErrors.push(error.message));
    await page.setViewport(viewport);
    await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: dark ? "dark" : "light" }]);
    await page.goto(`${baseUrl}/${lang === "en" ? "?lang=en" : ""}`, { waitUntil: "networkidle0" });
    await page.evaluate(() => document.fonts.ready);
    return page;
}

// ---------- Actions du parcours ----------

// Nom de l'écran affiché, retrouvé par son titre <h1> dans le fichier de langue.
export async function screenName(page) {
    const h1 = await page.$eval("h1", (el) => el.textContent);
    const lang = await page.$eval("html", (el) => el.lang);
    return SCREENS.find((name) => COPY[lang][`flow.${name}.title`] === h1);
}
export const waitForScreen = (page, name, lang = "fr") =>
    page.waitForFunction((t) => document.querySelector("h1")?.textContent === t, { timeout: 5000 }, COPY[lang][`flow.${name}.title`]);
export const title = (page) => page.$eval("h1", (el) => el.textContent);
export const text = (page) => page.$eval("#app", (el) => el.innerText);

// Clic d'utilisateur : l'élément est d'abord amené au centre de l'écran, sinon il peut être
// caché sous la barre d'action collée en bas et le clic tomberait sur elle.
export async function tap(page, selector) {
    await page.$eval(selector, (el) => el.scrollIntoView({ block: "center" }));
    await page.click(selector);
}

export async function clickContinue(page) {
    await page.click(".actionbar .btn");
    await new Promise((r) => setTimeout(r, 50));
}

// Remplit un champ comme un utilisateur (événements input + change).
export async function fill(page, selector, value) {
    await page.$eval(selector, (el, v) => {
        el.value = v;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
    }, value);
}

export async function passVehicle(page, { delivery = "2027-06-04" } = {}) {
    await fill(page, "input[type=date]", delivery);
    await clickContinue(page);
}

export async function passDriver(page, { licence = "2010-05-02", claims = "0", postcode = "75011" } = {}) {
    const dates = await page.$$("#app input[type=date]");
    await dates[0].evaluate((el) => { el.value = "1990-03-12"; el.dispatchEvent(new Event("change", { bubbles: true })); });
    await dates[1].evaluate((el, v) => { el.value = v; el.dispatchEvent(new Event("change", { bubbles: true })); }, licence);
    await fill(page, "#app select", claims);
    await fill(page, "#app input[type=number]", "15000");
    await fill(page, "#app input[autocomplete=postal-code]", postcode);
    await tap(page, "input[name=parking][value=street] + span");
    await tap(page, "input[name=charging][value=home] + span");
    await clickContinue(page);
}

// Attend la fin de l'appel /quotes (le squelette disparaît).
export const waitForQuote = (page) => page.waitForSelector('#app .form[aria-busy="false"]', { timeout: 5000 });

export async function choose(page, { pkg = "comfort", frequency = "annual", options = [] } = {}) {
    await tap(page, `input[name=frequency][value=${frequency}] + span`);
    await tap(page, `input[name=package][value=${pkg}] + .package__card`);
    for (const code of options) await toggleOption(page, code);
}

// Coche ou décoche une option par son code (WALLBOX…), retrouvée par son nom affiché.
export async function toggleOption(page, code, lang = "fr") {
    await page.evaluate((name) => {
        const item = [...document.querySelectorAll(".option")].find((li) => li.querySelector(".check span span").textContent === name);
        item.querySelector("input").click();
    }, COPY[lang][`flow.quote.option.${code}.name`]);
}

export const total = (page) => page.$eval(".total__amount", (el) => el.textContent.replace(/[\u00a0\u202f]/g, " "));
export const totalHint = (page) => page.$eval(".total .field__hint", (el) => el.textContent.replace(/[\u00a0\u202f]/g, " "));

export async function passRecap(page) {
    await fill(page, "input[autocomplete=given-name]", "Camille");
    await fill(page, "input[autocomplete=family-name]", "Fontaine");
    await fill(page, "input[type=email]", "camille.fontaine@example.fr");
    await fill(page, "input[type=tel]", "06 00 00 00 00");
    for (const box of await page.$$("input[name=consent]")) await box.click();
    await clickContinue(page);
    await waitForScreen(page, "payment");
}
