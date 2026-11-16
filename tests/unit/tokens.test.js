// Règle 1 : toutes les couleurs et tailles viennent d'un seul fichier de tokens.
// Règle 4 : contraste AA dans les deux thèmes.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { read } from "../helpers.js";

const tokensCss = read("styles/tokens.css");
const baseCss = read("styles/base.css");

// Lit les « --nom: valeur; » d'un bloc CSS.
const parseTokens = (block) => Object.fromEntries([...block.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));

// Les trois blocs de tokens.css : base (thème clair, mobile), palier 768px, thème sombre.
const [lightBlock] = tokensCss.split("@media");
const desktopBlock = tokensCss.match(/@media \(min-width: 768px\)\s*\{([\s\S]*?)\}\s*\}/)[1];
const darkBlock = tokensCss.match(/@media \(prefers-color-scheme: dark\)\s*\{([\s\S]*?)\}\s*\}/)[1];
const light = parseTokens(lightBlock);
const dark = { ...light, ...parseTokens(darkBlock) };

// Contraste WCAG 2 : (L1 + 0,05) / (L2 + 0,05), L = luminance relative.
function luminance(hex) {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
        .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a, b) {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
}

const cssWithoutComments = baseCss.replace(/\/\*[\s\S]*?\*\//g, "");

describe("règle 1 : une seule source de valeurs", () => {
    test("base.css ne contient aucune couleur écrite en dur", () => {
        const css = cssWithoutComments.replace(/url\([^)]*\)/g, "url()"); // le masque SVG de la flèche n'a pas de couleur visible
        assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b/i, "couleur hexadécimale");
        assert.doesNotMatch(css, /\b(rgba?|hsla?|oklch|lab)\(/i, "fonction de couleur");
        assert.doesNotMatch(css, /:[^;{]*\b(white|black|red|blue|gray|grey)\b(?!-)/i, "couleur nommée");
    });

    test("base.css n'a pas de taille en dur, sauf exceptions justifiées", () => {
        // Exceptions : une variable CSS est interdite dans une condition @media ;
        // visually-hidden = technique standard (1px) ; prefers-reduced-motion coupe les animations (0.01ms).
        const allowed = new Set(["1px", "-1px", "0.01ms"]);
        const css = cssWithoutComments.replace(/@media[^{]*\{/g, "@media {");
        const found = [...css.matchAll(/-?\b\d*\.?\d+(px|rem|em|ms|s)\b/g)].map((m) => m[0]).filter((v) => !allowed.has(v));
        assert.deepEqual(found, []);
    });

    test("chaque var(--…) utilisée dans base.css est définie dans tokens.css", () => {
        const used = new Set([...baseCss.matchAll(/var\(--([\w-]+)/g)].map((m) => m[1]));
        const missing = [...used].filter((name) => !(name in light));
        assert.deepEqual(missing, []);
    });

    test("chaque token est utilisé quelque part (pas de token mort)", () => {
        const used = new Set([...(baseCss + read("assets/logo.svg")).matchAll(/var\(--([\w-]+)/g)].map((m) => m[1]));
        const unused = Object.keys(light).filter((name) => !used.has(name));
        assert.deepEqual(unused, []);
    });

    test("le thème sombre et le palier 768px ne redéfinissent que des tokens existants", () => {
        for (const block of [darkBlock, desktopBlock]) {
            for (const name of Object.keys(parseTokens(block))) assert.ok(name in light, `--${name} inconnu`);
        }
    });

    test("le thème sombre redéfinit toutes les couleurs de surface et de texte", () => {
        for (const name of ["color-bg", "color-surface", "color-text", "color-text-muted", "color-border", "color-border-strong"]) {
            assert.notEqual(dark[name], light[name], `--${name} identique dans les deux thèmes`);
        }
    });

    test("aucun fichier JavaScript n'écrit de couleur ou de taille en style inline", () => {
        const js = read("js/layout.js") + read("js/form.js") + read("js/dom.js");
        assert.doesNotMatch(js, /\.style\.|style:\s*"/);
    });
});

describe("logo et favicon", () => {
    test("le logo ne contient aucune couleur : elles viennent des tokens", () => {
        const svg = read("assets/logo.svg");
        assert.doesNotMatch(svg, /#[0-9a-f]{3,8}\b|fill="(?!none)|stroke="(?!none)/i);
        assert.match(baseCss, /\.logo__accent\s*\{[^}]*var\(--color-accent\)/);
    });

    test("la favicon (seule exception) reprend exactement les couleurs des tokens", () => {
        const svg = read("assets/favicon.svg");
        const [, lightMark] = svg.match(/\.mark\s*\{\s*fill:\s*(#[0-9a-f]{6})/i);
        const [, accent] = svg.match(/\.accent\s*\{\s*fill:\s*(#[0-9a-f]{6})/i);
        const [, darkMark] = svg.match(/prefers-color-scheme: dark\)\s*\{\s*\.mark\s*\{\s*fill:\s*(#[0-9a-f]{6})/i);
        assert.equal(lightMark, light["color-text"]);
        assert.equal(accent, light["color-accent"]);
        assert.equal(darkMark, dark["color-text"]);
    });
});

describe("règle 4 : contraste AA", () => {
    const text = 4.5; // texte normal
    const ui = 3; // contours de champ, focus, composants (WCAG 1.4.11)
    const pairs = [
        ["color-text", "color-bg", text],
        ["color-text", "color-surface", text],
        ["color-text-muted", "color-bg", text],
        ["color-text-muted", "color-surface", text],
        ["color-error", "color-bg", text],
        ["color-error", "color-surface", text],
        ["color-on-accent", "color-accent", text],
        ["color-on-accent", "color-accent-hover", text],
        ["color-border-strong", "color-bg", ui],
        ["color-border-strong", "color-surface", ui],
        ["color-focus", "color-bg", ui],
        ["color-focus", "color-surface", ui],
        ["color-accent", "color-bg", ui],
    ];

    for (const [themeName, theme] of [["clair", light], ["sombre", dark]]) {
        for (const [fg, bg, min] of pairs) {
            test(`${themeName} : --${fg} sur --${bg} ≥ ${min}:1`, () => {
                const ratio = contrast(theme[fg], theme[bg]);
                assert.ok(ratio >= min, `${ratio.toFixed(2)}:1`);
            });
        }
    }

    test("le calcul de contraste est juste (valeurs de référence WCAG)", () => {
        assert.equal(contrast("#000000", "#ffffff").toFixed(0), "21");
        assert.equal(contrast("#ffffff", "#ffffff"), 1);
        assert.equal(contrast("#1c69d4", "#ffffff").toFixed(2), "5.22"); // relevé par CSS Overview sur bmw.fr
    });

    test("le bleu n'est jamais une couleur de texte (il échoue AA sur fond sombre)", () => {
        assert.ok(contrast(dark["color-accent"], dark["color-bg"]) < text);
        assert.doesNotMatch(cssWithoutComments, /(^|[^-])color:\s*var\(--color-accent\)/m);
    });
});
