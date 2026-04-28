'use strict';

const { TTLockClient } = require('../dist');
const { UnlockDirection } = require('../dist/api/Commands/UnlockDirectionCommand');
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

    if (lock.isInitialized() && lock.isPaired()) {
      await lock.connect();

      try {
        const current = await lock.getUnlockDirection();
        console.log('Current unlock direction:', UnlockDirection[current], `(${current})`);

        // Uncomment to set a new direction:
        // const result = await lock.setUnlockDirection(UnlockDirection.CLOCKWISE);
        // console.log("Set result:", result);
      } catch (error) {
        console.error('Error:', error.message);
      }

      await lock.disconnect();
      process.exit(0);
    }
  });
}

doStuff();
