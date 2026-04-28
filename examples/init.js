'use strict';

const { TTLockClient, sleep } = require('../dist');
const settingsFile = 'lockData.json';

async function doStuff() {
  let lockData = await require('./common/loadData')(settingsFile);
  let options = require('./common/options')(lockData);

  const client = new TTLockClient(options);
  await client.prepareBTService();

  client.startScanLock();
  console.log('Scan started');
  client.on('foundLock', async (lock) => {
    console.log(lock.toJSON());
    console.log();

    if (!lock.isInitialized()) {
      // stopScanning is sent first, but the ESP32 NimBLE scan may still be
      // stopping when the connect command arrives. Retry with a delay to let
      // the BLE radio settle after the first (racy) attempt.
      let connected = false;
      for (let attempt = 1; attempt <= 5; attempt++) {
        console.log(`Connect attempt ${attempt}/5`);
        connected = await lock.connect();
        if (connected) break;
        console.log(`Attempt ${attempt} failed, waiting 3s before retry...`);
        await sleep(3000);
      }

      if (!connected) {
        console.error('Could not connect after 5 attempts. Try power-cycling the ESP32.');
        process.exit(1);
      }

      console.log('Trying to init the lock');
      console.log();
      try {
        await lock.initLock();
        await lock.disconnect();
        await require('./common/saveData')(settingsFile, client.getLockData());
        console.log('Lock initialized and data saved to', settingsFile);
        process.exit(0);
      } catch (error) {
        console.error('Init failed:', error.message);
        await lock.disconnect();
        process.exit(1);
      }
    }
  });
}

doStuff();
