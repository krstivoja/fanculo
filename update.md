# Fanculo Plugin Update Plan

## Structure and Organization Refactoring

### Current Issues Analysis:

#### 1. **Misplaced Content Registration** ✅ COMPLETED
**Problem**: `Admin/Content/` contains post type and taxonomy registration
- `FunculoPostType.php` and `FunculoTypeTaxonomy.php` are core functionality, not admin-specific
- Used by **18 files** across the entire codebase (FilesManager, API controllers, generators)
- Registration happens on `init` hook, affects both frontend and admin

**SOLUTION IMPLEMENTED:**
- ✅ Created new `app/Content/` directory
- ✅ Moved `FunculoPostType.php` to `Content/` with namespace `Fanculo\Content`
- ✅ Moved `FunculoTypeTaxonomy.php` to `Content/` with namespace `Fanculo\Content`
- ✅ Updated all 18 import statements across FilesManager, API controllers, and App.php
- ✅ Removed empty `Admin/Content/` directory
- ✅ All files pass PHP syntax validation

#### 2. **Inconsistent Service/Hooks Naming**
**Current naming inconsistencies**:
- Hook classes: `FileGenerationHooks`, `BlockRegistrationHooks`, `InnerBlocksHooks`
- Service classes: `FilesManagerService`, `BulkQueryService`
- **Issue**: Hook classes have logic beyond just hooks, should be Services

#### 3. **Directory Structure Problems**
- Empty `Core/` directory (unused)
- Content registration buried under `Admin/` when it's system-wide
- Hook classes mixed with other services in `Services/`

### Proposed Reorganization:

#### **Phase 1: Content Registration Restructure** ✅ COMPLETED
**Move**: `Admin/Content/` → `Content/` (neutral location)
```
app/Content/
├── FunculoPostType.php      # namespace: Fanculo\Content
└── FunculoTypeTaxonomy.php  # namespace: Fanculo\Content
```

**Benefits Achieved**:
- ✅ Reflects true purpose (system-wide content registration)
- ✅ More logical import path: `use Fanculo\Content\FunculoPostType`
- ✅ Clear separation from admin-only features

#### **Phase 2: Service/Hook Naming Consistency**
**Rename for consistency** (all should be `...Service`):
- `FileGenerationHooks` → `FileGenerationService`
- `BlockRegistrationHooks` → `BlockRegistrationService`
- `InnerBlocksHooks` → `InnerBlocksService`

**Justification**: These classes do more than just hook registration - they contain business logic

#### **Phase 3: Hook-Specific Organization** (Optional)
**Create**: `Services/Hooks/` subdirectory for pure hook classes
```
app/Services/
├── Hooks/                   # Pure hook management (future)
├── FileGenerationService.php   # Business logic + hooks
├── BlockRegistrationService.php # Business logic + hooks
└── InnerBlocksService.php      # Business logic + hooks
```

### Migration Impact Analysis:

#### **Files Requiring Updates (18 total)**:
- `App.php` - Update imports and instantiation
- All `FilesManager/` classes (10 files)
- All `Admin/Api/` controllers (7 files)

#### **Namespace Changes Required**:
```php
// FROM:
use Fanculo\Admin\Content\FunculoPostType;
use Fanculo\Admin\Content\FunculoTypeTaxonomy;

// TO:
use Fanculo\Content\FunculoPostType;
use Fanculo\Content\FunculoTypeTaxonomy;
```

### Implementation Strategy:

#### **Step 1**: Create new directories and move files ✅ COMPLETED
- ✅ Create `app/Content/` directory
- ✅ Move and update namespace in content registration files

#### **Step 2**: Update all import statements across codebase ✅ COMPLETED
- ✅ Systematic find/replace of namespace imports
- ✅ Update all 18 affected files

#### **Step 3**: Rename service classes for consistency (PENDING)
- Rename hook classes to `...Service` pattern
- Update references in `App.php`

#### **Step 4**: Remove empty directories ✅ COMPLETED
- ✅ Delete empty `Admin/Content/` directory
- Consider removing empty `Core/` directory

### Benefits:
- ✅ **Logical Structure**: Content registration in neutral location
- **Consistent Naming**: All service classes follow same pattern (PENDING)
- ✅ **Better Maintainability**: Clear separation of concerns
- ✅ **Accurate Imports**: Import paths reflect actual functionality

## Hook Placement and Lifecycle Refactoring

### Current Issues:
1. **REST Route Registration**: All routes are registered in `Api.php` instead of individual controllers
2. **Hook Timing**: Post type/taxonomy registration runs on `init` but without proper priority coordination
3. **Architectural Coupling**: App class directly instantiates all services instead of delegating hook registration

### Refactoring Plan:

#### 1. Move REST Route Registration to Individual Controllers
- **PostsApiController.php**: Add `registerRoutes()` method and hook to `rest_api_init`
- **TaxonomyApiController.php**: Add `registerRoutes()` method and hook to `rest_api_init`
- **BlockCategoriesApiController.php**: Add `registerRoutes()` method and hook to `rest_api_init`
- **FileGenerationApiController.php**: Add `registerRoutes()` method and hook to `rest_api_init`
- **ScssCompilerApiController.php**: Add `registerRoutes()` method and hook to `rest_api_init`

#### 2. Refactor API.php
- Remove the centralized `registerRoutes()` method
- Remove the `rest_api_init` hook from Api class
- Api class becomes just a container/coordinator that instantiates controllers
- Controllers handle their own route registration

#### 3. Improve Post Type/Taxonomy Registration Priority
- **FunculoPostType.php**: Ensure `init` hook runs at priority 10 (default)
- **FunculoTypeTaxonomy.php**: Change `init` hook priority to 15 to run after post type registration
- This ensures proper dependency order

#### 4. Update App.php Architecture
- App remains responsible for instantiating classes
- Each class becomes responsible for its own hook registration
- Maintain clean separation of concerns

### Benefits:
- **Single Responsibility**: Each controller manages its own routes
- **Better Hook Timing**: Proper priority ensures correct registration order
- **Improved Maintainability**: Easier to locate and modify specific route logic
- **Reduced Coupling**: Api class no longer needs to know about all routes

## FilesManager Refactoring

### Current Issues Analysis:
- **FilesManagerService**: 233 lines, handling too many responsibilities
- **Mixed concerns**: Orchestration, content type mapping, global impact detection, and write operations
- **Full scans**: No guards against unnecessary regeneration on frequent edits
- **Coupling**: FileWriter exists but generation logic is tightly coupled

### Proposed Architecture Split:

#### 1. **GenerationCoordinator** (New)
**Location**: `app/FilesManager/Services/GenerationCoordinator.php`
**Responsibilities**:
- Orchestrates when/what to regenerate based on triggers
- Implements idempotent operations with guards
- Manages regeneration strategy (single post vs. full vs. global)
- **Key Methods**:
  - `handlePostSave(postId, post, update)` - Smart save logic with guards
  - `handlePostRename(postId, postAfter, postBefore)` - Full regen trigger
  - `handlePostDeletion(postId)` - Full regen trigger
  - `shouldSkipRegeneration(postId, lastModified)` - Guard logic

#### 2. **ContentTypeProcessor** (New)
**Location**: `app/FilesManager/Services/ContentTypeProcessor.php`
**Responsibilities**:
- Maps content types to appropriate generators
- Determines output paths for each content type
- Validates content before processing
- **Key Methods**:
  - `processContentType(postId, post, contentType, outputPath)`
  - `getOutputPathForContentType(contentType, post)`
  - `validateContentForType(postId, contentType)`

#### 3. **GlobalRegenerator** (New)
**Location**: `app/FilesManager/Services/GlobalRegenerator.php`
**Responsibilities**:
- Detects global partial impacts
- Handles global file regeneration efficiently
- Manages cross-post dependencies
- **Key Methods**:
  - `detectGlobalImpact(postId, post)` - Check if affects global files
  - `regenerateGlobalDependencies()` - Regen affected posts only
  - `findPostsUsingGlobalPartials()` - Dependency detection

#### 4. **Enhanced FileWriter Interface** (Refactor existing)
**Location**: `app/FilesManager/Contracts/FileWriterInterface.php` + implementation
**Responsibilities**:
- Abstract all write operations behind interface
- Add idempotent operation support
- Enhanced validation and error handling
- **New Methods**:
  - `writeIfChanged(filepath, content)` - Idempotent writes
  - `deleteIfExists(filepath)` - Safe deletion
  - `isWriteRequired(filepath, content)` - Change detection

### Guards & Performance Optimizations:

#### **Edit Frequency Guards**:
- Track last modification timestamps per post
- Skip regeneration if content hasn't actually changed
- Debounce rapid successive saves (admin autosave protection)

#### **Full Regeneration Triggers** (Confirmed):
- Post rename operations (slug changes)
- Post deletion/trash operations
- Manual "force regenerate all" button

#### **Smart Regeneration**:
- Single post save: Only regen that post + global impact check
- Global SCSS partial save: Only regen dependent blocks
- Regular content save: Skip if no meta changes detected

### Migration Plan:

1. **Create new service classes** while keeping FilesManagerService
2. **Implement FileWriterInterface** and migrate existing FileWriter
3. **Update GenerationCoordinator** to use new architecture
4. **Replace FilesManagerService calls** in hooks and API controllers
5. **Remove old FilesManagerService** once migration complete
6. **Add performance guards** and idempotent operations

### Benefits:
- **Single Responsibility**: Each class has clear, focused purpose
- **Performance**: Guards prevent unnecessary full scans
- **Maintainability**: Easier to modify generation logic per content type
- **Testability**: Smaller, focused classes easier to unit test
- **Idempotency**: Safe to call operations multiple times

## Security and Capability Check Review

### Critical Security Issues Found:

#### 1. **REST API Permission Callbacks - INADEQUATE**
**Issues**:
- `checkPermissions()` only checks `current_user_can('edit_posts')` - too broad
- `checkCreatePermissions()` only checks `current_user_can('publish_posts')` - insufficient
- `checkDeletePermissions()` only checks `current_user_can('delete_posts')` - generic
- No post-specific capability checks (e.g., can user edit THIS specific post?)
- No validation that post belongs to correct post type before operations

**Required Fixes**:
- Add post-specific capability validation
- Verify post type matches expected type
- Check post ownership for sensitive operations
- Add role-based restrictions for file generation operations

#### 2. **Input Validation - MIXED/INCOMPLETE**
**Issues Found**:
- PHP code in `BlocksMetaBox` saved with `wp_unslash($_POST[$field])` - **DANGEROUS**
- Some fields use `sanitize_textarea_field()` for code content (loses formatting)
- JSON validation exists but doesn't prevent XSS in values
- No validation of file paths or dangerous content in SCSS/JS
- Missing validation for array structures in batch operations

**Required Fixes**:
- Implement proper code validation for PHP fields
- Add XSS protection for all user inputs
- Validate JSON structures and sanitize nested values
- Add CSRF token validation for sensitive operations
- Implement content filtering for executable code

#### 3. **Meta Box Security - PARTIALLY SECURE**
**Good practices found**:
- `AbstractMetaBox` properly implements nonce verification
- Checks `current_user_can('edit_post', $postId)`
- Prevents autosave interference

**Issues**:
- Single shared nonce for all metaboxes (should be unique per metabox)
- PHP code field bypasses all sanitization - **HIGH RISK**
- No validation of code content for malicious patterns

#### 4. **Missing Security Headers/Validation**
- No rate limiting on file generation endpoints
- No validation of file output paths (potential path traversal)
- Missing Content-Type validation for uploads
- No size limits on code/content fields

### Security Enhancement Plan:

#### **Phase 1: Critical Fixes**
1. **Strengthen Permission Callbacks**
   - Add post-specific capability checks
   - Verify post type before operations
   - Implement granular permissions per operation type

2. **Secure Code Input Handling**
   - Add code content validation (no `eval`, dangerous functions)
   - Implement proper PHP code sanitization
   - Add syntax validation before saving

3. **Enhanced Nonce Security**
   - Unique nonces per metabox type
   - Add nonce validation to all API endpoints

#### **Phase 2: Input Validation**
1. **Comprehensive Sanitization**
   - Validate all JSON structures and nested values
   - Add XSS protection for all text inputs
   - Implement file path validation

2. **Batch Operation Security**
   - Validate array structures in batch endpoints
   - Add limits on batch operation sizes
   - Implement rate limiting

#### **Phase 3: Additional Hardening**
1. **Content Security**
   - Add content filtering for executable code
   - Implement file size limits
   - Add logging for security events

2. **Access Control**
   - Add role-based restrictions
   - Implement operation-specific permissions
   - Add audit trail for sensitive operations

## Implementation Priority

1. **High Priority**: Security fixes (immediate risk)
2. **Medium Priority**: Hook placement and lifecycle (architectural improvement)
3. ⚡ **Medium Priority**: Structure organization (maintainability) - **75% COMPLETE**
4. **Lower Priority**: FilesManager refactoring (performance optimization)

## Recent Progress Summary

### ✅ Content Registration Restructuring COMPLETED
**What was accomplished:**
- Moved `Admin/Content/FunculoPostType.php` → `Content/FunculoPostType.php`
- Moved `Admin/Content/FunculoTypeTaxonomy.php` → `Content/FunculoTypeTaxonomy.php`
- Updated namespace from `Fanculo\Admin\Content` to `Fanculo\Content`
- Updated **18 files** across entire codebase with new imports
- Removed empty `Admin/Content/` directory
- All files pass PHP syntax validation

**Next Steps:**
- Complete Service/Hook naming consistency (FileGenerationHooks → FileGenerationService, etc.)
- Move to Hook Placement & Lifecycle refactoring
- Address Security fixes (highest priority)

---

# How to Split This Into Manageable Requests

## Request 1: Security Fixes (URGENT - 2-3 sessions)

**Ask Claude to:**
> "Fix the critical security issues in the REST API controllers and meta boxes. Focus on:
> 1. Strengthen permission callbacks with post-specific checks
> 2. Secure the PHP code input handling in BlocksMetaBox
> 3. Add proper input validation and sanitization
> 4. Implement unique nonces per metabox"

**Estimated effort:** 2-3 coding sessions
**Priority:** IMMEDIATE (security vulnerabilities exist)

---

## Request 2: Hook Placement & Lifecycle (1-2 sessions)

**Ask Claude to:**
> "Refactor the hook placement and lifecycle management:
> 1. Move REST route registration from Api.php to individual controllers
> 2. Make each controller register its own routes on rest_api_init
> 3. Fix post type/taxonomy registration priorities
> 4. Update App.php to delegate hook registration to classes"

**Estimated effort:** 1-2 coding sessions
**Priority:** Medium (architectural improvement)

---

## Request 3: Structure & Organization (1-2 sessions) ⚡ IN PROGRESS

**Ask Claude to:**
> ~~"Reorganize the directory structure and naming:~~
> ~~1. Move Admin/Content/ to Content/ (affects 18 files)~~ ✅ COMPLETED
> 2. Rename hook classes to service classes for consistency
> ~~3. Update all namespace imports across the codebase~~ ✅ COMPLETED
> ~~4. Clean up empty directories~~ ✅ COMPLETED

**Progress:**
- ✅ **Phase 1 Complete**: Content registration moved to neutral location
- 🔄 **Phase 2 Remaining**: Service/Hook naming consistency

**Estimated effort:** 0.5-1 coding session remaining
**Priority:** Medium (maintainability)

---

## Request 4: FilesManager Refactoring (2-3 sessions)

**Ask Claude to:**
> "Split FilesManagerService into smaller, focused services:
> 1. Create GenerationCoordinator for orchestration
> 2. Create ContentTypeProcessor for content type mapping
> 3. Create GlobalRegenerator for global partial impacts
> 4. Enhance FileWriter with idempotent operations
> 5. Add performance guards to prevent unnecessary regeneration"

**Estimated effort:** 2-3 coding sessions
**Priority:** Lower (performance optimization)

---

# Session Planning Tips

## For Each Request Session:

1. **Start with**: "I want to work on [specific request] from the update.md plan"
2. **Be specific**: Reference the exact section and tasks you want to focus on
3. **Set boundaries**: "Focus only on security fixes, don't touch other refactoring"
4. **Test after changes**: Ask Claude to run tests/lint after completing changes

## Sample Request Format:

```
I want to implement Request 1 from update.md - the security fixes.

Please focus specifically on:
- Fixing the permission callbacks in Api.php
- Securing the PHP code input in BlocksMetaBox.php
- Adding proper validation to API controllers

Don't make any other structural changes - just security fixes.
```

## Between Sessions:

- Test the changes thoroughly
- Commit your progress: `git add . && git commit -m "Security fixes - phase 1"`
- Note any issues for the next session
- Review the changes work as expected

## Order Recommendation:

1. **Do security first** - critical vulnerabilities need immediate fixing
2. **Do hook refactoring next** - sets up better architecture
3. **Do structure reorganization** - easier after hooks are cleaned up
4. **Do FilesManager last** - complex refactoring, lower priority

This approach lets you make steady progress while keeping each session focused and manageable.