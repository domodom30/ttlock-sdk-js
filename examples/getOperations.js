'use strict';

process.env.TTLOCK_IGNORE_CRC = '1'; // tolère les CRC corrompus (signal faible)

const { inspect } = require('node:util');
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
      try {
        await lock.connect();

        // Debug: état de la serrure avant la requête
        console.log('[debug] hasNewEvents:', lock.hasNewEvents());

        console.log('Trying to get Operations Log');
        const results = await lock.getOperationLog(true, false);
        await lock.disconnect();

        // Filter out null/undefined entries and add human-readable name
        const entries = results.filter(Boolean).map((entry) => ({
          ...entry,
          recordTypeName: LogOperateNames[entry.recordType] ?? `Unknown(${entry.recordType})`
        }));

        console.log(`Retrieved ${entries.length} operation log entries`);
        console.log(inspect(entries, { depth: null, maxArrayLength: null, colors: true }));

        await require('./common/saveData')(settingsFile, client.getLockData());
      } catch (err) {
        console.error('[error] Uncaught exception in foundLock handler:', err);
      }
      process.exit(0);
    }
  });
}

doStuff();
