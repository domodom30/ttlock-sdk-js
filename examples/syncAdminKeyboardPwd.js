'use strict';

const { TTLockClient } = require('../dist');
const settingsFile = 'lockData.json';

// Usage:
//   node ./examples/syncAdminKeyboardPwd.js            -> code aléatoire (7 chiffres)
//   node ./examples/syncAdminKeyboardPwd.js 12345678   -> code explicite (4-9 chiffres)
//
// Cet exemple resynchronise le passcode admin du clavier physique avec une
// valeur connue côté SDK. Ne touche pas au pairing BLE ni à lockData.json.

async function doStuff() {
  let lockData = await require('./common/loadData')(settingsFile);
  let options = require('./common/options')(lockData);

  const passcodeArg = process.argv[2];
  if (passcodeArg && !/^\d{4,9}$/.test(passcodeArg)) {
    console.error('Le passcode doit être 4 à 9 chiffres (ou omis pour génération aléatoire).');
    process.exit(1);
  }

  const client = new TTLockClient(options);
  await client.prepareBTService();
  client.startScanLock();
  console.log('Scan started');

  client.on('foundLock', async (lock) => {
    if (lock.isInitialized() && lock.isPaired()) {
      await lock.connect();
      console.log('Trying to sync admin keyboard passcode');

      const result = await lock.syncAdminKeyboardPasscode(passcodeArg);
      if (result) {
        console.log('OK - Nouveau passcode admin clavier:', result);
        console.log('IMPORTANT: ce code remplace ton ancien admin physique.');
        console.log('Note-le si tu veux pouvoir l\'utiliser sur le clavier.');
      } else {
        console.error('Echec de la synchronisation.');
      }

      await lock.disconnect();
      process.exit(result ? 0 : 1);
    }
  });
}

doStuff();
