## Copilot / agent instructions — ttlock-sdk-js

But rapide : aider un agent à être productif immédiatement dans ce repo Node/TypeScript qui fournit un SDK BLE pour serrures TTLock.

- Entrée principale : `src/` contient l'implémentation TypeScript. Le paquet compilé sort dans `dist/` (voir `package.json` -> `main`/`types`).
- Points d'extension importants : `src/scanner/ScannerInterface.ts` — implémente l'abstraction pour le backend BLE. Par défaut le projet utilise `@abandonware/noble` (voir dépendances).
- Commandes/Protocol : `src/api/` contient les classes de commandes (`Command.ts`, `commandBuilder.ts` et `Commands/`), c'est le cœur du protocole V3 employé par les serrures.
- Crypto / clé AES : utilitaires dans `src/util/AESUtil.ts` et `src/util/CodecUtils.ts` — recherchez ces fichiers si vous modifiez l'authentification ou le gateway AES.

Flux de travail développeur (découvert dans `package.json` et `README.md`)

- Build & run examples : la plupart des scripts npm exécutent d'abord la compilation puis lancent `node ./examples/<name>.js`. Exemple : `npm run init` (compile puis `examples/init.js`).
- Fichier de données : `lockData.json` (à la racine) est généré par `npm run init` et utilisé par les exemples pour retrouver les identifiants de la serrure.
- Outils / serveur gateway : `tools/server.js` et `tools/debug.js` exposent une option websocket pour piloter un adaptateur BLE distant. Activez par variables d'environnement (voir plus bas).

Variables d'environnement utiles (exactement observées dans repo)

- WEBSOCKET_ENABLE=1, WEBSOCKET_HOST, WEBSOCKET_PORT, WEBSOCKET_DEBUG=1 — active le mode gateway websocket (ex. `tools/server.js`).
- NOBLE_REPORT_ALL_HCI_EVENTS=1 — option de debug pour `@abandonware/noble` (utilisé dans `package.json` scripts `debug-tool` / `server-tool`).
- TTLOCK_IGNORE_CRC=1, TTLOCK_DEBUG_COMM=1 — options de debug propres au SDK (voir README/implémentation des réceptions CRC).

Pièges et conventions spécifiques au projet

- Les scripts npm utilisent `rm -rf ./dist && tsc` (shell style Unix). Sur Windows PowerShell, `rm -rf` peut ne pas fonctionner tel quel — exécutez dans WSL ou adaptez le script (`rd /s /q dist` ou utilisez cross-clean). C'est une contrainte pratique détectable dans `package.json`.
- Le SDK est orienté Node (main -> `dist/index.js`) et suppose l'accès à un adaptateur Bluetooth compatible avec `@abandonware/noble`. Consultez le README pour exigences natives et permissions (sudo/root sous Linux, pilotes sur Windows).
- Aucune suite de tests automatisée trouvée dans le repo; les exemples JS servent de vérification manuelle. Les agents doivent se baser sur `npm run <example>` pour vérification rapide.

Exemples concrets à utiliser dans les modifications

- Pour implémenter ou remplacer le backend BLE : modifier/implémenter `src/scanner/ScannerInterface.ts` et les adaptateurs sous `src/scanner/` (le code actuel est écrit pour noble).
- Pour ajouter une commande au protocole : ajouter une classe dans `src/api/Commands/` et inscrire sa logique dans `commandBuilder.ts` si nécessaire.
- Pour modifier le stockage des credentials : `common/loadData.js` / `common/saveData.js` et le fichier `lockData.json` sont les points à toucher.

Vérifications rapides que l'agent peut faire localement

1. `npm i` pour installer les dépendances.
2. `npm run build` — compile TypeScript en `dist/`. Note: si l'OS est Windows et `rm -rf` échoue, recommander WSL ou modifier le script.
3. `npm run init` (après build) — génère `lockData.json` si une serrure est accessible; c'est le moyen le plus direct de vérifier le pipeline end-to-end.

Fichiers clés à lire en priorité

- `package.json` — scripts et dépendances (compilation, exemples, outils).
- `README.md` — flux opérationnel, variables d'env et limitations (noble, gateway).
- `src/scanner/ScannerInterface.ts` et `src/scanner/noble/` — pour tout ce qui concerne BLE.
- `src/api/` et `src/util/` — logique de protocole, CRC, AES, encodages.

Si tu modifes le protocole ou la crypto

- Valide les messages avec les utilitaires de `src/util/*` et teste via `examples/` (par ex. `npm run get-operations` ou `npm run listen`).

Notes finales

- Conserver le pattern : build (tsc) -> exécuter examples/tools sur Node. Eviter de supposer une suite de tests.
- Demande de feedback : si certaines sections sont incomplètes (p.ex. mapping exact des classes d'API aux commandes BLE), indique quelle partie tu veux que j'explore en détail et j'ajouterai des exemples précis.
