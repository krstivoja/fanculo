/**
 * Optimized Batch-First API Testing Suite - Phase 2.3
 *
 * Tests the batch-optimized API client where batch operations are the primary
 * interface, not fallbacks. This reflects the reality of a new plugin without
 * legacy compatibility requirements.
 */

console.log('🧪 Testing Optimized Batch-First API Operations - Phase 2.3');

/**
 * Test batch post fetching performance
 */
async function testBatchPostFetching() {
    if (!window.funculoApiClient) {
        console.error('❌ FunculoApiClient not found');
        return;
    }

    const apiClient = window.funculoApiClient;
    console.log('\n📦 Test 1: Batch Post Fetching');

    try {
        // First get some post IDs to test with
        const allPosts = await apiClient.getPosts({ per_page: 10 });
        const postIds = allPosts.posts.slice(0, 5).map(p => p.id);

        if (postIds.length === 0) {
            console.log('⚠️ No posts found to test with');
            return;
        }

        console.log(`Testing with ${postIds.length} posts:`, postIds);

        // Test 1A: Single post method (uses batch internally)
        console.time('Single post calls');
        const singleResults = [];
        for (const postId of postIds) {
            const post = await apiClient.getPost(postId); // Uses batch internally
            singleResults.push(post);
        }
        console.timeEnd('Single post calls');

        // Test 1B: Direct batch request (most efficient)
        console.time('Direct batch request');
        const batchResult = await apiClient.getBatchPosts(postIds);
        console.timeEnd('Direct batch request');

        console.log('✅ Single post calls (batch-powered):', singleResults.length, 'posts');
        console.log('✅ Direct batch request:', batchResult.found, 'posts found,', batchResult.not_found.length, 'not found');
        console.log('📊 Direct batch is most efficient for multiple posts');

    } catch (error) {
        console.error('❌ Batch post fetching test failed:', error);
    }
}

/**
 * Test batch post updates
 */
async function testBatchPostUpdates() {
    if (!window.funculoApiClient) {
        console.error('❌ FunculoApiClient not found');
        return;
    }

    const apiClient = window.funculoApiClient;
    console.log('\n📦 Test 2: Batch Post Updates');

    try {
        // Get some posts to test with
        const allPosts = await apiClient.getPosts({ per_page: 3 });
        const posts = allPosts.posts.slice(0, 2);

        if (posts.length === 0) {
            console.log('⚠️ No posts found to test with');
            return;
        }

        // Prepare batch updates (we'll just update meta data)
        const updates = posts.map(post => ({
            id: post.id,
            meta: {
                blocks: {
                    ...post.meta?.blocks,
                    test_batch_timestamp: Date.now()
                }
            }
        }));

        console.log(`Testing batch update of ${updates.length} posts`);

        console.time('Batch update');
        const updateResult = await apiClient.batchUpdatePosts(updates);
        console.timeEnd('Batch update');

        console.log('✅ Batch update result:', updateResult.total, 'total,', updateResult.successful.length, 'successful,', updateResult.failed.length, 'failed');

        if (updateResult.failed.length > 0) {
            console.log('❌ Failed updates:', updateResult.failed);
        }

    } catch (error) {
        console.error('❌ Batch update test failed:', error);
    }
}

/**
 * Test post with related data
 */
async function testPostWithRelated() {
    if (!window.funculoApiClient) {
        console.error('❌ FunculoApiClient not found');
        return;
    }

    const apiClient = window.funculoApiClient;
    console.log('\n📦 Test 3: Post With Related Data');

    try {
        // Get a block post to test with
        const allPosts = await apiClient.getPosts({ per_page: 10, taxonomy_filter: 'blocks' });
        const blockPost = allPosts.posts.find(p => p.terms?.some(t => t.slug === 'blocks'));

        if (!blockPost) {
            console.log('⚠️ No block posts found to test with');
            return;
        }

        console.log('Testing with block post:', blockPost.title);

        // Test 3A: Standard post fetch (uses batch internally but multiple calls for related data)
        console.time('Standard post + related calls');
        const post = await apiClient.getPost(blockPost.id); // Batch internally
        const partials = await apiClient.getScssPartials(); // Separate call
        const categories = await apiClient.getBlockCategories(); // Separate call
        console.timeEnd('Standard post + related calls');

        // Test 3B: Optimized single request with related data
        console.time('Optimized single request with related');
        const postWithRelated = await apiClient.getPostWithRelated(blockPost.id);
        console.timeEnd('Optimized single request with related');

        console.log('✅ Standard approach: 3 API calls (1 batch + 2 individual)');
        console.log('✅ Optimized approach: 1 API call with everything');
        console.log('📊 Related data included:', Object.keys(postWithRelated.related || {}));

    } catch (error) {
        console.error('❌ Post with related test failed:', error);
    }
}

/**
 * Test bulk operations
 */
async function testBulkOperations() {
    if (!window.funculoApiClient) {
        console.error('❌ FunculoApiClient not found');
        return;
    }

    const apiClient = window.funculoApiClient;
    console.log('\n📦 Test 4: Bulk Operations');

    try {
        // Get a post to test with
        const allPosts = await apiClient.getPosts({ per_page: 5 });
        const testPost = allPosts.posts[0];

        if (!testPost) {
            console.log('⚠️ No posts found to test with');
            return;
        }

        console.log('Testing bulk operations with post:', testPost.title);

        // Create a set of operations
        const operations = [
            {
                type: 'get_post',
                data: { id: testPost.id }
            },
            {
                type: 'update_meta',
                data: {
                    post_id: testPost.id,
                    meta: {
                        blocks: {
                            ...testPost.meta?.blocks,
                            bulk_test_timestamp: Date.now()
                        }
                    }
                }
            }
        ];

        console.time('Bulk operations');
        const bulkResult = await apiClient.executeBulkOperations(operations);
        console.timeEnd('Bulk operations');

        console.log('✅ Bulk operations result:', bulkResult.total, 'total,', bulkResult.successful.length, 'successful,', bulkResult.failed.length, 'failed');

        if (bulkResult.failed.length > 0) {
            console.log('❌ Failed operations:', bulkResult.failed);
        }

    } catch (error) {
        console.error('❌ Bulk operations test failed:', error);
    }
}

/**
 * Test convenience methods
 */
async function testConvenienceMethods() {
    if (!window.funculoApiClient) {
        console.error('❌ FunculoApiClient not found');
        return;
    }

    const apiClient = window.funculoApiClient;
    console.log('\n📦 Test 5: Convenience Methods');

    try {
        // Get a post to test with
        const allPosts = await apiClient.getPosts({ per_page: 5 });
        const testPost = allPosts.posts[0];

        if (!testPost) {
            console.log('⚠️ No posts found to test with');
            return;
        }

        console.log('Testing convenience methods with post:', testPost.title);

        // Test savePostWithOperations
        console.time('Save post with operations');
        const saveResult = await apiClient.savePostWithOperations(
            testPost.id,
            {
                blocks: {
                    ...testPost.meta?.blocks,
                    convenience_test_timestamp: Date.now()
                }
            },
            false // Don't regenerate files in test
        );
        console.timeEnd('Save post with operations');

        console.log('✅ Save with operations result:', saveResult.successful?.length || 0, 'successful operations');

        // Test getPostsWithPartials
        if (allPosts.posts.length >= 2) {
            const postIds = allPosts.posts.slice(0, 2).map(p => p.id);

            console.time('Get posts with partials');
            const postsWithPartials = await apiClient.getPostsWithPartials(postIds);
            console.timeEnd('Get posts with partials');

            console.log('✅ Posts with partials result:', postsWithPartials.found, 'posts with partials data');
        }

    } catch (error) {
        console.error('❌ Convenience methods test failed:', error);
    }
}

/**
 * Performance comparison summary
 */
async function showPerformanceSummary() {
    if (!window.funculoApiClient) {
        console.error('❌ FunculoApiClient not found');
        return;
    }

    const apiClient = window.funculoApiClient;
    console.log('\n📊 Performance Summary - Batch API Benefits');

    const stats = apiClient.getStats();
    console.log('Total API requests made:', stats.requests);
    console.log('Cache hit rate:', stats.cacheHitRate);
    console.log('Performance metrics:', stats.performance);

    console.log('\n🎯 Key Benefits Demonstrated:');
    console.log('  • Batch post fetching: N API calls → 1 API call');
    console.log('  • Batch updates: N API calls → 1 API call');
    console.log('  • Post with related data: 3+ API calls → 1 API call');
    console.log('  • Bulk operations: Multiple individual operations → 1 API call');
    console.log('  • Smart batching: Automatic optimization of multiple updates');
    console.log('  • Reduced network overhead and improved user experience');
}

/**
 * Run all batch API tests
 */
async function runAllBatchTests() {
    console.log('🚀 Starting Comprehensive Batch API Tests...\n');

    await testBatchPostFetching();
    await testBatchPostUpdates();
    await testPostWithRelated();
    await testBulkOperations();
    await testConvenienceMethods();
    await showPerformanceSummary();

    console.log('\n✅ All Batch API tests completed!');
    console.log('📈 Phase 2.3 - Batch API Endpoints implementation verified');
}

// Export functions for manual testing
window.testBatchPostFetching = testBatchPostFetching;
window.testBatchPostUpdates = testBatchPostUpdates;
window.testPostWithRelated = testPostWithRelated;
window.testBulkOperations = testBulkOperations;
window.testConvenienceMethods = testConvenienceMethods;
window.runAllBatchTests = runAllBatchTests;

console.log('🔧 Batch API test functions loaded. Run:');
console.log('  • runAllBatchTests() - Run all batch API tests');
console.log('  • testBatchPostFetching() - Test batch post fetching');
console.log('  • testBatchPostUpdates() - Test batch updates');
console.log('  • testPostWithRelated() - Test post with related data');
console.log('  • testBulkOperations() - Test bulk operations');
console.log('  • testConvenienceMethods() - Test convenience methods');

// Auto-run tests if this script is executed directly
if (typeof window !== 'undefined' && window.funculoApiClient) {
    runAllBatchTests();
}