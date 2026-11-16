const LOCALES = { fr: "fr-FR", en: "en-GB" };

export function formatPrice(minorUnits, currency = "EUR") {
    const locale = LOCALES[document.documentElement.lang] ?? "fr-FR";
    return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
    }).format(minorUnits / 100);
}

// Dates de l'API (AAAA-MM-JJ) affichées selon la langue : « 4 juin 2027 » / « 4 June 2027 ».
// Construites en heure locale pour éviter un décalage d'un jour lié au fuseau horaire.
// En français, le premier du mois s'écrit « 1er juin », ce qu'Intl ne fait pas :
// on découpe la date en morceaux (formatToParts) et on complète seulement le jour.
export function formatDate(isoDate) {
    const [year, month, day] = isoDate.split("-").map(Number);
    const locale = LOCALES[document.documentElement.lang] ?? "fr-FR";
    const parts = new Intl.DateTimeFormat(locale, { dateStyle: "long" }).formatToParts(new Date(year, month - 1, day));
    return parts
        .map((part) => (part.type === "day" && locale === "fr-FR" && day === 1 ? `${part.value}er` : part.value))
        .join("");
}

export function formatNumber(value) {
    const locale = LOCALES[document.documentElement.lang] ?? "fr-FR";
    return new Intl.NumberFormat(locale).format(value);
}
