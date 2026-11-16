import { h } from "./dom.js";
import { t } from "./i18n.js";

let uid = 0;

// Champ texte / nombre / date / select, avec libellé, aide et zone d'erreur réservée.
// errors : clés de copy par type d'erreur, ex. { valueMissing: "flow.error.field.required" }
// withError : false pour un champ qui ne peut jamais être invalide (ex. liste toujours remplie).
export function field({ label, hint, control, errors = {}, withError = true }) {
    const id = `field-${++uid}`;
    const hintId = hint ? `${id}-hint` : null;
    const errorId = `${id}-error`;
    control.id = id;
    control.classList.add("field__control");
    control.setAttribute("aria-describedby", [hintId, withError ? errorId : null].filter(Boolean).join(" "));
    control.dataset.errors = JSON.stringify(errors);
    return h(
        "div",
        { class: "field" },
        h("label", { class: "field__label", for: id }, label),
        hint ? h("p", { class: "field__hint", id: hintId }, hint) : null,
        // Une liste est enveloppée : sa flèche est redessinée par le ::after de l'enveloppe.
        control.tagName === "SELECT" ? h("span", { class: "select" }, control) : control,
        withError ? h("p", { class: "field__error", id: errorId }) : null,
    );
}

// Groupe de pastilles radio (stationnement, recharge, fréquence…).
// withError : false quand le groupe n'est jamais validé (ex. fréquence sur l'écran Formules),
// pour ne pas réserver la place d'une erreur qui ne peut pas apparaître.
export function choices({ legend, name, options, value, onChange, withError = true }) {
    return h(
        "fieldset",
        { class: "field" },
        h("legend", { class: "field__label" }, legend),
        h(
            "div",
            { class: "choices" },
            options.map((option) =>
                h(
                    "label",
                    { class: "choice" },
                    h("input", {
                        type: "radio", name, value: option.value, required: true,
                        checked: option.value === value,
                        onChange: () => onChange(option.value),
                    }),
                    h("span", {}, option.label),
                ),
            ),
        ),
        withError ? h("p", { class: "field__error", "aria-live": "polite" }) : null,
    );
}

// Vérifie le formulaire avec la validation native du navigateur,
// mais affiche nos propres messages (fichier de copy) au lieu de ceux du navigateur.
export function validate(form) {
    let firstInvalid = null;
    for (const control of form.querySelectorAll("input, select")) {
        const fieldEl = control.closest(".field");
        const errorEl = fieldEl?.querySelector(".field__error");
        if (!errorEl) continue;
        if (control.type === "radio" && control !== form.querySelector(`input[name="${control.name}"]`)) continue;

        const validity = control.validity;
        let message = "";
        if (!validity.valid) {
            const custom = JSON.parse(control.dataset.errors ?? "{}");
            const reason = ["valueMissing", "badInput", "patternMismatch", "rangeUnderflow", "rangeOverflow", "typeMismatch"]
                .find((r) => validity[r]) ?? "valueMissing";
            message = t(custom[reason] ?? `flow.error.field.${reason}`);
            firstInvalid ??= control;
        }
        errorEl.textContent = message;
        control.setAttribute("aria-invalid", message ? "true" : "false");
    }
    firstInvalid?.focus();
    return firstInvalid === null;
}

// Dates au format AAAA-MM-JJ (celui des <input type="date"> et de l'API).
export function isoDate(date) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function addYears(date, years) {
    const copy = new Date(date);
    copy.setFullYear(copy.getFullYear() + years);
    return copy;
}
