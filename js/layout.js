import { h } from "./dom.js";
import { t } from "./i18n.js";
import { state, back } from "./state.js";

// Étapes numérotées dans l'indicateur de progression (Landing et Paiement exclus).
const PROGRESS = ["vehicle", "driver", "quote", "recap"];

// Logo VYRA (ma création, pas le roundel BMW). Le fichier est lu une seule fois au démarrage,
// puis inséré dans la page (SVG inline) : le CSS peut alors colorer le nom avec --color-text.
let logoMarkup = "";

export async function loadLogo() {
    try {
        const response = await fetch("assets/logo.svg");
        if (response.ok) logoMarkup = await response.text();
    } catch (error) {
        console.error("[logo]", error);
    }
}

function logo() {
    // Fichier introuvable : le nom en texte, l'en-tête n'est jamais vide.
    if (!logoMarkup) return h("span", { class: "logo logo__text" }, t("flow.brand.name"));
    // Le SVG est muet (aria-hidden) ; c'est l'enveloppe qui porte le nom de la marque.
    const wrapper = h("span", { class: "logo", role: "img", "aria-label": t("flow.brand.name") });
    wrapper.innerHTML = logoMarkup;
    return wrapper;
}

// Flèche du lien Retour : décorative, le mot « Retour » porte le sens.
function chevronLeft() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("class", "topbar__back-icon");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML = '<path d="M15 5 8 12l7 7" fill="none" stroke="currentColor" stroke-width="1.5"/>';
    return svg;
}

function progress(stepName) {
    const index = PROGRESS.indexOf(stepName);
    // Hors des étapes numérotées : même bloc, invisible et ignoré des lecteurs d'écran,
    // pour que le titre ne change pas de place d'un écran à l'autre.
    const placeholder = index === -1;
    const label = t("flow.progress.label", { current: placeholder ? 1 : index + 1, total: PROGRESS.length });
    if (placeholder) {
        return h(
            "div",
            { class: "progress progress--placeholder", "aria-hidden": "true" },
            h("p", { class: "progress__label" }, label),
            h("div", { class: "progress__track" }, ...PROGRESS.map(() => h("span", { class: "progress__bar" }))),
        );
    }
    return h(
        "div",
        { class: "progress" },
        h("p", { class: "progress__label" }, label),
        h(
            "div",
            { class: "progress__track", role: "progressbar", "aria-label": label,
              "aria-valuemin": 1, "aria-valuemax": PROGRESS.length, "aria-valuenow": index + 1 },
            ...PROGRESS.map((_, i) => h("span", { class: i <= index ? "progress__bar is-done" : "progress__bar" })),
        ),
    );
}

// Cadre commun aux 6 écrans : en-tête, titre, contenu, barre d'action.
export function screen({ name, title, titleClass = "", intro, body, actions, showBack = true }) {
    const canGoBack = showBack && state.step > 0;
    return h(
        "div",
        { class: "screen" },
        h(
            "header",
            { class: "topbar" },
            h(
                "div",
                { class: "topbar__inner" },
                canGoBack
                    ? h("button", { type: "button", class: "btn-link topbar__back", onClick: back }, chevronLeft(), t("flow.nav.back"))
                    : h("span"),
                logo(),
            ),
        ),
        h(
            "div",
            { class: "screen__content" },
            progress(name),
            h("h1", { class: `screen__title ${titleClass}`, tabindex: "-1" }, title),
            intro ? h("p", { class: "screen__intro" }, intro) : null,
            body,
        ),
        actions ? h("div", { class: "actionbar" }, h("div", { class: "actionbar__inner" }, actions)) : null,
    );
}

// Panneau d'erreur : un titre, une phrase, une action. Jamais de code visible (règle 6).
export function errorPanel(error, { onAction }) {
    console.error("[api]", error.status, error.code, error.message, error.requestId);
    const known = ["driver_ineligible", "quote_expired", "quote_not_found", "consent_required", "invalid_request", "network_error"];
    const key = known.includes(error.code) ? error.code : "generic";
    return h(
        "div",
        { class: "notice notice--error", role: "alert" },
        h("h2", { class: "notice__title" }, t(`flow.error.${key}.title`)),
        h("p", { class: "notice__body" }, t(`flow.error.${key}.body`)),
        h("button", { type: "button", class: "btn btn--secondary", onClick: onAction }, t(`flow.error.${key}.action`)),
    );
}

// Bouton principal avec état de chargement qui ne change pas de taille.
export function primaryButton(label, { disabled = false, loading = false, onClick, type = "button", form } = {}) {
    return h(
        "button",
        { type, form, class: loading ? "btn btn--primary is-loading" : "btn btn--primary",
          disabled: disabled || loading, "aria-busy": loading ? "true" : null, onClick },
        h("span", { class: "btn__label" }, label),
        h("span", { class: "spinner", "aria-hidden": "true" }),
    );
}
