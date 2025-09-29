# Inconsistent Bulk Operations Standardization Plan

## Current Inconsistencies Identified

## Missing Bulk Operations

1. BlockAttributesRepository - No getBulk() method (only individual get())
2. PostsQueryApiController & PostsOperationsApiController - May not use consistent bulk patterns
3. FileGenerationApiController - Has BulkQueryService injected but usage unclear

## Implementation Inconsistencies

1. Full vs Partial Bulk: PostsApiController uses complete 6-step bulk pipeline, while ScssCompilerApiController only uses repository bulk fetching
2. Different Patterns: Mix of Repository::getBulk() vs BulkQueryService methods
3. Inconsistent Error Handling: Different approaches to handling empty bulk results

## Standardization Strategy

### Phase 1: Complete Repository Bulk Methods

1. Add BlockAttributesRepository::getBulk()

- Implement bulk fetch for multiple post attributes in single query
- Return format: [post_id => attributes_array] for consistency
- Handle empty inputs gracefully

### Phase 2: Standardize Controller Patterns

1. Define Standard Bulk Pipeline

- Step 1: WP_Query for posts
- Step 2: BulkQueryService->getBulkPostTerms()
- Step 3: BulkQueryService->getOptimizedMetaKeys()
- Step 4: BulkQueryService->getBulkPostMeta()
- Step 5: Repository::getBulk() calls for custom tables
- Step 6: Data formatting and response building

2. Update Inconsistent Controllers

- ScssCompilerApiController: Add full bulk pipeline
- FileGenerationApiController: Implement consistent bulk usage
- PostsQueryApiController: Verify bulk operations compliance

### Phase 3: Create Bulk Operations Interface

1. Standardize Repository Interface

- All repositories must implement getBulk(array $postIds): array
- Consistent return format: [post_id => data]
- Common error handling patterns

2. Create Bulk Operation Traits

- Common bulk operation workflows
- Standard performance logging
- Consistent caching integration points

### Expected Benefits

- Consistent Performance: All controllers benefit from bulk optimizations
- Maintainability: Standard patterns across all API endpoints
- Predictable Behavior: Same bulk operation steps everywhere
- Easier Testing: Standardized interfaces for mocking/testing
