# Source des fonctionnalités communes

Les fonctionnalités communes sont maintenant développées dans
[CRM-AGENCE](https://github.com/JonathanMelloul/CRM-AGENCE), branche `main`.
Le CRM reçoit les versions testées via le workflow du SaaS.

La configuration et les limites de la synchronisation sont décrites dans
[la documentation du SaaS](https://github.com/JonathanMelloul/CRM-AGENCE/blob/main/docs/FEATURE-SYNC.md).

Le fichier `.feature-sync/state.json` identifie le commit source et les empreintes
des fichiers gérés. Les modifications directes de ces fichiers dans ce dépôt
bloquent une synchronisation ultérieure si elles divergent du SaaS : faire les
changements communs dans CRM-AGENCE.

Les secrets, bases de données, migrations SQL et paramètres de déploiement restent
propres à chaque installation. Les API d'invitation et d'IA explicitement exclues
conservent leurs contrats propres. Un changement de schéma nécessite une migration
séparée et validée ; aucun workflow ne modifie les données clients.
