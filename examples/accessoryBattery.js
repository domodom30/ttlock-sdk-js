'use strict';

const { TTLockClient } = require('../dist');
const { AccessoryType } = require('../dist/api/Commands/AccessoryBatteryCommand');
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
        // Query the battery level of a door sensor (change AccessoryType as needed)
        const level = await lock.getAccessoryBatteryLevel(AccessoryType.DOOR_SENSOR);
        console.log('Door sensor battery level:', level, '%');
      } catch (error) {
        console.error('Error:', error.message);
      }

      await lock.disconnect();
      process.exit(0);
    }
  });
}

doStuff();
