# WordPress Block Data Architecture Migration Plan

## Overview

Migrate from JSON-based post meta storage to hybrid custom tables with strategic JSON usage for better performance, data integrity, and query capabilities in the FanCoolo WordPress plugin.

## Current Problems

- **Database Performance**: JSON strings in meta fields don't scale well
- **Search Limitations**: Cannot efficiently query inside JSON meta
- **Data Integrity**: No schema validation for JSON data
- **Bulk Query Issues**: `BulkQueryService.php` requires complex JSON parsing
- **Code Complexity**: JSON parsing scattered throughout codebase

## Solution: Hybrid Custom Tables + Strategic JSON

### Database Schema Design

#### Core Tables

```sql
-- Main block metadata (searchable fields)
CREATE TABLE funculo_blocks (
    id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
    post_id bigint(20) unsigned NOT NULL,
    category varchar(100) NOT NULL,
    icon varchar(100) DEFAULT NULL,
    description text DEFAULT NULL,
    supports_inner_blocks tinyint(1) DEFAULT 0,
    created_at datetime DEFAULT CURRENT_TIMESTAMP,
    updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY post_id (post_id),
    KEY category (category),
    FOREIGN KEY (post_id) REFERENCES wp_posts(ID) ON DELETE CASCADE
);

-- Individual attributes (searchable)
CREATE TABLE funculo_attributes (
    id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
    block_id bigint(20) unsigned NOT NULL,
    name varchar(100) NOT NULL,
    type varchar(50) NOT NULL,
    label varchar(255) NOT NULL,
    required tinyint(1) DEFAULT 0,
    position int(11) DEFAULT 0,
    created_at datetime DEFAULT CURRENT_TIMESTAMP,
    updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY block_id (block_id),
    KEY name (name),
    KEY type (type),
    FOREIGN KEY (block_id) REFERENCES funculo_blocks(id) ON DELETE CASCADE
);

-- Complex attribute configurations (JSON for flexibility)
CREATE TABLE funculo_attribute_configs (
    id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
    attribute_id bigint(20) unsigned NOT NULL,
    config_json longtext NOT NULL,
    created_at datetime DEFAULT CURRENT_TIMESTAMP,
    updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY attribute_id (attribute_id),
    FOREIGN KEY (attribute_id) REFERENCES funculo_attributes(id) ON DELETE CASCADE
);

-- Block-SCSS partial relationships (fully relational)
CREATE TABLE funculo_block_partials (
    id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
    block_id bigint(20) unsigned NOT NULL,
    partial_post_id bigint(20) unsigned NOT NULL,
    load_order int(11) DEFAULT 0,
    created_at datetime DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY block_id (block_id),
    KEY partial_post_id (partial_post_id),
    FOREIGN KEY (block_id) REFERENCES funculo_blocks(id) ON DELETE CASCADE,
    FOREIGN KEY (partial_post_id) REFERENCES wp_posts(ID) ON DELETE CASCADE
);
```

#### What Goes Where

**Relational Columns**: Searchable/filterable data

- Block category, icon, description
- Attribute names, types, labels
- SCSS partial relationships

**JSON Storage**: Complex/variable structures

- Attribute field options (select/radio/checkbox arrays)
- Validation rules and constraints
- Complex inner blocks configuration

#### Symbols and SCSS Partials

**Keep as WordPress Meta** (no custom tables needed):

- **Symbols**: Only store `_funculo_symbol_php` (simple, no complex relationships)
- **SCSS Partials**: Store `_funculo_scss_partial_scss`, `_funculo_scss_is_global`, `_funculo_scss_global_order` as structured meta with `register_post_meta()` validation

These content types don't have the performance/complexity issues that blocks have, so WordPress meta with proper registration is sufficient.

## Implementation Steps

### Step 1: Database Infrastructure

**Files to Create:**

- `app/Database/DatabaseManager.php` - Handle dbDelta() and versioning
- `app/Database/Schema/BlocksSchema.php` - Schema definitions

**Tasks:**

- Create database schema with `dbDelta()` in plugin activation hook
- Add proper indexes for query performance (post_id, category, block_id, name, type)
- Create database versioning system using `fancoolo_db_version` option
- Build helper to reseed tables in development environment

### Step 2: Data Access Layer

**Files to Create:**

- `app/Repositories/BlockRepository.php` - Block CRUD operations
- `app/Repositories/AttributeRepository.php` - Attribute management
- `app/Services/BlockConfigurationService.php` - Complex compositional operations
- `app/DTOs/BlockData.php` - Type-hinted data transfer objects
- `app/DTOs/AttributeData.php` - Attribute data structures

**Tasks:**

- Build repository pattern for clean data access
- Implement type-hinted DTOs for data validation
- Add transient-based caching with invalidation hooks
- Create service layer for complex operations (bulk operations, validation)

### Step 3: Development Fixtures (No Migration Needed)

**Files to Create:**

- `app/Database/Seeds/BlockFixtures.php` - Test data fixtures
- `app/Commands/DevSeedCommand.php` - Development seeding helper

**Tasks:**

- Create realistic block examples with various attribute types (text, select, number, etc.)
- Generate sample SCSS partial relationships for testing
- Provide comprehensive test data for performance testing
- Build helper command to populate/reset development data

**Note**: Since this is a new plugin with no users or legacy data, no migration scripts are needed. We implement the new table structure from scratch.

### Step 4: Implement New Data Layer

**Files to Modify:**

- `app/Admin/Api/Services/BulkQueryService.php` - Replace JSON parsing with JOINs
- All generators in `app/FilesManager/Generators/` - Use new data layer
- API controllers in `app/Admin/Api/` - Work with new data structure
- `app/Admin/Api/Services/MetaKeysConstants.php` - Remove deprecated constants

**Tasks:**

- Implement new repository calls (no old meta to replace)
- Build bulk operations with proper JOIN queries
- Create generators that work with new data structure from the start
- Design REST routes and capability checks for new endpoints

### Step 5: Frontend Integration

**Files to Modify:**

- React components in `src/app/components/editor/` - Handle new API responses
- Metabox components - Save to new tables instead of meta
- API client in `src/utils/api/` - Updated endpoints

**Tasks:**

- Update React components to work with new API payloads
- Modify editor metaboxes to save to new tables
- Add comprehensive E2E smoke tests covering create/edit/delete operations
- Test all CRUD operations in WordPress admin

### Step 6: Performance Optimization & Monitoring

**Files to Create:**

- `app/Services/QueryMonitoringService.php` - Performance tracking
- `app/Cache/BlockCacheManager.php` - Advanced caching strategies

**Tasks:**

- Add query result caching for complex attribute lookups
- Optimize bulk operations for block generation
- Instrument key queries with performance monitoring
- Define latency targets (<100ms for attribute queries)
- Set up Query Monitor or logging for slow SQL detection
- Load test on staging data with realistic volumes

### Step 7: Cleanup & Documentation

**Files to Remove/Refactor:**

- Block-related meta key constants in `MetaKeysConstants.php` (keep Symbol/SCSS meta keys)
- JSON parsing logic in `AttributeMapper.php` (replace with repository calls)

**Documentation to Create:**

- `optimisation-plan/schema-documentation.md` - Database schema docs
- `optimisation-plan/repository-usage-examples.md` - Code examples
- `optimisation-plan/install-upgrade-steps.md` - Deployment guide
- `optimisation-plan/testing-checklist.md` - QA procedures

**Tasks:**

- Remove block-related meta key constants (keep Symbol/SCSS as structured meta)
- Replace JSON parsing with repository calls
- Update all code comments and documentation
- Create comprehensive testing checklist

## File Structure After Migration

```
app/
├── Database/
│   ├── DatabaseManager.php
│   ├── Schema/
│   │   └── BlocksSchema.php
│   └── Seeds/
│       └── BlockFixtures.php
├── Repositories/
│   ├── BlockRepository.php
│   └── AttributeRepository.php
├── DTOs/
│   ├── BlockData.php
│   └── AttributeData.php
├── Services/
│   ├── BlockConfigurationService.php
│   ├── QueryMonitoringService.php
│   └── (existing services...)
├── Cache/
│   └── BlockCacheManager.php
└── Commands/
    └── DevSeedCommand.php
```

## Expected Benefits

- **10x Performance Improvement**: Proper database indexes for block attribute searches
- **Clean Architecture**: Repository pattern with type-safe data transfer
- **Data Integrity**: Schema validation and foreign key constraints
- **Simplified Queries**: JOIN operations instead of JSON parsing
- **Better Caching**: Proper WordPress transient usage with invalidation
- **Easier Development**: Type-hinted DTOs and comprehensive fixtures

## Risk Mitigation

Since this plugin has no active users:

- **No Migration Scripts Needed**: Implement new architecture directly
- **No Backward Compatibility**: Clean slate implementation
- **No Gradual Rollout**: Direct implementation of new architecture
- **No Feature Flags**: Single code path with new table structure
- **Focus on Testing**: Use comprehensive fixtures and E2E tests

## Success Metrics

- Block attribute queries complete in <100ms
- Bulk operations handle 1000+ blocks efficiently
- Memory usage reduced by eliminating JSON parsing overhead
- Code complexity reduced through proper data modeling
- Test coverage >90% for new data layer

## Implementation Timeline

1. **Week 1**: Database schema and infrastructure
2. **Week 2**: Data access layer and repositories
3. **Week 3**: Core component implementation with new data layer
4. **Week 4**: Frontend integration and testing
5. **Week 5**: Performance optimization and documentation

This migration will provide a solid foundation for scaling the FanCoolo plugin while maintaining clean, maintainable WordPress architecture.
