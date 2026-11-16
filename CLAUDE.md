# Contexte pour Claude — take-home Beloy

## Qui je suis et pourquoi ce fichier existe

Je m'appelle Razigue, étudiant en développement web full-stack (Web@cadémie by Epitech), en recherche d'alternance. Ce projet est l'exercice technique de Beloy pour un poste de **Junior Front-End Developer** à Paris. Rendu : **mardi 17 novembre 2026**.

Lors d'un précédent exercice technique, j'ai trop délégué le code à l'IA. Je savais cadrer le projet, mais en entretien je n'arrivais pas à répondre aux questions détaillées sur mon propre code. Ici, ce serait éliminatoire : l'entretien dure 45 minutes, je dois expliquer et modifier mon code en direct, puis **rebrander tout mon flow aux couleurs d'un autre site en 20 minutes** devant eux.

**Ton rôle n'est donc pas d'aller vite, mais de faire en sorte que je comprenne et puisse défendre chaque ligne.** Un flow plus petit que je maîtrise vaut mieux qu'un flow complet que je subis. Le brief le dit lui-même.

## Règles de travail entre nous

1. **Je code les fondations moi-même** : fichier de tokens, fichiers de traduction, fonction `t()`, formateur de prix, gestion de l'état du wizard. Tu m'expliques, tu me guides, tu relis, mais tu ne les écris pas à ma place.
2. **Pour le reste, petites étapes** : tu peux générer un composant, mais un seul à la fois, court, sans fonctionnalités que je n'ai pas demandées. Pas de gros fichiers d'un coup.
3. **Avant chaque bloc de code, une phrase** : ce qu'il fait et pourquoi ce choix plutôt qu'une alternative.
4. **Après chaque étape, vérifie que j'ai compris** : pose-moi 1 ou 2 questions comme le ferait un recruteur (« pourquoi ici ? », « que se passe-t-il si… ? », « comment tu changerais X en live ? »). On ne passe à la suite que si je réponds correctement.
5. **Si je te demande de « juste le faire »** pour une partie de la logique, rappelle-moi ce fichier une fois. Si j'insiste, fais-le, mais explique ensuite le code ligne par ligne.
6. **Tiens le journal** `NOTES.md` au fil de l'eau : chaque décision (avec l'option écartée) et chaque fois que j'ai dû corriger ou refuser ce que tu proposais. Ça alimente directement le PDF de rendu.
7. **Pas d'invention** : si une info manque (champ de l'API, comportement attendu), demande-moi au lieu de supposer, et note l'ambiguïté dans `NOTES.md` (le brief demande de signaler ce qui est mal spécifié).
8. Réponses concises, en français, sans répétition.

## Le sujet (résumé)

BMW France vend des voitures électriques. Sur la page de commande, on propose au client une assurance qui démarre le jour de la livraison : auto, mais aussi wallbox, câble de recharge, dégradation de la batterie, bris de glace, panne de charge. **Ardenne Assurance** (fictif) tarifie et émet le contrat, **Beloy** est la plateforme entre les deux. Le flow doit ressembler à un produit BMW, pas à Beloy.

### Les 6 écrans (un seul wizard cohérent)

1. **Landing** : ce que couvre l'offre, un prix « à partir de » (texte marketing → fichier de traduction, pas l'API), un bouton pour commencer.
2. **Véhicule** : modèle et configuration pré-remplis depuis la commande, à confirmer ou corriger, plus la date de livraison.
3. **Conducteur** : date de naissance, permis depuis, sinistres sur 3 ans, kilométrage annuel, code postal, lieu de stationnement, lieu de recharge.
4. **Formules** : 3 packages côte à côte, options, switch annuel/mensuel, total en direct, bouton Continuer désactivé tant qu'il n'y a pas de prix. Rien de sélectionné à l'ouverture.
5. **Récapitulatif** : réponses relues, nom et coordonnées, consentements, documents précontractuels (noms inventés, liens factices).
6. **Référence de paiement** : numéro de contrat, référence de paiement complète, montant, marche à suivre. Rien n'est débité, le client paie depuis sa banque ou un distributeur : l'écran doit l'empêcher de perdre la référence (copier, etc.).

Desktop et mobile (surtout mobile), thème clair et sombre. Pas besoin de survivre à un rechargement de page.

### Stack imposée

HTML, CSS et JavaScript natifs. **Aucun framework** (ni React, Vue, Svelte, Lit). Autorisé : ce qui se charge par `<script>` ou `<link>` sans build (reset CSS, Open Props…), piloté par mes propres tokens. Composants en **modules ES séparés** → le dossier doit être servi par un serveur statique d'une ligne (ex. `npx serve .` ou `python3 -m http.server`).

### Règles de la maison (évaluées)

1. Toutes les couleurs et tailles viennent d'**un seul fichier de tokens** extrait du site BMW. Aucune valeur en dur dans les composants.
2. Tous les textes viennent d'**un seul endroit, par clé** (`flow.cover.title`), en FR et EN, mêmes clés dans les deux fichiers.
3. Les montants passent par **un seul formateur** (`Intl.NumberFormat`). Jamais de prix construit à la main.
4. **Contraste AA** sur les deux thèmes, tout accessible au clavier, focus visible. Si la marque BMW contredit AA, AA gagne : on modifie le token et on le note.
5. **Aucune intégration de paiement**.
6. **Aucun code d'erreur visible** par le client : un titre, une phrase compréhensible, une action possible. Les codes vont dans la console.
7. **Chaque attente a un état défini** : rien de figé pendant un appel, rien qui saute à la réponse.

### Marque

- Source : https://www.bmw.fr/fr/index.html uniquement. **Ne pas consulter le site d'assurance de BMW.**
- Police BMW sous licence → choisir une police libre proche et justifier le choix.
- Pas le logo BMW : un logo de remplacement de ma création.
- Le thème sombre n'existe pas sur le site : à inventer, en restant reconnaissable comme BMW.
- C'est la partie qui les intéresse le plus : je fais l'extraction moi-même dans les DevTools, tu me guides.

### API

Deux appels REST/JSON : `POST /v1/quotes` (packages, options, prix annuels et mensuels — l'API dit `annual`) et `POST /v1/contracts` (numéro de contrat et référence de paiement). Le contrat complet est dans le document **Ardenne Assurance, API documentation** que je dois ajouter au dépôt (`docs/`). On construit sur des **stubs** tirés des exemples du document. Bonus si on a le temps : un vrai mock serveur qui respecte le contrat.

### Critères d'évaluation (dans l'ordre)

1. Design et détails : ça ressemble à BMW, à un produit et pas à un formulaire, les 6 écrans forment un tout (espacements, échelle typo, états sélectionné/désactivé/vide, mobile, sombre).
2. Respect de ma propre structure : changer un token change tout le flow.
3. Exactitude : le total est juste, le switch annuel/mensuel affiche les vrais chiffres de l'API.
4. Responsive réel sur téléphone.

### À rendre

Un dépôt git, plus un **PDF de 2 pages max** : comment j'ai extrait la marque et avec quoi, la structure et pourquoi, ce que j'ai demandé à l'IA et ce que j'ai dû corriger, ce que je n'ai pas fait et ce que je ferais avec un jour de plus, ce qui est faux ou flou dans le brief. La commande de lancement tout en haut, testée depuis un clone propre. Budget : environ 4 h, arrêt à 6 h en notant la suite.

## Ordre de travail prévu

1. **Extraction de la marque** (moi, guidé) : couleurs, typo, espacements, rayons, ombres, états des boutons sur bmw.fr. → `styles/tokens.css`, contrastes AA vérifiés, thème sombre défini.
2. **Fondations** (moi) : `i18n/fr.json` + `i18n/en.json`, fonction `t()`, formateur de prix, objet d'état du wizard et navigation entre étapes, stubs de l'API avec états de chargement et d'erreur.
3. **Les 6 écrans**, un par un, en partant du mobile.
4. **Finitions** : thème sombre, desktop, focus et clavier, états d'attente sans saut de mise en page.
5. **PDF** à partir de `NOTES.md`.
6. **Répétition d'entretien** : tu me fais rebrander mon flow avec un autre site en 20 minutes chrono, puis tu me poses les questions qu'un tech lead poserait sur mon code.

À la fin de chaque session de travail, fais-moi un récap de 3 lignes de ce qu'on a fait et pose-moi 3 questions d'entretien sur ce code.
