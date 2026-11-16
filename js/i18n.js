let messages = {};

export async function loadLocale(lang) {
    const response = await fetch(`i18n/${lang}.json`);
    if (!response.ok) {
        throw new Error(`i18n: ${lang}.json introuvable (${response.status})`);
    }
    messages = await response.json();
    document.documentElement.lang = lang;
}

export function t(key, params = {}) {
    const text = messages[key];
    if (text === undefined) {
        console.warn(`i18n: clé manquante "${key}"`);
        return key;
    }
    return text.replace(/\{(\w+)\}/g, (match, name) => params[name] ?? match);
}