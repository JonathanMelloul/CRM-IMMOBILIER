# Inviter l’administrateur d’une agence

Dans `/fr/platform` (ou `/he/platform`, `/en/platform`), chaque agence disposant d’un accès actif propose un formulaire **Inviter l’administrateur**. Renseigner son nom et son adresse e-mail existante. Le compte invité est rattaché à cette agence avec le rôle `admin`, jamais au rôle plateforme.

## Configuration du déploiement SaaS

- `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` doivent appartenir au projet Supabase SaaS voulu.
- Définir `SUPABASE_SERVICE_ROLE_KEY` dans les variables Vercel **côté serveur**, pour ce même projet Supabase. Ne jamais préfixer cette variable avec `NEXT_PUBLIC_`, ni copier sa valeur dans Git ou une conversation. Redéployer après modification.
- `CRM_SITE_URL` est facultatif : l’origine par défaut est `https://crm-saas-test.vercel.app`. Pour un autre site, configurer son origine HTTPS explicite ; le serveur n’utilise pas les en-têtes du navigateur pour construire le lien.
- Dans Supabase → Authentication → URL Configuration, autoriser les retours exacts `https://crm-saas-test.vercel.app/fr`, `/he` et `/en` (ou leurs équivalents pour l’origine configurée).
- Vérifier le service e-mail/SMTP Supabase. Un SMTP autorisant les destinataires externes est nécessaire pour inviter les agences clientes ; les restrictions et quotas du fournisseur restent applicables.
- Le projet SaaS doit déjà exposer `crm_saas_context`, `crm_take_platform_invite_quota` et `crm_register_invited_member`. Les migrations historiques ne doivent pas être exécutées automatiquement sur une autre base pour résoudre une erreur.

## Contrôles

Le serveur vérifie le jeton, la MFA requise, le rôle plateforme, l’accès actif de l’agence, le format du formulaire et le quota avant l’invitation. Il refuse une adresse déjà rattachée à une agence et ne déplace aucun utilisateur existant. Le rattachement passe par la fonction SQL transactionnelle `crm_register_invited_member`, qui revalide le rôle et l’agence.

Supabase envoie l’e-mail avant le rattachement SQL : ces deux opérations ne constituent pas une transaction unique. Si le rattachement échoue, l’interface l’indique et bloque la répétition du formulaire courant. Vérifier le compte dans Supabase et réparer son rattachement avant tout nouvel envoi ; le code ne supprime pas automatiquement un utilisateur Auth. Un résultat réseau inconnu doit également être vérifié avant répétition.

Le lien reçu permet de choisir son mot de passe avec le parcours d’invitation existant du CRM. Ce formulaire plateforme invite uniquement l’administrateur de l’agence.

## Validation

`node --test tests/platform-invitations.test.mjs` vérifie les refus d’accès, MFA, état de l’agence, doublons, quotas, paramètres de rattachement, redirection et échecs partiels avec des doubles. Aucun e-mail réel n’est envoyé par ces tests. L’envoi réel, la réception, le choix du mot de passe et l’isolation des données doivent être validés avec un destinataire autorisé sur le déploiement SaaS configuré.
