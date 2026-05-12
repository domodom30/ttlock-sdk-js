'use strict';

const { TTLockClient } = require('../dist');
const settingsFile = 'lockData.json';

// Usage:
//   node ./examples/setErasePasscode.js 999000       -> programme 999000 comme code d'effacement
//
// Utilise COMM_SET_DELETE_PWD (0x44). Programme un "erase passcode" qui, tapé sur le clavier
// physique de la serrure, déclenche un reset usine. À tester quand toutes les commandes
// admin-write classiques sont bloquées par le firmware (0x14) — cette commande passe par un
// canal BLE distinct et peut réussir là où setAdminKeyboardPwd / addPassCode échouent.
//
// IMPORTANT: ce code reste effectif tant que la serrure n'est pas réinitialisée. Choisis un code
// que tu n'utiliseras pas par accident, et garde-le secret.

async function doStuff() {
  let lockData = await require('./common/loadData')(settingsFile);
  let options = require('./common/options')(lockData);

  const passcodeArg = process.argv[2];
  if (!passcodeArg || !/^\d{4,9}$/.test(passcodeArg)) {
    console.error('Usage: node setErasePasscode.js <4-9 chiffres>');
    console.error('Exemple: node setErasePasscode.js 999000');
    process.exit(1);
  }

  const client = new TTLockClient(options);
  await client.prepareBTService();
  client.startScanLock();
  console.log('Scan started');

  client.on('foundLock', async (lock) => {
    if (lock.isInitialized() && lock.isPaired()) {
      await lock.connect();
      console.log('Trying to set erase passcode:', passcodeArg);

      const result = await lock.setErasePasscode(passcodeArg);
      if (result) {
        console.log('OK - Erase passcode programmé:', result);
        console.log('Tape ce code sur le clavier de la serrure pour déclencher un reset usine.');
        console.log('NOTE: garde ce code secret, il efface la serrure quand il est saisi.');
      } else {
        console.error('Échec de la programmation.');
      }

      await lock.disconnect();
      process.exit(result ? 0 : 1);
    }
  });
}

doStuff();
