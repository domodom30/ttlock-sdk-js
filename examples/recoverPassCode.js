'use strict';

const { TTLockClient } = require('../dist');
const settingsFile = 'lockData.json';

// Usage:
//   node ./examples/recoverPassCode.js                 -> code par défaut 11061981
//   node ./examples/recoverPassCode.js 123456          -> code explicite (4-9 chiffres)
//
// Utilise PwdOperateType.RECOVERY=6 (commande BLE COMM_MANAGE_KEYBOARD_PASSWORD avec opType=6).
// À tester en dernier recours quand addPassCode renvoie 0x14 (KEYBOARD_LOCKED) — recover peut
// passer là où add est rejeté si le firmware bloque seulement la création de nouveaux slots
// mais accepte la restauration d'un slot existant.

async function doStuff() {
  let lockData = await require('./common/loadData')(settingsFile);
  let options = require('./common/options')(lockData);

  const passcodeArg = process.argv[2] || '11061981';
  if (!/^\d{4,9}$/.test(passcodeArg)) {
    console.error('Le passcode doit être 4 à 9 chiffres.');
    process.exit(1);
  }

  const client = new TTLockClient(options);
  await client.prepareBTService();
  client.startScanLock();
  console.log('Scan started');

  client.on('foundLock', async (lock) => {
    if (lock.isInitialized() && lock.isPaired()) {
      await lock.connect();
      console.log('Trying to recover passcode', passcodeArg);

      const result = await lock.recoverPassCode(1, passcodeArg, '202001010000', '209912312359');
      if (result) {
        console.log('OK - Passcode récupéré:', passcodeArg);
      } else {
        console.error('Échec de la récupération.');
        if (lock.lastPasscodeError) {
          console.error('  →', lock.lastPasscodeError.message);
        }
      }

      await lock.disconnect();
      process.exit(result ? 0 : 1);
    }
  });
}

doStuff();
