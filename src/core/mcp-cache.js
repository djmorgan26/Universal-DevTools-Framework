const crypto = require('crypto');

/**
 * MCP Cache - Simple in-memory cache for MCP tool responses
 *
 * Features:
 * - TTL (time-to-live) support
 * - Automatic cleanup of expired entries
 * - Size limit to prevent memory issues
 * - Cache key generation from tool parameters
 */
class MCPCache {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 1000; // Maximum cache entries
    this.defaultTTL = options.defaultTTL || 300000; // 5 minutes default
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0
    };

    // Start cleanup interval
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000); // Every minute
  }

  /**
   * Generate a cache key from tool call parameters
   * @param {string} mcpName - MCP server name
   * @param {string} toolName - Tool name
   * @param {object} args - Tool arguments
   * @returns {string} Cache key
   */
  generateKey(mcpName, toolName, args) {
    // Create a deterministic string from the parameters
    const keyData = JSON.stringify({ mcpName, toolName, args });

    // Hash it for consistent key length
    return crypto
      .createHash('sha256')
      .update(keyData)
      .digest('hex');
  }

  /**
   * Check if a key exists and is not expired
   * @param {string} key - Cache key
   * @returns {boolean} True if exists and not expired
   */
  has(key) {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return false;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return false;
    }

    this.stats.hits++;
    return true;
  }

  /**
   * Get a value from cache
   * @param {string} key - Cache key
   * @returns {any} Cached value or undefined
   */
  get(key) {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    // Update access time for LRU
    entry.lastAccessed = Date.now();

    return entry.value;
  }

  /**
   * Set a value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time-to-live in milliseconds (optional)
   */
  set(key, value, ttl = this.defaultTTL) {
    // Check size limit
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    const entry = {
      value,
      expiresAt: Date.now() + ttl,
      lastAccessed: Date.now(),
      createdAt: Date.now()
    };

    this.cache.set(key, entry);
  }

  /**
   * Delete a specific key
   * @param {string} key - Cache key
   */
  delete(key) {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0
    };
  }

  /**
   * Get cache statistics
   * @returns {object} Cache stats
   */
  getStats() {
    return {
      ...this.stats,
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0
    };
  }

  /**
   * Evict least recently used entry
   * @private
   */
  evictLRU() {
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * Remove expired entries
   * @private
   */
  cleanup() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      // Uncomment for debugging: console.log(`Cleaned ${cleanedCount} expired cache entries`);
    }
  }

  /**
   * Stop cleanup interval
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

module.exports = { MCPCache };
