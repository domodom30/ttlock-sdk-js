'use strict';

const { TTLockClient, sleep, PassageModeType } = require('../dist');
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
      console.log('Trying to add passcode');

      await lock.addPassCode(1, '11061981', '202001010000', '209912312359');
      await lock.disconnect();

      process.exit(0);
    }
  });
}

doStuff();
