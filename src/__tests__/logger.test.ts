'use strict';

describe('logger', () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.resetModules();
  });

  it('is disabled by default', () => {
    delete process.env.TTLOCK_DEBUG;
    delete process.env.TTLOCK_DEBUG_COMM;
    jest.isolateModules(() => {
      const { createLogger } = require("../util/logger");
      const log = createLogger("ttlock:api");
      expect(log.enabled).toBe(false);
    });
  });

  it('respects exact namespace match', () => {
    process.env.TTLOCK_DEBUG = "ttlock:api";
    jest.isolateModules(() => {
      const { createLogger } = require("../util/logger");
      expect(createLogger("ttlock:api").enabled).toBe(true);
      expect(createLogger("ttlock:ble").enabled).toBe(false);
    });
  });

  it('respects wildcard namespace', () => {
    process.env.TTLOCK_DEBUG = "ttlock:*";
    jest.isolateModules(() => {
      const { createLogger } = require("../util/logger");
      expect(createLogger("ttlock:api").enabled).toBe(true);
      expect(createLogger("ttlock:ble").enabled).toBe(true);
      expect(createLogger("other:thing").enabled).toBe(false);
    });
  });

  it('keeps backwards compatibility with TTLOCK_DEBUG_COMM=1', () => {
    delete process.env.TTLOCK_DEBUG;
    process.env.TTLOCK_DEBUG_COMM = "1";
    jest.isolateModules(() => {
      const { createLogger } = require("../util/logger");
      expect(createLogger("ttlock:comm").enabled).toBe(true);
      expect(createLogger("ttlock:api").enabled).toBe(false);
    });
  });
});
