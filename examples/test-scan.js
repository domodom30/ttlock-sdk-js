'use strict';
const noble = require('@abandonware/noble');

noble.on('stateChange', (state) => {
  console.log('Adaptateur BT état:', state);
  if (state === 'poweredOn') {
    console.log('Scan démarré (10s)...');
    noble.startScanning([], true); // pas de filtre UUID - tout voir
  }
});

noble.on('discover', (p) => {
  const name = p.advertisement.localName || '(sans nom)';
  const services = p.advertisement.serviceUuids || [];
  console.log(`[${p.address}] ${name} RSSI:${p.rssi} services:[${services.join(',')}]`);
});

setTimeout(() => {
  noble.stopScanning();
  console.log('Scan terminé.');
  process.exit(0);
}, 10000);
