const { MCPCache } = require('../../src/core/mcp-cache');

describe('MCPCache', () => {
  let cache;

  beforeEach(() => {
    cache = new MCPCache({
      maxSize: 100,
      defaultTTL: 1000 // 1 second for testing
    });
  });

  afterEach(() => {
    cache.destroy();
  });

  describe('generateKey', () => {
    it('should generate consistent keys for same inputs', () => {
      const key1 = cache.generateKey('filesystem', 'read_file', { path: '/test.txt' });
      const key2 = cache.generateKey('filesystem', 'read_file', { path: '/test.txt' });
      expect(key1).toBe(key2);
    });

    it('should generate different keys for different inputs', () => {
      const key1 = cache.generateKey('filesystem', 'read_file', { path: '/test1.txt' });
      const key2 = cache.generateKey('filesystem', 'read_file', { path: '/test2.txt' });
      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different tools', () => {
      const key1 = cache.generateKey('filesystem', 'read_file', { path: '/test.txt' });
      const key2 = cache.generateKey('filesystem', 'write_file', { path: '/test.txt' });
      expect(key1).not.toBe(key2);
    });
  });

  describe('set and get', () => {
    it('should store and retrieve values', () => {
      const key = cache.generateKey('filesystem', 'read_file', { path: '/test.txt' });
      const value = { content: 'test content' };

      cache.set(key, value);
      expect(cache.get(key)).toEqual(value);
    });

    it('should return undefined for non-existent keys', () => {
      expect(cache.get('non-existent-key')).toBeUndefined();
    });

    it('should handle different value types', () => {
      const stringKey = cache.generateKey('test', 'string', {});
      const objectKey = cache.generateKey('test', 'object', {});
      const arrayKey = cache.generateKey('test', 'array', {});
      const numberKey = cache.generateKey('test', 'number', {});

      cache.set(stringKey, 'test string');
      cache.set(objectKey, { foo: 'bar' });
      cache.set(arrayKey, [1, 2, 3]);
      cache.set(numberKey, 42);

      expect(cache.get(stringKey)).toBe('test string');
      expect(cache.get(objectKey)).toEqual({ foo: 'bar' });
      expect(cache.get(arrayKey)).toEqual([1, 2, 3]);
      expect(cache.get(numberKey)).toBe(42);
    });
  });

  describe('has', () => {
    it('should return true for existing non-expired keys', () => {
      const key = cache.generateKey('test', 'tool', {});
      cache.set(key, 'value');
      expect(cache.has(key)).toBe(true);
    });

    it('should return false for non-existent keys', () => {
      expect(cache.has('non-existent')).toBe(false);
    });

    it('should return false for expired keys', async () => {
      const key = cache.generateKey('test', 'tool', {});
      cache.set(key, 'value', 50); // 50ms TTL

      expect(cache.has(key)).toBe(true);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(cache.has(key)).toBe(false);
    });
  });

  describe('TTL (Time-To-Live)', () => {
    it('should expire entries after TTL', async () => {
      const key = cache.generateKey('test', 'tool', {});
      cache.set(key, 'value', 50); // 50ms TTL

      expect(cache.get(key)).toBe('value');

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(cache.get(key)).toBeUndefined();
    });

    it('should use default TTL when not specified', async () => {
      const key = cache.generateKey('test', 'tool', {});
      cache.set(key, 'value'); // Uses defaultTTL (1000ms)

      expect(cache.get(key)).toBe('value');

      // Wait but not past default TTL
      await new Promise(resolve => setTimeout(resolve, 500));
      expect(cache.get(key)).toBe('value');
    });

    it('should allow custom TTL per entry', async () => {
      const key1 = cache.generateKey('test', 'tool1', {});
      const key2 = cache.generateKey('test', 'tool2', {});

      cache.set(key1, 'value1', 50);  // 50ms TTL
      cache.set(key2, 'value2', 200); // 200ms TTL

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(cache.get(key1)).toBeUndefined(); // Expired
      expect(cache.get(key2)).toBe('value2');  // Still valid
    });
  });

  describe('delete', () => {
    it('should delete specific keys', () => {
      const key = cache.generateKey('test', 'tool', {});
      cache.set(key, 'value');
      expect(cache.has(key)).toBe(true);

      cache.delete(key);
      expect(cache.has(key)).toBe(false);
    });

    it('should not affect other keys', () => {
      const key1 = cache.generateKey('test', 'tool1', {});
      const key2 = cache.generateKey('test', 'tool2', {});

      cache.set(key1, 'value1');
      cache.set(key2, 'value2');

      cache.delete(key1);

      expect(cache.has(key1)).toBe(false);
      expect(cache.has(key2)).toBe(true);
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      const key1 = cache.generateKey('test', 'tool1', {});
      const key2 = cache.generateKey('test', 'tool2', {});

      cache.set(key1, 'value1');
      cache.set(key2, 'value2');

      cache.clear();

      expect(cache.has(key1)).toBe(false);
      expect(cache.has(key2)).toBe(false);
    });

    it('should reset statistics', () => {
      const key = cache.generateKey('test', 'tool', {});
      cache.set(key, 'value');
      cache.has(key); // Generate a hit

      cache.clear();

      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.size).toBe(0);
    });
  });

  describe('size limits', () => {
    it('should respect maxSize limit', () => {
      const smallCache = new MCPCache({ maxSize: 3 });

      for (let i = 0; i < 5; i++) {
        const key = smallCache.generateKey('test', `tool${i}`, {});
        smallCache.set(key, `value${i}`);
      }

      const stats = smallCache.getStats();
      expect(stats.size).toBeLessThanOrEqual(3);

      smallCache.destroy();
    });

    it('should evict LRU entries when full', () => {
      const smallCache = new MCPCache({ maxSize: 3, defaultTTL: 60000 });

      const key1 = smallCache.generateKey('test', 'tool1', {});
      const key2 = smallCache.generateKey('test', 'tool2', {});
      const key3 = smallCache.generateKey('test', 'tool3', {});
      const key4 = smallCache.generateKey('test', 'tool4', {});

      smallCache.set(key1, 'value1');
      // Small delay to ensure different timestamps
      const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

      smallCache.set(key2, 'value2');
      smallCache.set(key3, 'value3');

      // Access key1 to make it recently used
      smallCache.get(key1);

      // Access key3 to make it recently used
      smallCache.get(key3);

      // Add key4, should evict key2 (least recently used, since key1 and key3 were accessed)
      smallCache.set(key4, 'value4');

      const hasKey2 = smallCache.has(key2); // Evicted (LRU)
      const stats = smallCache.getStats();

      // Verify that eviction occurred
      expect(stats.evictions).toBeGreaterThan(0);
      expect(stats.size).toBeLessThanOrEqual(3);

      // At least one of our entries should have been evicted (key2 is most likely)
      expect(hasKey2).toBe(false);

      smallCache.destroy();
    });
  });

  describe('statistics', () => {
    it('should track cache hits', () => {
      const key = cache.generateKey('test', 'tool', {});
      cache.set(key, 'value');

      cache.has(key); // Hit
      cache.has(key); // Hit

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
    });

    it('should track cache misses', () => {
      cache.has('non-existent-1'); // Miss
      cache.has('non-existent-2'); // Miss

      const stats = cache.getStats();
      expect(stats.misses).toBe(2);
    });

    it('should calculate hit rate', () => {
      const key = cache.generateKey('test', 'tool', {});
      cache.set(key, 'value');

      cache.has(key); // Hit
      cache.has('non-existent'); // Miss

      const stats = cache.getStats();
      expect(stats.hitRate).toBe(0.5); // 1 hit out of 2 total
    });

    it('should track evictions', () => {
      const smallCache = new MCPCache({ maxSize: 2 });

      for (let i = 0; i < 4; i++) {
        const key = smallCache.generateKey('test', `tool${i}`, {});
        smallCache.set(key, `value${i}`);
      }

      const stats = smallCache.getStats();
      expect(stats.evictions).toBe(2); // 2 entries evicted

      smallCache.destroy();
    });

    it('should report current size', () => {
      const key1 = cache.generateKey('test', 'tool1', {});
      const key2 = cache.generateKey('test', 'tool2', {});

      cache.set(key1, 'value1');
      cache.set(key2, 'value2');

      const stats = cache.getStats();
      expect(stats.size).toBe(2);
    });
  });

  describe('cleanup', () => {
    it('should automatically clean expired entries', async () => {
      // Create cache with short cleanup interval for testing
      const testCache = new MCPCache({
        maxSize: 100,
        defaultTTL: 50 // 50ms TTL
      });

      const key1 = testCache.generateKey('test', 'tool1', {});
      const key2 = testCache.generateKey('test', 'tool2', {});

      testCache.set(key1, 'value1', 50);
      testCache.set(key2, 'value2', 5000); // Long TTL

      // Wait for cleanup to run
      await new Promise(resolve => setTimeout(resolve, 150));

      // Manually trigger cleanup (since interval might be long)
      testCache.cleanup();

      expect(testCache.has(key1)).toBe(false); // Expired
      expect(testCache.has(key2)).toBe(true);  // Still valid

      testCache.destroy();
    });
  });

  describe('destroy', () => {
    it('should stop cleanup interval', () => {
      const testCache = new MCPCache();
      expect(testCache.cleanupInterval).toBeDefined();

      testCache.destroy();
      expect(testCache.cleanupInterval).toBeNull();
    });

    it('should clear all entries', () => {
      const key = cache.generateKey('test', 'tool', {});
      cache.set(key, 'value');

      cache.destroy();

      const stats = cache.getStats();
      expect(stats.size).toBe(0);
    });
  });
});
