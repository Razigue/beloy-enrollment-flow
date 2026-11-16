import { h } from "../dom.js";
import { t } from "../i18n.js";
import { formatPrice } from "../format.js";
import { state, next, resetQuote } from "../state.js";
import { screen, primaryButton } from "../layout.js";
import { field, validate, isoDate } from "../form.js";

const MODELS = ["i4", "i5", "i7", "iX1", "iX2", "iX3"];

// Prix de la configuration en pied de panneau, comme le Total de l'écran Formules :
// libellé discret à gauche, montant en gras à droite, séparés du formulaire par un filet.
function priceRow() {
    return h(
        "p",
        { class: "order-total" },
        h("span", { class: "text-muted" }, t("flow.vehicle.list_price.label")),
        h("span", { class: "order-total__amount" }, formatPrice(state.vehicle.list_price)),
    );
}

export function renderVehicle() {
    document.title = t("flow.vehicle.page_title");

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const model = h(
        "select",
        { required: true, onChange: (e) => { state.vehicle.model_code = e.target.value; resetQuote(); } },
        MODELS.map((code) =>
            h("option", { value: code, selected: code === state.vehicle.model_code }, t(`flow.vehicle.models.${code}`)),
        ),
    );

    const delivery = h("input", {
        type: "date",
        required: true,
        min: isoDate(tomorrow),
        value: state.vehicle.delivery_date,
        onChange: (e) => { state.vehicle.delivery_date = e.target.value; resetQuote(); },
    });

    const form = h(
        "form",
        {
            class: "form", id: "vehicle-form", novalidate: true,
            onSubmit: (e) => { e.preventDefault(); if (validate(form)) next(); },
        },
        h(
            "section",
            { class: "panel" },
            h("h2", { class: "panel__title" }, t("flow.vehicle.order.label")),
            // Un seul bloc : modèle et date de livraison côte à côte, puis le prix en pied.
            // La liste ne peut pas être invalide, mais garde sa zone d'erreur réservée : même
            // structure que la colonne date, sinon `margin-top: auto` la décale vers le bas.
            h("div", { class: "field-row" },
                field({ label: t("flow.vehicle.model.label"), control: model }),
                field({
                    label: t("flow.vehicle.delivery_date.label"),
                    control: delivery,
                    errors: { rangeUnderflow: "flow.error.field.delivery_past" },
                })),
            priceRow(),
        ),
    );

    return screen({
        name: "vehicle",
        title: t("flow.vehicle.title"),
        body: form,
        actions: primaryButton(t("flow.nav.continue"), { type: "submit", form: "vehicle-form" }),
    });
}
