'use strict';

const { TTLockClient, LogOperateNames } = require('../dist');
const settingsFile = 'lockData.json';

async function doStuff() {
  let lockData = await require('./common/loadData')(settingsFile);
  let options = require('./common/options')(lockData);

  const client = new TTLockClient(options);
  await client.prepareBTService();
  client.startScanLock();
  console.log('Scan started');
  let done = false;
  client.on('foundLock', async (lock) => {
    if (done) return;

    if (lock.isInitialized() && lock.isPaired()) {
      done = true;
      await lock.connect();
      console.log('Trying to get Operations Log');
      const results = structuredClone(await lock.getOperationLog(true, false));
      await lock.disconnect();

      // Filter out null/undefined entries and add human-readable name
      const entries = results.filter(Boolean).map((entry) => ({
        ...entry,
        recordTypeName: LogOperateNames[entry.recordType] ?? `Unknown(${entry.recordType})`
      }));

      console.log(`Retrieved ${entries.length} operation log entries`);
      console.log(entries);

      await require('./common/saveData')(settingsFile, client.getLockData());

      process.exit(0);
    }
  });
}

doStuff();
