import { loadLocale } from "./i18n.js";
import { loadLogo } from "./layout.js";
import { state, STEPS, subscribe } from "./state.js";
import { renderCover } from "./screens/cover.js";
import { renderVehicle } from "./screens/vehicle.js";
import { renderDriver } from "./screens/driver.js";
import { renderQuote } from "./screens/quote.js";
import { renderRecap } from "./screens/recap.js";
import { renderPayment } from "./screens/payment.js";

const screens = {
    cover: renderCover,
    vehicle: renderVehicle,
    driver: renderDriver,
    quote: renderQuote,
    recap: renderRecap,
    payment: renderPayment,
};

const app = document.getElementById("app");
let firstRender = true;

function render() {
    const screen = screens[STEPS[state.step]];
    app.replaceChildren(screen());
    // Au premier affichage le focus reste au début de la page ; ensuite il suit l'écran.
    if (!firstRender) app.querySelector("h1")?.focus();
    firstRender = false;
    window.scrollTo(0, 0);
}

async function start() {
    const lang =
        new URLSearchParams(location.search).get("lang") === "en" ? "en" : "fr";
    try {
        // En parallèle ; loadLogo() ne lève jamais d'erreur (repli sur le nom en texte).
        await Promise.all([loadLocale(lang), loadLogo()]);
    } catch (error) {
        console.error(error);
        app.textContent =
            "Le service est momentanément indisponible. Veuillez réessayer plus tard.";
        return;
    }
    subscribe(render);
    render();
}

start();
