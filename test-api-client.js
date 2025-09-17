/**
 * Test script for FunculoApiClient performance and functionality
 *
 * This script tests the API client's caching, deduplication, and performance features.
 * Run this in the browser console to see the improvements.
 */

// Test caching and deduplication
console.log('🧪 Testing FunculoApiClient Performance...');

async function testApiClientPerformance() {
    if (!window.funculoApiClient) {
        console.error('❌ FunculoApiClient not found. Make sure it\'s loaded.');
        return;
    }

    const apiClient = window.funculoApiClient;
    console.log('📊 Starting performance tests...');

    // Clear any existing stats
    const initialStats = apiClient.getStats();
    console.log('📈 Initial stats:', initialStats);

    // Test 1: Cache performance
    console.log('\n🧪 Test 1: Cache Performance');
    console.time('First request (uncached)');
    const posts1 = await apiClient.getPosts();
    console.timeEnd('First request (uncached)');

    console.time('Second request (cached)');
    const posts2 = await apiClient.getPosts();
    console.timeEnd('Second request (cached)');

    console.log('✅ Same data returned:', JSON.stringify(posts1) === JSON.stringify(posts2));

    // Test 2: Request deduplication
    console.log('\n🧪 Test 2: Request Deduplication');
    console.log('Making 5 simultaneous identical requests...');

    const startTime = performance.now();
    const promises = [
        apiClient.getScssPartials(),
        apiClient.getScssPartials(),
        apiClient.getScssPartials(),
        apiClient.getScssPartials(),
        apiClient.getScssPartials()
    ];

    const results = await Promise.all(promises);
    const endTime = performance.now();

    console.log(`⚡ 5 simultaneous requests completed in ${(endTime - startTime).toFixed(2)}ms`);
    console.log('✅ All results identical:', results.every(r => JSON.stringify(r) === JSON.stringify(results[0])));

    // Test 3: Error handling
    console.log('\n🧪 Test 3: Error Handling');
    try {
        await apiClient.getPost(999999); // Non-existent post
    } catch (error) {
        console.log('✅ Error properly caught and handled:', error.message);
    }

    // Show final statistics
    const finalStats = apiClient.getStats();
    console.log('\n📊 Final Statistics:');
    console.log('Total requests:', finalStats.requests);
    console.log('Cache hits:', finalStats.cacheHits);
    console.log('Cache hit rate:', finalStats.cacheHitRate);
    console.log('Errors:', finalStats.errors);
    console.log('Cache size:', finalStats.cacheSize);
    console.log('Performance metrics:', finalStats.performance);

    // Show error handler stats if available
    if (window.funculoErrorHandler) {
        const errorStats = window.funculoErrorHandler.getStats();
        console.log('\n🚨 Error Handler Statistics:');
        console.log('Total errors logged:', errorStats.total);
        console.log('Errors in last hour:', errorStats.recentHour);
        console.log('Errors by category:', errorStats.byCategory);
        console.log('Errors by severity:', errorStats.bySeverity);
    }

    console.log('\n✅ Performance tests completed!');
    console.log('🎯 Key improvements demonstrated:');
    console.log('  • Request caching reduces redundant API calls');
    console.log('  • Request deduplication prevents simultaneous identical requests');
    console.log('  • Centralized error handling with detailed logging');
    console.log('  • Performance monitoring and metrics collection');
}

// Performance comparison function
async function comparePerformance() {
    console.log('\n📊 Performance Comparison: Direct fetch vs API Client');

    // Test direct fetch (old way)
    console.time('Direct fetch');
    try {
        const response = await fetch('/wp-json/funculo/v1/posts', {
            headers: {
                'X-WP-Nonce': window.wpApiSettings.nonce
            }
        });
        await response.json();
    } catch (error) {
        console.log('Direct fetch error:', error);
    }
    console.timeEnd('Direct fetch');

    // Test API client (new way)
    console.time('API client (cached)');
    try {
        await window.funculoApiClient.getPosts();
    } catch (error) {
        console.log('API client error:', error);
    }
    console.timeEnd('API client (cached)');
}

// Export functions for manual testing
window.testApiClientPerformance = testApiClientPerformance;
window.comparePerformance = comparePerformance;

console.log('🔧 Test functions loaded. Run:');
console.log('  • testApiClientPerformance() - Full functionality test');
console.log('  • comparePerformance() - Performance comparison');

// Auto-run tests if this script is executed directly
if (typeof window !== 'undefined' && window.funculoApiClient) {
    testApiClientPerformance();
}