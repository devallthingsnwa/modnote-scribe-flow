
import { EnhancedSearchResult, CacheEntry } from './types';

export class SearchCache {
  private static readonly CACHE_DURATION = 45000; // 45 seconds
  private static cache = new Map<string, CacheEntry>();

  static get(key: string): EnhancedSearchResult[] | null {
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log(`⚡ ENHANCED CACHE HIT: ${cached.strategy}`);
      return cached.results;
    }
    
    if (cached) {
      this.cache.delete(key);
    }
    
    return null;
  }

  static set(key: string, results: EnhancedSearchResult[], strategy: string): void {
    this.cache.set(key, {
      results,
      timestamp: Date.now(),
      strategy
    });
    
    // Clean old cache entries
    if (this.cache.size > 30) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
  }

  static clear(): void {
    this.cache.clear();
  }

  static getStats(): { size: number; duration: number } {
    return {
      size: this.cache.size,
      duration: this.CACHE_DURATION
    };
  }
}
