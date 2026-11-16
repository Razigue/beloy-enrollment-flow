import { h } from "../dom.js";
import { t } from "../i18n.js";
import { state, next, resetQuote } from "../state.js";
import { screen, primaryButton } from "../layout.js";
import { field, choices, validate, isoDate, addYears } from "../form.js";

// Toute modification d'une réponse invalide le devis déjà obtenu.
function update(key, value) {
    state.driver[key] = value;
    resetQuote();
}

export function renderDriver() {
    document.title = t("flow.driver.page_title");
    const today = new Date();
    const d = state.driver;

    const birth = h("input", {
        type: "date", required: true, autocomplete: "bday",
        max: isoDate(addYears(today, -18)), value: d.birth_date,
        onChange: (e) => update("birth_date", e.target.value),
    });

    const licence = h("input", {
        type: "date", required: true, max: isoDate(today), value: d.licence_since,
        onChange: (e) => update("licence_since", e.target.value),
    });

    const claims = h(
        "select",
        { required: true, onChange: (e) => update("claims_3y", e.target.value === "" ? null : Number(e.target.value)) },
        h("option", { value: "", selected: d.claims_3y === null }, t("flow.driver.select_placeholder")),
        [0, 1, 2, 3].map((n) =>
            h("option", { value: n, selected: d.claims_3y === n }, t(`flow.driver.claims.option_${n}`)),
        ),
    );

    const km = h("input", {
        type: "number", required: true, inputmode: "numeric", min: 1000, max: 100000,
        value: d.annual_km ?? "",
        onChange: (e) => update("annual_km", e.target.value === "" ? null : Number(e.target.value)),
    });

    const postcode = h("input", {
        type: "text", required: true, inputmode: "numeric", autocomplete: "postal-code",
        pattern: "[0-9]{5}", maxlength: 5, value: d.postcode,
        onChange: (e) => update("postcode", e.target.value.trim()),
    });

    const form = h(
        "form",
        {
            class: "form", id: "driver-form", novalidate: true,
            onSubmit: (e) => { e.preventDefault(); if (validate(form)) next(); },
        },
        h(
            "div",
            { class: "field-row" },
            field({
                label: t("flow.driver.birth_date.label"), control: birth,
                errors: { rangeOverflow: "flow.error.field.too_young" },
            }),
            field({
                label: t("flow.driver.licence_since.label"), control: licence,
                errors: { rangeOverflow: "flow.error.field.date_future" },
            }),
        ),
        h(
            "div",
            { class: "field-row" },
            field({ label: t("flow.driver.claims.label"), control: claims }),
            field({
                label: t("flow.driver.annual_km.label"), control: km,
                errors: { rangeUnderflow: "flow.error.field.km_range", rangeOverflow: "flow.error.field.km_range" },
            }),
        ),
        // Seul dans sa ligne mais dans la même grille : il prend une demi-largeur sur desktop,
        // comme les autres champs (5 chiffres n'ont pas besoin de toute la largeur).
        h(
            "div",
            { class: "field-row" },
            field({
                label: t("flow.driver.postcode.label"), control: postcode,
                errors: { patternMismatch: "flow.error.field.postcode" },
            }),
        ),
        choices({
            legend: t("flow.driver.parking.label"), name: "parking", value: d.parking,
            options: ["garage", "driveway", "street"].map((v) => ({ value: v, label: t(`flow.driver.parking.${v}`) })),
            onChange: (v) => update("parking", v),
        }),
        choices({
            legend: t("flow.driver.charging.label"), name: "charging", value: d.charging,
            options: ["home", "work", "public"].map((v) => ({ value: v, label: t(`flow.driver.charging.${v}`) })),
            onChange: (v) => update("charging", v),
        }),
    );

    return screen({
        name: "driver",
        title: t("flow.driver.title"),
        body: form,
        actions: primaryButton(t("flow.nav.continue"), { type: "submit", form: "driver-form" }),
    });
}
