'use strict';

const { TTLockClient } = require('../dist');
const settingsFile = 'lockData.json';

async function doStuff() {
  let lockData = await require('./common/loadData')(settingsFile);
  let options = require('./common/options')(lockData);

  const client = new TTLockClient(options);
  await client.prepareBTService();
  client.startScanLock();
  console.log('Scan started');
  client.on('foundLock', async (lock) => {
    if (lock.isInitialized() && lock.isPaired()) {
      await lock.connect();

      // Lire l'heure actuelle de la serrure
      const lockTime = await lock.getLockTime();
      const now = new Date();
      console.log('Heure serrure (avant sync):', lockTime.toLocaleString('fr-FR'));
      console.log('Heure système             :', now.toLocaleString('fr-FR'));
      console.log('Écart (secondes)          :', Math.round((now.getTime() - lockTime.getTime()) / 1000));

      // Synchroniser l'heure de la serrure sur l'heure système
      const ok = await lock.setLockTime();
      console.log('Synchronisation:', ok ? '✅ OK' : '❌ Échec');

      if (ok) {
        const lockTimeAfter = await lock.getLockTime();
        console.log('Heure serrure (après sync):', lockTimeAfter.toLocaleString('fr-FR'));
      }

      await lock.disconnect();
      process.exit(0);
    }
  });
}

doStuff();
