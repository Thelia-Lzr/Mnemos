import { debounce, throttle } from 'lodash';

export class PerformanceUtils {
  private static performanceObserver: PerformanceObserver | null = null;
  private static metrics: PerformanceEntry[] = [];

  // Initialize performance monitoring
  static initializeMonitoring() {
    if (typeof window === 'undefined' || !window.PerformanceObserver) {
      return;
    }

    try {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        this.metrics.push(...entries);
        
        // Keep only the latest 100 entries
        if (this.metrics.length > 100) {
          this.metrics = this.metrics.slice(-100);
        }

        // Log slow operations in development
        if (process.env.NODE_ENV === 'development') {
          entries.forEach(entry => {
            if (entry.duration > 100) {
              console.warn(`Slow operation detected: ${entry.name} - ${entry.duration.toFixed(2)}ms`);
            }
          });
        }
      });

      this.performanceObserver.observe({ 
        entryTypes: ['measure', 'navigation', 'resource', 'paint'] 
      });
    } catch (error) {
      console.warn('Performance monitoring not supported:', error);
    }
  }

  // Measure function execution time
  static measure<T>(name: string, fn: () => T): T {
    const startMark = `${name}-start`;
    const endMark = `${name}-end`;
    
    performance.mark(startMark);
    const result = fn();
    performance.mark(endMark);
    performance.measure(name, startMark, endMark);
    
    return result;
  }

  // Measure async function execution time
  static async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const startMark = `${name}-start`;
    const endMark = `${name}-end`;
    
    performance.mark(startMark);
    const result = await fn();
    performance.mark(endMark);
    performance.measure(name, startMark, endMark);
    
    return result;
  }

  // Get performance metrics
  static getMetrics(): {
    measures: PerformanceEntry[];
    navigation?: PerformanceNavigationTiming;
    paint?: PerformanceEntry[];
    resources?: PerformanceEntry[];
  } {
    const measures = this.metrics.filter(entry => entry.entryType === 'measure');
    const paint = this.metrics.filter(entry => entry.entryType === 'paint');
    const resources = this.metrics.filter(entry => entry.entryType === 'resource');
    
    let navigation: PerformanceNavigationTiming | undefined;
    try {
      navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    } catch (error) {
      // Navigation timing not available
    }

    return {
      measures,
      navigation,
      paint,
      resources
    };
  }

  // Get page load performance
  static getPageLoadMetrics(): {
    domContentLoaded: number;
    loadComplete: number;
    firstPaint?: number;
    firstContentfulPaint?: number;
  } {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType('paint');
    
    const firstPaint = paint.find(entry => entry.name === 'first-paint')?.startTime;
    const firstContentfulPaint = paint.find(entry => entry.name === 'first-contentful-paint')?.startTime;

    return {
      domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.fetchStart : 0,
      loadComplete: navigation ? navigation.loadEventEnd - navigation.fetchStart : 0,
      firstPaint,
      firstContentfulPaint
    };
  }

  // Memory usage monitoring
  static getMemoryUsage(): {
    used: number;
    total: number;
    percentage: number;
  } | null {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
        percentage: Math.round((memory.usedJSHeapSize / memory.totalJSHeapSize) * 100)
      };
    }
    return null;
  }

  // Debounced function creator
  static createDebounced<T extends (...args: any[]) => any>(
    func: T,
    wait: number = 300
  ): (...args: Parameters<T>) => void {
    return debounce(func, wait);
  }

  // Throttled function creator
  static createThrottled<T extends (...args: any[]) => any>(
    func: T,
    wait: number = 100
  ): (...args: Parameters<T>) => ReturnType<T> {
    return throttle(func, wait);
  }

  // Lazy loading utility
  static createIntersectionObserver(
    callback: (entries: IntersectionObserverEntry[]) => void,
    options?: IntersectionObserverInit
  ): IntersectionObserver | null {
    if (typeof window === 'undefined' || !window.IntersectionObserver) {
      return null;
    }

    return new IntersectionObserver(callback, {
      rootMargin: '50px',
      threshold: 0.1,
      ...options
    });
  }

  // Image lazy loading
  static lazyLoadImage(img: HTMLImageElement, src: string): void {
    const observer = this.createIntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const image = entry.target as HTMLImageElement;
          image.src = src;
          image.classList.remove('lazy');
          observer?.unobserve(image);
        }
      });
    });

    if (observer) {
      img.classList.add('lazy');
      observer.observe(img);
    } else {
      // Fallback for browsers without IntersectionObserver
      img.src = src;
    }
  }

  // Virtual scrolling helper
  static calculateVisibleItems(
    containerHeight: number,
    itemHeight: number,
    scrollTop: number,
    totalItems: number,
    overscan: number = 5
  ): { startIndex: number; endIndex: number; visibleItems: number } {
    const visibleItems = Math.ceil(containerHeight / itemHeight);
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(totalItems - 1, startIndex + visibleItems + overscan * 2);

    return { startIndex, endIndex, visibleItems };
  }

  // Bundle size analyzer (development only)
  static analyzeBundleSize(): void {
    if (process.env.NODE_ENV !== 'development') {
      return;
    }

    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const jsResources = resources.filter(resource => 
      resource.name.includes('.js') && !resource.name.includes('node_modules')
    );

    console.group('📦 Bundle Analysis');
    jsResources.forEach(resource => {
      const size = resource.transferSize || 0;
      const loadTime = resource.responseEnd - resource.requestStart;
      console.log(`${resource.name}: ${(size / 1024).toFixed(2)}KB (${loadTime.toFixed(2)}ms)`);
    });
    console.groupEnd();
  }

  // Component render time tracking
  static trackComponentRender(componentName: string): {
    start: () => void;
    end: () => void;
  } {
    let startTime: number;

    return {
      start: () => {
        startTime = performance.now();
      },
      end: () => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        if (process.env.NODE_ENV === 'development' && duration > 16) {
          console.warn(`Slow render: ${componentName} - ${duration.toFixed(2)}ms`);
        }

        performance.measure(`render-${componentName}`, {
          start: startTime,
          end: endTime
        });
      }
    };
  }

  // Network performance monitoring
  static monitorNetworkRequests(): void {
    if (typeof window === 'undefined') return;

    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach(entry => {
        const resource = entry as PerformanceResourceTiming;
        
        if (resource.initiatorType === 'fetch' || resource.initiatorType === 'xmlhttprequest') {
          const duration = resource.responseEnd - resource.requestStart;
          
          if (duration > 2000) {
            console.warn(`Slow API request: ${resource.name} - ${duration.toFixed(2)}ms`);
          }

          // Track in development
          if (process.env.NODE_ENV === 'development') {
            console.log(`API: ${resource.name} - ${duration.toFixed(2)}ms`);
          }
        }
      });
    });

    observer.observe({ entryTypes: ['resource'] });
  }

  // Cleanup performance monitoring
  static cleanup(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }
    this.metrics = [];
  }

  // Get performance report
  static getPerformanceReport(): {
    pageLoad: any;
    memory: any;
    slowOperations: PerformanceEntry[];
    networkRequests: number;
  } {
    const pageLoad = this.getPageLoadMetrics();
    const memory = this.getMemoryUsage();
    const slowOperations = this.metrics.filter(entry => entry.duration > 100);
    const networkRequests = this.metrics.filter(entry => 
      entry.entryType === 'resource' && 
      (entry.name.includes('/api/') || entry.name.includes('fetch'))
    ).length;

    return {
      pageLoad,
      memory,
      slowOperations,
      networkRequests
    };
  }
}

// Auto-initialize performance monitoring
if (typeof window !== 'undefined') {
  PerformanceUtils.initializeMonitoring();
  PerformanceUtils.monitorNetworkRequests();
}

export default PerformanceUtils;