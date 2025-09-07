export class LRUCache {
    constructor(maxSize) {
        this.maxSize = maxSize;
        this.cache = new Map();
    }

    get(key) {
        const item = this.cache.get(key);
        if (item) {
            // Refresh it by deleting and re-setting
            this.cache.delete(key);
            this.cache.set(key, item);
        }
        return item;
    }

    set(key, value) {
        // Delete old entry if it exists to refresh its position
        if (this.cache.has(key)) {
            this.cache.delete(key);
        }
        // If the cache is full, evict the least recently used item
        else if (this.cache.size >= this.maxSize && this.maxSize > 0) {
            // .keys().next().value gets the first (oldest) key in the Map
            this.cache.delete(this.cache.keys().next().value);
        }
        this.cache.set(key, value);
    }

    has(key) {
        return this.cache.has(key);
    }

    clear() {
        this.cache.clear();
    }
}
