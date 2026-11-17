import { h } from "../dom.js";
import { t } from "../i18n.js";
import { formatPrice, formatDate } from "../format.js";
import { state } from "../state.js";
import { screen } from "../layout.js";

// « 907318442 » → « 907 318 442 » : plus facile à recopier ou à lire sur un parking.
export const group = (digits) => digits.replace(/(\d{3})(?=\d)/g, "$1 ");

async function copyText(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (error) {
        console.error("[clipboard]", error);
        return false;
    }
}

export function renderPayment() {
    document.title = t("flow.payment.page_title");
    const { policy_number, payment } = state.contract;
    const currency = state.quote.currency;

    // Ligne d'état visible ET annoncée (role="status") : réussite ou échec de la copie.
    // Avant, elle était masquée : si le navigateur refusait la copie, rien ne s'affichait.
    // Sa hauteur est réservée (field__error), le texte apparaît sans rien pousser.
    const status = h("p", { class: "field__error copy-status", role: "status" });
    let resetTimer;
    function announce(ok) {
        status.textContent = t(ok ? "flow.payment.copied" : "flow.payment.copy_failed");
        status.classList.toggle("is-ok", ok);
        clearTimeout(resetTimer);
        resetTimer = setTimeout(() => { status.textContent = ""; }, 4000);
    }

    // Retour visible sur le bouton cliqué : « Copier » devient « Copié » 2 s.
    // Les deux libellés sont empilés dans la même case (grille) : le bouton garde
    // la largeur du plus long, rien ne bouge à côté (règle 7).
    function copyButton(label, extraClass, text, hiddenSuffix = "") {
        const button = h(
            "button",
            { type: "button", class: `btn ${extraClass} copy no-print` },
            h("span", { class: "copy__idle" }, label),
            h("span", { class: "copy__done", "aria-hidden": "true" }, t("flow.payment.copied_short")),
            hiddenSuffix ? h("span", { class: "visually-hidden" }, hiddenSuffix) : null,
        );
        let timer;
        button.addEventListener("click", async () => {
            const ok = await copyText(text);
            announce(ok);
            if (!ok) return;
            button.classList.add("is-done");
            clearTimeout(timer);
            timer = setTimeout(() => button.classList.remove("is-done"), 2000);
        });
        return button;
    }

    function item(labelKey, display, raw) {
        return h(
            "div",
            { class: "reference__item" },
            h("div", {}, h("p", { class: "label" }, t(labelKey)), h("p", { class: "reference__value" }, display)),
            copyButton(t("flow.payment.copy"), "btn--secondary", raw, ` ${t(labelKey)}`),
        );
    }

    const amount = formatPrice(payment.amount, currency);
    // Doc API : en mensuel, `amount` est la première mensualité, pas l'année. Le libellé le dit,
    // d'après le rythme renvoyé par le contrat (premium.frequency), pas celui de l'écran.
    const amountKey = `flow.payment.amount.${state.contract.premium.frequency}`;
    const allText = t("flow.payment.copy_all_text", {
        entity: payment.entity,
        reference: group(payment.reference),
        amount_label: t(amountKey),
        amount,
        due: formatDate(payment.due_by),
        policy: policy_number,
    });

    const body = h(
        "div",
        { class: "form payment-layout" },
        h(
            "section",
            { class: "panel reference", "aria-labelledby": "ref-title" },
            h("h2", { class: "panel__title", id: "ref-title" }, t("flow.payment.reference.title")),
            item("flow.payment.entity", payment.entity, payment.entity),
            item("flow.payment.reference", group(payment.reference), payment.reference),
            item(amountKey, amount, amount),
            h("p", {}, t("flow.payment.due", { date: formatDate(payment.due_by) })),
            h(
                "div",
                { class: "reference__actions no-print" },
                copyButton(t("flow.payment.copy_all"), "btn--primary", allText),
                h("button", { type: "button", class: "btn btn--secondary", onClick: () => window.print() },
                    t("flow.payment.print")),
            ),
            status,
        ),
        // Colonne de droite : la marche à suivre, puis le numéro de contrat (utile plus tard,
        // pas pour payer), séparé par un filet.
        h(
            "section",
            { class: "payment-help", "aria-labelledby": "next-title" },
            h("h2", { class: "panel__title", id: "next-title" }, t("flow.payment.next.title")),
            h("ol", { class: "steps" }, [1, 2, 3].map((n) => h("li", {}, t(`flow.payment.next.step_${n}`)))),
            h(
                "div",
                { class: "summary__row payment-help__policy" },
                h("span", { class: "text-muted" }, t("flow.payment.policy")),
                h("span", {}, policy_number),
            ),
        ),
    );

    return screen({
        name: "payment",
        title: t("flow.payment.title"),
        body,
        showBack: false,
    });
}
