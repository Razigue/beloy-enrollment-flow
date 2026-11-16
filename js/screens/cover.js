import { h } from "../dom.js";
import { t } from "../i18n.js";
import { formatPrice } from "../format.js";
import { next } from "../state.js";
import { screen, primaryButton } from "../layout.js";

// Prix « à partir de » : chiffre marketing (brief), en centimes comme l'API,
// formaté par le formateur unique. Le texte autour vient du fichier de copy.
const FROM_MONTHLY_PRICE = 3850;

const COVERAGE = ["car", "wallbox", "cable", "battery", "glass", "charging"];

export function renderCover() {
    document.title = t("flow.cover.page_title");

    const [before, after] = t("flow.cover.price_from").split("{price}");

    const body = h(
        "div",
        { class: "hero" },
        h("p", { class: "hero__price" }, before, h("strong", {}, formatPrice(FROM_MONTHLY_PRICE)), after),
        h(
            "section",
            { class: "panel", "aria-labelledby": "coverage-title" },
            h("h2", { class: "panel__title", id: "coverage-title" }, t("flow.cover.coverage.title")),
            h("ul", { class: "coverage" }, COVERAGE.map((key) => h("li", {}, t(`flow.cover.coverage.${key}`)))),
        ),
    );

    return screen({
        name: "cover",
        title: t("flow.cover.title"),
        titleClass: "hero__title",
        body,
        actions: primaryButton(t("flow.cover.cta"), { onClick: next }),
    });
}
