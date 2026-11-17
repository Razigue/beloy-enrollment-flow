import { h } from "../dom.js";
import { t } from "../i18n.js";
import { formatPrice } from "../format.js";
import { state, next, goTo, STEPS } from "../state.js";
import { screen, primaryButton, errorPanel } from "../layout.js";
import { choices } from "../form.js";
import { createQuote } from "../api.js";

const selectedPackage = () => state.quote?.packages.find((p) => p.id === state.selection.package_id) ?? null;

// Total en centimes : formule + options choisies (non incluses), pour la fréquence donnée.
// Additionné en entiers, formaté une seule fois à l'affichage.
export function computeTotal(frequency) {
    const pkg = selectedPackage();
    if (!pkg || !frequency) return null;
    return pkg.options
        .filter((opt) => !opt.included && state.selection.options.includes(opt.code))
        .reduce((sum, opt) => sum + opt.price[frequency], pkg.price[frequency]);
}

// « 420,00 € / an » si une fréquence est choisie, sinon les deux chiffres de l'API.
function priceText(price) {
    const f = state.selection.frequency;
    if (f) return t(`flow.quote.per.${f}`, { price: formatPrice(price[f], state.quote.currency) });
    return t("flow.quote.per.both", {
        annual: formatPrice(price.annual, state.quote.currency),
        monthly: formatPrice(price.monthly, state.quote.currency),
    });
}

export function renderQuote() {
    document.title = t("flow.quote.page_title");

    const content = h("div", { class: "form", "aria-busy": "true" }, ...skeleton());
    const totalAmount = h("p", { class: "total__amount" }, "—");
    const totalHint = h("p", { class: "field__hint" }, t("flow.quote.total.empty"));
    const continueButton = primaryButton(t("flow.nav.continue"), { disabled: true, onClick: next });

    const view = screen({
        name: "quote",
        title: t("flow.quote.title"),
        body: content,
        actions: [
            h(
                "div",
                { class: "total", "aria-live": "polite" },
                h("p", { class: "label" }, t("flow.quote.total.label")),
                totalAmount,
                totalHint,
            ),
            continueButton,
        ],
    });

    // Met à jour tous les prix affichés sans reconstruire les champs (le focus clavier reste en place).
    function refreshPrices() {
        for (const el of content.querySelectorAll("[data-price]")) {
            el.textContent = priceText(JSON.parse(el.dataset.price));
        }
        const f = state.selection.frequency;
        const total = computeTotal(f);
        totalAmount.textContent = total === null ? "—" : formatPrice(total, state.quote.currency);
        // En mensuel, on montre ce que coûtent les 12 mensualités (calcul fait par la doc API :
        // 12 × 74,80 € = 897,60 €). Ce n'est pas le prix annuel de l'API, qui est moins cher.
        totalHint.textContent = total === null
            ? t("flow.quote.total.empty")
            : t(`flow.quote.total.${f}`, { year: formatPrice(total * 12, state.quote.currency) });
        continueButton.disabled = total === null;
    }

    function optionsList() {
        const pkg = selectedPackage();
        if (!pkg) return h("p", { class: "text-muted" }, t("flow.quote.options.empty"));
        return h(
            "ul",
            { class: "options" },
            pkg.options.map((opt) => {
                const checked = opt.included || state.selection.options.includes(opt.code);
                return h(
                    "li",
                    { class: opt.included ? "option is-included" : "option" },
                    h(
                        "label",
                        { class: "check" },
                        h("input", {
                            type: "checkbox", checked, disabled: opt.included,
                            onChange: (e) => {
                                const set = new Set(state.selection.options);
                                e.target.checked ? set.add(opt.code) : set.delete(opt.code);
                                state.selection.options = [...set];
                                refreshPrices();
                            },
                        }),
                        h(
                            "span",
                            {},
                            h("span", {}, t(`flow.quote.option.${opt.code}.name`)),
                            h("br"),
                            h("span", { class: "field__hint" }, t(`flow.quote.option.${opt.code}.desc`)),
                        ),
                    ),
                    opt.included
                        ? h("span", { class: "option__price" }, t("flow.quote.option.included"))
                        : h("span", { class: "option__price", "data-price": JSON.stringify(opt.price) }, priceText(opt.price)),
                );
            }),
        );
    }

    function paintQuote() {
        const optionsSlot = h("div", {}, optionsList());

        const packages = h(
            "div",
            { class: "packages", role: "radiogroup", "aria-label": t("flow.quote.packages.label") },
            state.quote.packages.map((pkg) =>
                h(
                    "label",
                    { class: "package" },
                    h("input", {
                        type: "radio", name: "package", value: pkg.id,
                        checked: pkg.id === state.selection.package_id,
                        onChange: () => {
                            state.selection.package_id = pkg.id;
                            // Les options déjà incluses dans la nouvelle formule ne s'envoient pas (doc API).
                            const included = pkg.options.filter((o) => o.included).map((o) => o.code);
                            state.selection.options = state.selection.options.filter((c) => !included.includes(c));
                            optionsSlot.replaceChildren(optionsList());
                            refreshPrices();
                        },
                    }),
                    h(
                        "span",
                        { class: "package__card" },
                        h("span", { class: "package__name" }, t(`flow.quote.package.${pkg.id}.name`)),
                        h("span", { class: "field__hint package__desc" }, t(`flow.quote.package.${pkg.id}.desc`)),
                        h("span", { class: "package__price", "data-price": JSON.stringify(pkg.price) }, priceText(pkg.price)),
                        h(
                            "ul",
                            { class: "package__includes" },
                            pkg.options.filter((o) => o.included).map((o) =>
                                h("li", {}, t("flow.quote.package.includes", { option: t(`flow.quote.option.${o.code}.name`) })),
                            ),
                        ),
                    ),
                ),
            ),
        );

        const frequency = choices({
            legend: t("flow.quote.frequency.label"),
            name: "frequency",
            value: state.selection.frequency,
            options: ["annual", "monthly"].map((v) => ({ value: v, label: t(`flow.quote.frequency.${v}`) })),
            onChange: (v) => { state.selection.frequency = v; refreshPrices(); },
            withError: false,
        });

        content.replaceChildren(
            frequency,
            packages,
            h(
                "section",
                { class: "panel", "aria-labelledby": "options-title" },
                h("h2", { class: "panel__title", id: "options-title" }, t("flow.quote.options.title")),
                optionsSlot,
            ),
        );
        content.setAttribute("aria-busy", "false");
        refreshPrices();
    }

    async function load() {
        content.setAttribute("aria-busy", "true");
        content.replaceChildren(...skeleton());
        try {
            const quote = await createQuote({ program: "bmw-fr-ev", vehicle: state.vehicle, driver: state.driver });
            // Le client a quitté l'écran pendant l'appel (et a peut-être changé ses réponses) :
            // ce devis ne correspond plus forcément à l'état, on ne le garde pas.
            if (!content.isConnected) return;
            state.quote = quote;
            paintQuote();
        } catch (error) {
            if (!content.isConnected) return;
            content.setAttribute("aria-busy", "false");
            const fixAnswers = error.code === "driver_ineligible" || error.code === "invalid_request";
            content.replaceChildren(
                errorPanel(error, { onAction: fixAnswers ? () => goTo(STEPS.indexOf("driver")) : load }),
            );
        }
    }

    if (state.quote) paintQuote();
    else load();
    return view;
}

// Une ligne de texte fantôme : l'enveloppe garde la classe du vrai texte (même hauteur de ligne),
// la barre grise à l'intérieur remplace les mots.
const bar = (cls, width = "") => h("span", { class: cls }, h("span", { class: `skeleton skeleton--bar ${width}` }, " "));

// Squelette construit comme l'écran final (règle 7) : rien ne saute quand le devis arrive.
// - le choix du rythme ne dépend pas de l'API : c'est le vrai, désactivé pendant l'appel ;
// - les cartes fantômes ont les classes des vraies (padding, titre, description, prix) et
//   4 lignes d'inclus, le maximum d'une formule, qui fixe la hauteur des cartes côte à côte ;
// - « Chargement » n'est annoncé qu'aux lecteurs d'écran : visible, il décalait les cartes.
function skeleton() {
    const frequency = choices({
        legend: t("flow.quote.frequency.label"),
        name: "frequency",
        value: state.selection.frequency,
        options: ["annual", "monthly"].map((v) => ({ value: v, label: t(`flow.quote.frequency.${v}`) })),
        onChange: () => {},
        withError: false,
    });
    frequency.disabled = true;

    const ghostCard = () => h(
        "div",
        { class: "package skeleton--card", "aria-hidden": "true" },
        h(
            "span",
            { class: "package__card" },
            bar("package__name", "skeleton--short"),
            bar("field__hint package__desc", "skeleton--long"),
            bar("package__price", "skeleton--short"),
            h("ul", { class: "package__includes" }, [1, 2, 3, 4].map(() => h("li", { class: "skeleton-card__include" }, bar("", "")))),
        ),
    );

    return [
        h("p", { class: "visually-hidden", role: "status" }, t("flow.quote.loading")),
        frequency,
        h("div", { class: "packages" }, [1, 2, 3].map(ghostCard)),
    ];
}
