'use strict';

process.env.TTLOCK_IGNORE_CRC = '1';
process.env.TTLOCK_DEBUG = 'ttlock:api,ttlock:command';

const { TTLockClient, LogOperateNames } = require('../dist');
const settingsFile = 'lockData.json';

// Bornes de la probe (modifiables via env vars)
const PROBE_START = parseInt(process.env.PROBE_START || '4017', 10);
const PROBE_END = parseInt(process.env.PROBE_END || '4500', 10);

async function doStuff() {
  const lockData = await require('./common/loadData')(settingsFile);
  const options = require('./common/options')(lockData);

  const client = new TTLockClient(options);
  await client.prepareBTService();
  client.startScanLock();
  console.log(`Scan started. Probing sequences ${PROBE_START}..${PROBE_END}`);
  let done = false;

  client.on('foundLock', async (lock) => {
    if (done) return;
    if (!lock.isInitialized() || !lock.isPaired()) return;
    done = true;

    try {
      await lock.connect();
      console.log('[debug] hasNewEvents:', lock.hasNewEvents());

      let consecutiveEmpty = 0;
      let foundRecords = 0;
      const found = [];

      for (let seq = PROBE_START; seq <= PROBE_END; seq++) {
        const r = await lock.probeOperationLog(seq);
        if (!r) {
          console.log(`seq=${seq} -> NULL (not connected or auth failed)`);
          break;
        }
        const dataLen = r.data ? r.data.length : 0;
        const tag = dataLen === 0 ? 'empty' : `records=${dataLen}`;
        console.log(`seq=${seq} -> nextSeq=${r.sequence} ${tag}`);

        if (dataLen > 0) {
          consecutiveEmpty = 0;
          for (const entry of r.data) {
            foundRecords++;
            const name = LogOperateNames[entry.recordType] ?? `Unknown(${entry.recordType})`;
            console.log(`   rec#${entry.recordNumber} type=${entry.recordType} (${name}) date=${entry.operateDate}`);
            found.push({ probedSeq: seq, ...entry, recordTypeName: name });
          }
        } else {
          consecutiveEmpty++;
        }

        // Arrêt anticipé si 30 réponses vides consécutives
        if (consecutiveEmpty >= 30) {
          console.log(`Stopping early after ${consecutiveEmpty} consecutive empty responses`);
          break;
        }
      }

      await lock.disconnect();

      console.log('');
      console.log(`=== Probe complete ===`);
      console.log(`Range: ${PROBE_START}..${PROBE_END}`);
      console.log(`Records found: ${foundRecords}`);
      if (found.length > 0) {
        console.log('--- Records ---');
        console.log(JSON.stringify(found, null, 2));
      }
    } catch (err) {
      console.error('[error]', err);
    }
    process.exit(0);
  });
}

doStuff();
