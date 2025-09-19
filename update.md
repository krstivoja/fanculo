# Fanculo Plugin Update Plan


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

This approach lets you make steady progress while keeping each session focused and manageable.