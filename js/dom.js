// Petit créateur d'éléments : h("button", { class: "btn" }, "texte", autreElement)
// Évite de répéter createElement / setAttribute / append dans chaque écran.
export function h(tag, attrs = {}, ...children) {
    const el = document.createElement(tag);
    for (const [name, value] of Object.entries(attrs)) {
        if (value === false || value === null || value === undefined) continue;
        if (name.startsWith("on")) {
            el.addEventListener(name.slice(2).toLowerCase(), value);
        } else if (value === true) {
            el.setAttribute(name, "");
        } else {
            el.setAttribute(name, value);
        }
    }
    el.append(...children.flat().filter((child) => child !== null && child !== false));
    return el;
}
