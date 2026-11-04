# Yonathan Immobilier — CRM reconstruit et raccordé

Cette version est une reconstruction, pas une récupération mot pour mot des dernières modifications Codex perdues. L'historique confirme les modules principaux et FR/HE/EN. Le schéma de colonnes fourni par l'utilisateur a ensuite permis de raccorder la version à la base Supabase historique, sans appliquer de migration ni modifier les données existantes.

## Version actuellement utilisée : base historique

Le mode par défaut est **legacy**. Le CRM utilise les tables réelles suivantes :

| Écran | Table | Particularités confirmées par le schéma fourni |
| --- | --- | --- |
| Prospects | prospects | first_name, last_name, assigned_to, project_id, language, country |
| Projets | projects | description, created_by, starting_price, neighborhood, liens brochure/maps |
| Appartements | apartments | apartment_number ET reference ; area ET surface ; terrasse/jardin, parking, storage |
| Rendez-vous | appointments | appointment_date (date) et appointment_time (heure sans fuseau), assigned_to |
| Suivi commercial | prospect_activities | description, activity_type, activity_date, follow_up_date, follow_up_done |
| Tâches | tasks | description, due_date (date), completed (booléen), assigned_to |
| Liens prospect-appartement | prospect_apartments | prospect_id, apartment_id, created_at ; aucun statut sur le lien |

Les identifiants métier sont des bigint, pas des UUID. Le client normalise les ID et les relations en chaînes pour leur comparaison dans les formulaires. Les nombres dépassant la précision entière de JavaScript sont rejetés plutôt que d'utiliser un ID arrondi. Les dates de rendez-vous restent date/heure séparées, sans conversion UTC. Les timestamps de suivi sont convertis en UTC depuis le fuseau du navigateur.

Le document source de colonnes est conservé dans `supabase/audit/legacy-columns.json`. Il ne contient pas de dossiers clients, secrets, politiques ou contraintes. Les tables commissions, documents et profiles existent également, mais aucun écran supplémentaire n'est supposé à partir de leur seule existence.

## Fonctionnalités

- Connexion e-mail/mot de passe Supabase, session persistante, déconnexion et réinitialisation du mot de passe ; comptes créés par l'administrateur.
- Dashboard avec compteurs réels, rendez-vous à partir d'aujourd'hui et tâches non terminées classées par échéance.
- Listes, recherche locale, création, détail, édition et suppression pour les six modules.
- Fiche prospect avec appartements liés et suivi, liens ajoutables/retirables.
- Interfaces FR/HE/EN via next-intl, changement de langue, HTML lang/dir, RTL hébreu et sidebar responsive.
- Lots de 250 pour dépasser la limite PostgREST standard. Configurer une limite API de 250 ou plus ; pour de gros volumes prévoir pagination et recherche visibles côté serveur.

Les statuts, origines, langues et types sont du texte libre, sauvegardé **exactement tel que saisi**, sans traduction ou mapping des valeurs DB. Le schéma confirme leurs colonnes mais pas leurs valeurs canoniques. Les booléens completed, parking, storage et follow_up_done utilisent des cases à cocher. Il n'y a pas de currency, priority ou status sur les tâches historiques. Aucune valeur ILS n'est envoyée aux appartements historiques.

## Installation et configuration

Node.js 24 LTS recommandé (22.18+ pour les tests TypeScript natifs). Installer pnpm, puis :

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Copier `.env.example` vers `.env.local`, renseigner l'URL du projet et sa clé **publishable** ou ancienne clé **anon**. Garder `NEXT_PUBLIC_DATABASE_MODE=legacy` pour la base existante. Aucun secret n'est inclus dans le ZIP ; le fichier local configuré est exclu de Git et de l'archive. Ne jamais utiliser service_role ou une clé secret dans NEXT_PUBLIC. Reconstruire après modification de variables publiques.

Pour la version de production locale :

```sh
pnpm build
pnpm start --port 3100
```

Ouvrir http://localhost:3100/fr (ou /he, /en). Le layout fournit explicitement tous les paramètres next-intl ; aucun plugin ou middleware serveur de langue n'est nécessaire pour les traductions clients.

Dans Supabase Auth, configurer Site URL et les trois Redirect URLs exactes locales `http://localhost:3100/fr`, `http://localhost:3100/he`, `http://localhost:3100/en`, puis les équivalents HTTPS lors d'un déploiement. Configurer le SMTP et tester le lien de réinitialisation dans le navigateur utilisé. Le SDK détecte PASSWORD_RECOVERY et affiche le formulaire ; pas de callback serveur PKCE.

## Accès et écriture : ce qui reste à vérifier

Les sessions sont gérées dans le navigateur par le SDK Supabase. Le serveur Next.js rend la structure, sans lire les données privées. Le client historique ne suppose pas que created_by ou assigned_to définissent la visibilité : **les règles RLS existantes de Supabase décident de l'accès**. Il ne crée, supprime ni affaiblit aucune politique. Une lecture réussie ne prouve pas que les permissions ont été correctement conçues ; contrôler RLS pour tous les rôles via `supabase/audit-existing.sql`.

À la création, le compte connecté est envoyé dans created_by pour projets/appartements/activités, et assigned_to pour prospects/rendez-vous/tâches. Ce sont des choix de reconstruction fondés sur les colonnes disponibles ; leurs règles métier et contraintes restent à confirmer. Une édition ne modifie pas ces champs. Les relations de liens n'envoient aucun propriétaire inventé.

Le schéma reçu ne fournit pas les NOT NULL, valeurs par défaut, enums/checks, clés étrangères, triggers ou règles de cascade. Les formulaires imposent certains champs de base ; ces choix ne représentent pas une restauration certaine des règles originales. Une contrainte Supabase peut encore refuser une création ou modification. Aucun test d'écriture n'a été réalisé dans les données réelles. Vérifier ces points sur une base de test avant validation complète des CRUD.

En particulier : préciser la distinction entre area et surface et entre apartment_number et reference (les deux sont conservés, sans fusion), la devise des prix/budgets, le fuseau des heures de rendez-vous, les statuts canoniques, l'attribution aux collaborateurs, et les conséquences des suppressions. L'interface demande confirmation avant suppression d'un dossier ; les cascades réelles sont celles de votre base.

## Migrations pour une base NEUVE seulement

**Ne pas exécuter la migration de reconstruction sur la base historique actuelle.** Le raccordement legacy ne nécessite aucune migration. Le fichier `supabase/migrations/202610070001_reconstruction.sql` est conservé comme option pour une nouvelle base isolée. Il crée des tables yi_* avec UUID, owner_id, RLS et relations composites.

Pour ce mode distinct, appliquer la migration sur une base neuve, puis définir `NEXT_PUBLIC_DATABASE_MODE=reconstruction` et reconstruire. Les formulaires et requêtes basculent alors vers le schéma yi_*. Le test SQL `supabase/tests/rls.sql` concerne exclusivement ce mode et doit être exécuté sur une base de test jetable avec rollback. Il n'a pas été exécuté ici. La documentation originale de ce mode est archivée dans `docs/RECONSTRUCTION-INITIALE.md` ; elle ne décrit pas les tables legacy.

## Vérification de la livraison raccordée

- Build Next.js de production, y compris vérification TypeScript, réussi.
- Dix tests unitaires : colonnes compatibles avec le schéma fourni, ID et relations, dates séparées, booléens, conservation des valeurs DB, validation de reconstruction et cohérence FR/HE/EN.
- Dashboard réel chargé dans la session existante : 170 prospects, 2 projets, 126 appartements, 4 rendez-vous, 176 suivis et 0 tâche au moment de la vérification.
- Les six listes et six formulaires de création se chargent sans erreur dans le navigateur ; aucun dossier n'a été ajouté, modifié ou supprimé pendant cette vérification.
- Les contraintes, permissions d'écriture, réinitialisation e-mail et cascades réelles restent à tester avec les règles complètes de Supabase.

```sh
pnpm test
pnpm typecheck
pnpm build
```

`tests/local-smoke.mjs` vérifie les pages non configurées (sans variables Supabase au build) ; il ne simule pas l'authentification et ne constitue pas un test d'intégration de la base réelle. Aucun calendrier graphique, automatisme commercial, notification, pièce jointe, export de contacts ou nouvelle permission d'agence n'est supposé depuis l'historique.

## Conditions de paiement

Nouvelle rubrique /fr/payment-terms (FR/HE/EN) : titre, texte libre des conditions/échéancier et projet facultatif, création/édition/suppression. Aucun taux, échéancier ou contrat type n'est inventé. Les fiches sont personnelles au compte connecté ; elles ne sont pas partagées automatiquement avec l'agence.

Activer uniquement avec supabase/migrations/202610070002_payment_terms_legacy.sql sur la base historique. Cette migration ne change aucune ligne existante. Elle crée payment_terms avec RLS par propriétaire ; les projets sélectionnés doivent être visibles par leur RLS existante. Elle bloque la suppression d'un projet encore lié à une fiche. La migration n'a pas été exécutée ici faute d'accès administrateur à Supabase. Ne pas exécuter la migration initiale yi_* sur cette base. L'écran signale clairement l'absence de stockage jusqu'à activation.

### Modèle de paiement tabulaire

La rubrique propose un modèle inspiré de la référence utilisateur : bien/prix, deux lignes à la signature, livraison, six postes de frais, colonnes ₪ et €. Les titres et libellés sont verrouillés. Les montants en shekels sont saisis par l’utilisateur et les euros calculés automatiquement (division par le taux ILS pour 1 EUR, arrondi au centime). /api/exchange-rate lit l’API officielle de la Banque d’Israël sans cache ; rafraîchissement toutes les cinq minutes. La date de publication est affichée (dernier jour publié si aucun taux du jour). Le taux et sa date sont conservés dans la fiche enregistrée ; une fiche existante conserve sa conversion jusqu’à modification. En cas d’indisponibilité, la sauvegarde est bloquée. Aucune règle fiscale ni pourcentage n’est calculé. Le modèle est sauvegardé dans conditions avec un marqueur versionné YI_PAYMENT_TEMPLATE_V1 et du JSON validé : aucune nouvelle migration nécessaire si payment_terms est déjà activée. Les anciennes fiches texte restent lisibles et leur contenu est conservé dans Notes à l'édition. Avant activation, le modèle est consultable et modifiable à l'écran, mais Enregistrer reste désactivé.

Import vérifié le 7 octobre 2026 : Ganei Bereshit, projet Ashdod Gane (id 2), bâtiments A et D, 120 logements depuis le tableau du site Eli Haddad. Statuts canoniques : Disponible (86), Réservé (8), Vendu (26). Références GB-A-1 à GB-A-60 et GB-D-1 à GB-D-60. Prix, surfaces, étages, terrasses et orientations repris du tableau ; liens des plans et détails conservés dans les notes. Les cellules vides restent non renseignées. Il s’agit d’un relevé à cette date, pas d’une synchronisation automatique. Les deux anciens logements de test du projet ont été conservés. Les données importées résident dans Supabase, pas dans ce ZIP.


## Import quotidien des prospects
Import administrateur de fichiers .xlsx (première feuille), CSV, TSV ou TXT : aperçu, contrôle des doublons par e-mail/téléphone, attribution explicite aux comptes actifs et confirmation. Dates sans année : 2026 par défaut, modifiable. Dates absentes : date choisie. Les dates historiques inconnues restent vides ; created_at n'est pas considéré comme la réception. Objectif, délai et commercial du fichier sont conservés dans notes, sans conversion des valeurs canoniques. Les doublons ne remplacent jamais les fiches existantes. Limites : 5 Mo, 5 000 lignes, 50 colonnes, pas de formules Excel. Migration nécessaire : supabase/migrations/202610080002_prospect_import.sql. Les imports sont atomiques et réservés aux administrateurs ; crm_import_batches conserve les compteurs et le fichier source (nom uniquement). Les fichiers eux-mêmes ne sont pas conservés. Aucun prospect du fichier exemple n'est importé automatiquement.

Les inversions évidentes e-mail/téléphone du fichier exemple sont corrigées et signalées dans l’aperçu. Test réel du parseur : 79 lignes reconnues en 2026 ; 45 inversions corrigées. Les dates et les valeurs de pays ne sont pas traduites. Tests transactionnels Supabase : import, répétition, refus d’attribution invalide et isolation de l’historique vérifiés, aucune donnée de test conservée.

## Messagerie interne
Conversations privées entre deux membres et groupe commun à tous les membres actifs. Chaque conversation privée est accessible uniquement à ses participants, sans exception pour les administrateurs. Le répertoire expose uniquement le nom et l’identifiant des membres actifs ; les droits sur les prospects restent inchangés. Messages texte de 4 000 caractères maximum, aucun fichier ni envoi externe. Actualisation toutes les 5 secondes pour la conversation et 10/20 secondes pour la boîte de réception/le compteur ; ce n’est pas une connexion temps réel par WebSocket. Les messages sont rendus comme texte, sans HTML. Comptage des messages non lus hors messages personnels ; lecture marquée uniquement pour la conversation visible et la fenêtre active. Derniers 100 messages puis chargement des précédents par lots, jusqu’à 1 000 dans l’écran. Les anciens messages restent conservés dans la base.
Migration : supabase/migrations/202610090001_messaging.sql, activation à confirmer avant application. Les fonctions d’envoi utilisent RLS ; ni la date, ni l’identifiant du message ne sont fournis par le client. Aucune suppression ou modification de messages n’est proposée.

Vérifications messagerie : compilation et TypeScript réussis, 20 tests passent. Préflight Supabase : séparation des conversations privées, refus d’usurpation de l’expéditeur et de modification des messages, refus d’envoi par un tiers, marquage des non lus, comptes désactivés. Aucun compte, message ou schéma de test n’a été conservé.

## Assistant IA
Interface conversationnelle disponible pour les utilisateurs connectés. Elle utilise par défaut l'offre **gratuite de Groq** (modèle openai/gpt-oss-120b) via une API compatible OpenAI Chat Completions ; l'ancienne intégration OpenAI a été supprimée. Activation : créer une clé gratuite sur https://console.groq.com, ajouter AI_API_KEY dans Vercel côté serveur puis redéployer. AI_MODEL et AI_BASE_URL sont facultatifs (autre modèle ou autre fournisseur compatible, par exemple Gemini ou OpenRouter). Aucune réponse réelle testée sans clé. Chaque requête valide la session et le membre actif ; recherches en lecture seule avec le jeton utilisateur et RLS, sans service_role. Les tables et champs sont limités au schéma CRM. 20 dossiers maximum par recherche avec total exact ; 4 tours de recherche maximum. Aucun accès aux conversations internes. Consentement explicite avant envoi des questions et des dossiers consultés au fournisseur d'IA. L'offre gratuite a des limites de requêtes par minute et par jour ; vérifier les conditions de conservation des données du fournisseur choisi avant d'envoyer des données clients. Historique uniquement en mémoire du navigateur et perdu au changement de page ou déconnexion. Pas encore de voix. Limitation distribuée par compte ajoutée le 10 octobre 2026 ; voir SECURITY.md.

## Renforcement de sécurité
Les protections, migrations et limites vérifiées sont documentées dans [SECURITY.md](SECURITY.md). La connexion au CRM utilise l’e-mail et le mot de passe, sans double authentification.

## Dossier appartements par projet

En mode legacy, les administrateurs disposent du bouton **Ajouter le dossier appartements** dans la fiche de chaque projet enregistré. Le formulaire de création indique de sauvegarder le projet avant de joindre son dossier.

- Pièces jointes : PDF, JPG, PNG et WebP, sélection multiple ou dossier, 30 fichiers par envoi et 20 Mo par fichier. Les fichiers sont enregistrés dans le bucket Supabase privé existant `documents`, sous `projects/<project_id>/<identifiant aléatoire>.<extension>`. La table existante `documents` conserve `project_id`, `created_by`, le nom original, `document_type=project_dossier` et le chemin Storage dans `file_url`. Le téléchargement passe par la session de l’utilisateur. Les règles RLS existantes restent applicables ; aucune migration ou permission supplémentaire n’est appliquée. Un bucket absent ou des droits insuffisants sont signalés ; aucune URL publique n’est créée.
- Import des logements : CSV, TSV, première feuille XLSX sans formules, JSON (liste ou propriété `apartments`), ou tableau PDF texte. Maximum 5 Mo et 1 000 logements ; PDF limité à 50 pages. Le modèle CSV est téléchargeable dans l’interface. Numéro ou référence obligatoire, surfaces en m² et prix en ILS. Les colonnes reconnues sont celles du modèle, avec des alias FR/EN/HE. Les champs non renseignés restent inconnus, notamment parking et cave.
- PDF : extraction locale dans le navigateur avec PDF.js et son worker fourni par l’application, sans service IA externe. Reconnaissance des tableaux à en-têtes et positions de colonnes, notamment le tarif hébreu רשב״ג 37 fourni (19 lots vérifiés). Les scans sans texte, les plans dessinés et les mises en page non reconnues ne sont pas convertis. Chaque aperçu doit être comparé au document original ; une extraction partielle indique le nombre de pages reconnues. Joindre le PDF et importer ses lignes sont deux actions distinctes.
- L’aperçu ne crée aucun logement. Après confirmation, une seule insertion ajoute le lot complet, avec le projet courant et l’auteur connecté. Les ID/propriétaires éventuellement inclus dans le fichier sont ignorés. Contrôle des doublons par numéro ou référence dans le fichier et dans le projet, répété avant insertion. Les logements existants ne sont jamais remplacés. Sans contrainte d’unicité serveur confirmée, deux imports simultanés depuis des sessions différentes peuvent encore entrer en concurrence.

Validation : tests unitaires et extraction du PDF fourni ; parcours navigateur avec Supabase simulé (aperçu, confirmation, association au projet, refus des doublons, envoi de fichier, FR/EN/HE et masquage des actions hors administration). Les écritures et téléchargements sur le Supabase réel doivent être validés avec une session administrateur autorisée. Ce code doit être déployé pour apparaître sur le CRM Vercel.

Téléchargement des pièces du dossier : sur les navigateurs compatibles en HTTPS, « Télécharger » ouvre « Enregistrer sous » avant la requête au stockage. Le message de réussite apparaît seulement après écriture et fermeture du fichier choisi. Une annulation ne télécharge rien. Sur les autres navigateurs, le téléchargement utilise leur dossier configuré et un message renvoie à la liste des téléchargements ; aucun emplacement précis n’est alors promis.

Le bouton **Voir** affiche les pièces du dossier dans une fenêtre du CRM : lecteur PDF intégré au navigateur ou image à sa taille disponible. L’aperçu utilise le téléchargement authentifié existant, sans URL publique, et libère le contenu local à sa fermeture. Les fichiers sélectionnés sur l’ordinateur peuvent aussi être prévisualisés avant enregistrement. Fermer ou appuyer sur Échap ferme la fenêtre. Les navigateurs sans lecteur PDF peuvent utiliser le bouton Télécharger. Validation navigateur sur le build de production avec stockage simulé : ouverture du PDF enregistré, affichage réel d’une image sélectionnée et fermeture par Échap.


## Retrait de la double authentification du CRM

L’interface et les API ne demandent plus de code Authenticator. Appliquer `supabase/migrations/202611040001_remove_mfa.sql` sur chaque base concernée, après les migrations existantes (et après `supabase/saas/001` à `003` si ce mode est activé), puis déployer l’application. Cette migration conserve les comptes, les facteurs Auth existants, les rôles, les membres actifs et les règles d’isolation des agences. Elle est réexécutable. Sans son application, les anciennes règles SQL peuvent encore refuser une session par mot de passe pour un compte déjà inscrit au TOTP. Elle ne modifie pas la double authentification de GitHub, Vercel ou du tableau de bord Supabase.
