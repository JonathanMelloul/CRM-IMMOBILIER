# Prospects par mois

La liste Prospects propose des boutons mois/année, un choix libre de mois (y compris un mois futur), Tous les mois et Date à vérifier. Le classement utilise uniquement `received_on`, sans remplacer une date inconnue par `created_at`. Les filtres de recherche et de dates restent actifs. Changer de mois efface la sélection de suppression.

La colonne Projet affiche le projet lié dans le CRM. Sans lien, elle affiche le libellé source conservé dans les notes sous `Projet du fichier: …`. Ce libellé ne crée pas de projet ni de relation en base. Les droits et le périmètre des dossiers accessibles restent ceux de Supabase.

## Extraire un classeur attribué à Jonathan

Depuis la racine du dépôt, avec Node.js 24 et les dépendances installées :

```sh
node scripts/extract-assigned-leads.mjs /chemin/source.xlsx /chemin/prive/Prospects-Jonathan.xlsx 2026
```

L'année est explicite pour les dates françaises sans année. Le script lit tous les onglets et sélectionne la colonne commercial/responsable, jamais une occurrence du nom dans un commentaire ou le nom du prospect. Variantes reconnues : Jonathan, Yonathan, יונתן et יהונתן, sans distinction de casse. Les onglets doivent avoir un en-tête de responsable ; une structure inconnue déclenche une erreur.

Le résultat contient toutes les lignes sélectionnées, une feuille par mois, une synthèse et les onglets/lignes d'origine. JLM, Ashdod et Tsfat sont conservés comme libellés de campagne. Les commentaires, statuts sources, objectifs, délais et coordonnées sont conservés. Les liens et textes enrichis Excel sont lus comme texte ; aucune formule n'est exécutée. Seuls les numéros internationaux enregistrés par Excel comme formule littérale `+chiffres`, avec résultat numérique identique, sont acceptés.

Les coordonnées répétées sont signalées sans suppression de lignes. Une date absente est exportée comme `Date à vérifier` afin d'empêcher l'importeur de lui attribuer automatiquement la date de remplacement. Garder les fichiers contenant les prospects hors des sources et du répertoire public.

## Importer dans le CRM

Configurer Supabase et utiliser une session administrateur autorisée. Dans Administration, importer le classeur extrait (première feuille), puis choisir explicitement le membre Jonathan pour le libellé Yonathan. Vérifier l'aperçu : projet, commentaire, doublons et dates. Le script d'extraction ne contacte jamais la base.

L'importeur utilise la fonction atomique existante `crm_import_prospects` : les colonnes supplémentaires projet, commentaire, onglet, ligne et statut source sont conservées dans les notes, sans nouvelle migration. Le statut CRM reste celui de l'import existant ; le statut du fichier est conservé séparément en note. La colonne Projet de la liste lit le libellé source en l'absence d'un projet lié.

Les doublons déjà en base ou dans le fichier sont ignorés par l'import existant ; leurs commentaires ne sont pas fusionnés dans les fiches existantes. Le classeur extrait conserve toutes ces informations pour contrôle. Les lignes sans date doivent être vérifiées avant import et restent dans le classeur. Aucune écriture, migration ou publication n'est déclenchée par l'extraction ou par la navigation mensuelle.

## Validation

`pnpm test`, `pnpm build` et `pnpm typecheck`. Les tests couvrent les années distinctes, dates inconnues, changements de fuseau, formats Excel, sélection par responsable et conservation des commentaires dans la charge utile d'import. La vérification navigateur avec Supabase simulé doit être distinguée d'un import dans la base réelle.

## Statut et commentaire

Si le statut enregistré est encore le défaut d’import Nouveau (ou vide), les listes, l’administration et la fiche affichent le statut source exact conservé dans les notes. Les autres statuts CRM restent prioritaires. Le formulaire de fiche propose le statut affiché ; une modification explicite, y compris Nouveau, est conservée. Aucun statut source absent n’est inventé.

La colonne Commentaire permet de modifier, annuler, enregistrer ou vider le commentaire sans quitter la liste. Le texte courant est également proposé dans le formulaire de fiche. Les métadonnées et le commentaire d’origine sont conservés dans les notes. Une mise à jour en ligne vérifie que les notes n’ont pas changé depuis le chargement pour éviter d’écraser une modification concurrente ; en cas de refus, le brouillon reste visible. Les droits Supabase existants restent applicables.

Les boutons 📞 et 💬 à côté du numéro ouvrent respectivement l’appel et WhatsApp Web. Le message reste à rédiger et à envoyer par l’utilisateur.
