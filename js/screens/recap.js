import { h } from "../dom.js";
import { t } from "../i18n.js";
import { formatPrice, formatDate, formatNumber } from "../format.js";
import { state, next, goTo, STEPS } from "../state.js";
import { screen, primaryButton, errorPanel } from "../layout.js";
import { field, validate } from "../form.js";
import { createContract } from "../api.js";
import { computeTotal } from "./quote.js";

const DOCUMENTS = ["ipid", "general_conditions", "special_conditions"];
const CONSENTS = ["pre_contractual_information", "general_conditions", "data_processing"];

function summary(titleKey, stepName, rows) {
    return h(
        "section",
        { class: "panel" },
        h(
            "div",
            { class: "summary__row summary__head" },
            h("h2", { class: "panel__title" }, t(titleKey)),
            h("button", { type: "button", class: "btn-link", onClick: () => goTo(STEPS.indexOf(stepName)) },
                t("flow.recap.edit"), h("span", { class: "visually-hidden" }, ` ${t(titleKey)}`)),
        ),
        h(
            "dl",
            { class: "summary" },
            rows.map(([label, value]) => h("div", { class: "summary__row" }, h("dt", {}, label), h("dd", {}, value))),
        ),
    );
}

// Téléphone français : « 0X » ou « +33X » puis 8 chiffres, espaces ou points autorisés.
export const PHONE_PATTERN = "^(\\+33 ?|0)[1-9]([ .]?[0-9]{2}){4}$";

// « 06 12 34 56 78 » → « +33612345678 » : le format de l'exemple de l'API.
// Le pattern du champ garantit déjà « 0X » ou « +33X » suivi de 8 chiffres.
export function toInternational(phone) {
    const compact = phone.replace(/[ .]/g, "");
    return compact.startsWith("0") ? `+33${compact.slice(1)}` : compact;
}

function input(attrs, key) {
    return h("input", {
        ...attrs, required: true, value: state.holder[key],
        onChange: (e) => { state.holder[key] = e.target.value.trim(); },
    });
}

export function renderRecap() {
    document.title = t("flow.recap.page_title");
    const { vehicle: v, driver: d, selection: s } = state;
    const pkg = state.quote.packages.find((p) => p.id === s.package_id);
    const chosen = pkg.options.filter((o) => o.included || s.options.includes(o.code));

    const errorSlot = h("div");
    const consentError = h("p", { class: "field__error", id: "consent-error" });

    const submit = primaryButton(t("flow.recap.submit"), { type: "submit", form: "recap-form" });

    async function onSubmit(e) {
        e.preventDefault();
        errorSlot.replaceChildren();
        const formValid = validate(form);
        const consentsValid = CONSENTS.every((c) => state.consents[c]);
        consentError.textContent = consentsValid ? "" : t("flow.error.field.consents");
        if (!formValid) return;
        if (!consentsValid) { form.querySelector("[name=consent]").focus(); return; }

        submit.disabled = true;
        submit.classList.add("is-loading");
        submit.setAttribute("aria-busy", "true");
        try {
            state.contract = await createContract({
                quote_id: state.quote.quote_id,
                package_id: s.package_id,
                options: s.options,
                frequency: s.frequency,
                holder: { ...state.holder, phone: toInternational(state.holder.phone) },
                consents: state.consents,
            });
            // Le client a pu cliquer « Retour » ou « Modifier » pendant l'appel : l'écran
            // n'est plus affiché, on ne l'envoie pas une étape plus loin depuis ailleurs.
            if (form.isConnected) next();
        } catch (error) {
            if (!form.isConnected) return;
            submit.disabled = false;
            submit.classList.remove("is-loading");
            submit.removeAttribute("aria-busy");
            // Devis expiré ou inconnu : on en redemande un, la formule choisie est conservée.
            const requote = error.code === "quote_expired" || error.code === "quote_not_found";
            const onAction = requote
                ? () => { state.quote = null; goTo(STEPS.indexOf("quote")); }
                : () => errorSlot.replaceChildren();
            errorSlot.replaceChildren(errorPanel(error, { onAction }));
            errorSlot.querySelector("button").focus();
        }
    }

    const form = h(
        "form",
        { class: "form", id: "recap-form", novalidate: true, onSubmit },
        summary("flow.recap.vehicle.title", "vehicle", [
            [t("flow.vehicle.model.label"), t(`flow.vehicle.models.${v.model_code}`)],
            [t("flow.vehicle.delivery_date.label"), formatDate(v.delivery_date)],
        ]),
        summary("flow.recap.driver.title", "driver", [
            [t("flow.driver.birth_date.label"), formatDate(d.birth_date)],
            [t("flow.driver.licence_since.label"), formatDate(d.licence_since)],
            [t("flow.driver.claims.label"), t(`flow.driver.claims.option_${d.claims_3y}`)],
            [t("flow.driver.annual_km.label"), t("flow.recap.km", { km: formatNumber(d.annual_km) })],
            [t("flow.driver.postcode.label"), d.postcode],
            [t("flow.driver.parking.label"), t(`flow.driver.parking.${d.parking}`)],
            [t("flow.driver.charging.label"), t(`flow.driver.charging.${d.charging}`)],
        ]),
        summary("flow.recap.cover.title", "quote", [
            [t("flow.recap.cover.package"), t(`flow.quote.package.${pkg.id}.name`)],
            [t("flow.recap.cover.options"), chosen.map((o) => t(`flow.quote.option.${o.code}.name`)).join(", ") || "—"],
            [t("flow.quote.frequency.label"), t(`flow.quote.frequency.${s.frequency}`)],
            [t("flow.quote.total.label"), t(`flow.quote.per.${s.frequency}`, { price: formatPrice(computeTotal(s.frequency), state.quote.currency) })],
        ]),
        h(
            "section",
            { class: "form", "aria-labelledby": "holder-title" },
            h("h2", { class: "panel__title", id: "holder-title" }, t("flow.recap.holder.title")),
            h(
                "div",
                { class: "field-row" },
                field({ label: t("flow.recap.holder.first_name"), control: input({ type: "text", autocomplete: "given-name" }, "first_name") }),
                field({ label: t("flow.recap.holder.last_name"), control: input({ type: "text", autocomplete: "family-name" }, "last_name") }),
            ),
            h(
                "div",
                { class: "field-row" },
                field({
                    label: t("flow.recap.holder.email"), control: input({ type: "email", autocomplete: "email" }, "email"),
                    errors: { typeMismatch: "flow.error.field.email" },
                }),
                field({
                    label: t("flow.recap.holder.phone"),
                    control: input({ type: "tel", autocomplete: "tel", pattern: PHONE_PATTERN }, "phone"),
                    errors: { patternMismatch: "flow.error.field.phone" },
                }),
            ),
        ),
        h(
            "section",
            { class: "panel", "aria-labelledby": "docs-title" },
            h("h2", { class: "panel__title", id: "docs-title" }, t("flow.recap.documents.title")),
            h("ul", { class: "doc-list" },
                DOCUMENTS.map((doc) => h("li", {}, h("a", { href: "#" }, t(`flow.recap.documents.${doc}`))))),
        ),
        h(
            "fieldset",
            { class: "consents", "aria-describedby": "consent-error" },
            h("legend", { class: "panel__title" }, t("flow.recap.consents.title")),
            CONSENTS.map((c) =>
                h(
                    "label",
                    { class: "check" },
                    h("input", {
                        type: "checkbox", name: "consent", checked: state.consents[c],
                        onChange: (e) => { state.consents[c] = e.target.checked; },
                    }),
                    h("span", {}, t(`flow.recap.consents.${c}`)),
                ),
            ),
            consentError,
        ),
        errorSlot,
    );

    return screen({
        name: "recap",
        title: t("flow.recap.title"),
        body: form,
        actions: submit,
    });
}
