# Claude Code Rules for Fanculo Plugin


## Implementation Best Practices

### 0 — Purpose  

These rules ensure maintainability, safety, and developer velocity. 
**MUST** rules are enforced by CI; **SHOULD** rules are strongly recommended.

---

### 1 — Before Coding

- **BP-1 (MUST)** Ask the user clarifying questions.
- **BP-2 (SHOULD)** Draft and confirm an approach for complex work.  
- **BP-3 (SHOULD)** If ≥ 2 approaches exist, list clear pros and cons.

---

### 2 — While Coding


#### C-1 (MUST) Tailwind-first styling
- Use Tailwind utility classes; consult theme tokens in `src/app/style.css` before adding styles.

#### C-2 (MUST) Minimal custom CSS
- Only keep exceptions in `src/app/styles/` (e.g., `reset-wp.css`, `form.css`) with a clear rationale.

#### C-3 (MUST) Align with Gutenberg core
- Compare approaches with `EXAMPLES/gutenberg-trunk/` and the [Block Editor Handbook](https://developer.wordpress.org/block-editor/). Avoid private/unstable APIs.

#### C-4 (SHOULD) Function design principles      
- Prefer small, composable, testable functions with single responsibility
- Use meaningful, domain-specific function names that clearly state intent
- Minimize cyclomatic complexity (prefer early returns over nested conditions)
- Extract functions only when: reused elsewhere, needed for testing, or clarifying opaque logic
- Avoid unnecessary class introductions - prefer functions when appropriate

#### C-5 (SHOULD) Component API and exports
- One component per file, PascalCase file names, prefer named exports, re-export via local `index.js` barrels (no side effects).

#### C-6 (MUST) Module boundaries
- Enforce the boundaries defined in “3 — Code Organization” (e.g., `assets/js` → no imports from `src/*`; `utils` → no imports from `app`). Add ESLint `import/no-restricted-paths`.

#### C-7 (SHOULD) Data fetching and effects
- Centralize HTTP in `src/utils/api/`. Keep presentational components side-effect free. Cancel async work on unmount.

#### C-8 (SHOULD) Performance
- Memoize heavy components, use `useCallback`/`useMemo` where beneficial, and virtualize long lists.

#### C-9 (MUST) Internationalization
- Use `@wordpress/i18n` (`__`, `_x`, `_n`) for all user-facing strings. No hardcoded UI text.

#### C-10 (MUST) Security (PHP + JS)
- Validate/sanitize input; escape output (`esc_html`, `esc_attr`, etc.). Use nonces for actions and prepared statements for DB. Never inject unsanitized HTML in JS.
- Follow sanitization standards defined in C-19 for consistent, secure input handling across all controllers

#### C-11 (MUST) PHP standards and namespaces
- Follow WordPress standards; PSR-4 under `Fanculo\…`; class names match files and directories.

#### C-12 (SHOULD) Errors and user feedback
- Route errors through `src/utils/errors/` (`ApiErrorHandler`, `SimpleErrorHandler`) and surface user-friendly toasts via `src/app/components/ui/Toast`.

#### C-13 (SHOULD) Accessibility
- Provide labels, ARIA attributes, keyboard navigation, and maintain focus order/visibility. Meet color-contrast requirements.

#### C-14 (SHOULD) Testing
- Write tests before implementing functionality (TDD approach)
- Add targeted unit tests for utilities and critical component logic
- Mirror file structure for tests (see O-13)
- Separate unit tests (pure logic) from integration tests (DB/WordPress interactions)
- Test edge cases, boundary conditions, and error scenarios

#### C-15 (MUST) `assets/js` constraints
- Plain browser-safe JS only (no JSX/bundler-only features). Do not import from `src/*`. Expose stable APIs/globals as needed.

#### C-16 (MUST) Linting and formatting
- Keep ESLint + Prettier clean. Run lint before commits. Do not suppress rules without justification.

#### C-17 (SHOULD) Documentation hygiene
- Update `README.md` and this guide when changing structure, scripts, or build behavior. Reference exact paths and rationale.

#### C-18 (MUST) Test file organization
- **NEVER** place test files (`.test.js`, `.spec.js`, `.html` test files) in project root
- **ALWAYS** organize test files in `/test/` folder with appropriate subdirectories:
  - Unit tests → `/test/unit/`
  - Integration tests → `/test/integration/`
  - Test fixtures/HTML → `/test/fixtures/`
  - E2E tests → `/test/e2e/`
- When creating new test files, immediately place them in the correct test subdirectory

#### C-19 (MUST) Sanitization standards and patterns
- **ALWAYS** use centralized `SanitizationService` for complex validation needs
- **NEVER** use `$this` context in closures within REST API validation callbacks
- **PREFER** simple WordPress functions (`sanitize_text_field`, `sanitize_textarea_field`) for straightforward cases
- **AVOID** complex trait methods in REST API route argument callbacks
- **Context-aware sanitization patterns**:
  - PHP/SCSS/JS code: Preserve content while ensuring string type, validate dangerous functions
  - JSON data: Validate JSON format, fallback to `{}` for invalid JSON

#### C-20 (MUST) Naming conventions across layers
- **Database columns**: `snake_case` (e.g., `attribute_name`, `supports_inner_blocks`, `is_global`)
- **PHP meta keys**: `snake_case` with `_funculo_` prefix (e.g., `_funculo_block_php`, `_funculo_scss_partial_scss`)
- **JavaScript/React variables**: `camelCase` (e.g., `globalPartials`, `availablePartials`, `innerBlocksSettings`)
- **API responses**: Automatically transformed from `snake_case` to `camelCase` via `ApiResponseFormatter` and `CaseTransformer`
- **HTML data attributes**: `kebab-case` (e.g., `data-post-id`, `data-type`)
- **URL slugs & taxonomy terms**: `kebab-case` (e.g., `"scss-partials"`)
- **Block attributes**: `camelCase` for consistency with JavaScript (e.g., `wowTestssss`)
- **Why**: Maintains WordPress/PHP conventions (snake_case) while providing clean JavaScript conventions (camelCase)
  - Boolean flags: Convert to `'1'`/`'0'` strings for WordPress meta compatibility
  - Integer values: Use `intval()` with min/max constraints
- **Testing requirement**: Always test API endpoints after sanitization changes
- **Bulk operations awareness**: Remember that editor may use bulk operations API, not individual CRUD endpoints


---


### 3 — Code Organization

#### O-1 (SHOULD) Components layering
- Reusable UI in `src/app/components/ui`, icons in `src/app/components/icons`, editor-only in `src/app/components/editor`.
- Use PascalCase filenames; one component per file; prefer named exports.
- Re-export via local `index.js` barrels; no side effects in barrels.

#### O-2 (SHOULD) Hooks and state separation
- Put shared React hooks in `src/app/hooks/` (named `useX`).
- Centralize app-wide context/store in `src/app/state/`. Editor-only state can live under `src/app/components/editor/` if tightly coupled.

#### O-3 (SHOULD) Utilities consolidation
- Consolidate under `src/utils/` with subfolders:
  - `api/` (HTTP client, interceptors)
  - `errors/` (error types/handlers)
  - `format/` (formatters)
  - `scss/` (SCSS helpers)
  - `wp/` (WordPress/Gutenberg helpers)
  - `examples/` (sample payloads)
- Move `src/app/utils/phpExamples.js` → `src/utils/examples/php.js` (or `src/shared/` if used beyond app).

#### O-4 (SHOULD) API and error layers
- Move/rename `src/utils/FunculoApiClient.js` → `src/utils/api/FanculoApiClient.js`.
- Keep `ApiErrorHandler.js` and `SimpleErrorHandler.js` in `src/utils/errors/` behind a consistent interface.

#### O-5 (SHOULD) Constants placement
- UI-only constants remain in `src/app/constants/`.
- Shared/runtime constants live in `src/shared/constants/`. Name with UPPER_SNAKE_CASE and group by domain.

#### O-6 (MUST) Module boundaries and import rules
- `assets/js/*` must not import from `src/*` (plain JS, shipped directly).
- `src/utils/*` must not import from `src/app/*`.
- `src/app/components/ui` must not depend on `src/app/components/editor` (but `editor` may depend on `ui` and `icons`).

#### O-7 (SHOULD) Assets for Gutenberg
- Keep `assets/js/` framework-free, browser-safe ES (no JSX/bundler-only features).
- Expose only stable globals/APIs (e.g., `window.Fanculo.*` or WP hooks). Document versioned changes in `README.md`.

#### O-8 (MUST) Styling policy alignment
- Use Tailwind first; keep exceptions minimal in `src/app/styles/` (e.g., `reset-wp.css`, `form.css`) with rationale.
- Avoid new ad-hoc CSS files; component styles via utility classes unless integrating third-party libraries.

#### O-9 (SHOULD) Naming conventions and barrels
- Components: PascalCase files; utilities: camelCase; directories: kebab-case.
- Keep `index.js` barrels per folder to define the public module API; avoid cross-reexports that create cycles.

#### O-10 (SHOULD) PHP domain boundaries
- Controllers: `app/Admin/Api/*Controller.php` (thin, single responsibility).
- Services: shared cross-domain services in `app/Services/`; generation-specific services in `app/FilesManager/Services/`; sanitization services in `app/Admin/Api/Services/`.
- Contracts/Interfaces colocated in `app/FilesManager/Contracts/` (or promote to `app/Contracts/` if reused beyond FilesManager).
- Generators in `app/FilesManager/Generators/` mapped 1:1 to output artifacts.
- Mappers in `app/FilesManager/Mappers/` with documented input/output shapes.
- Domain models and registration in `app/Content/` (optionally rename to `app/Domain/` for clarity).
- Meta boxes in `app/MetaBoxes/` with `*MetaBox.php` suffix; `AbstractMetaBox.php` is the base.
- Helpers in `app/Helpers/` remain stateless; stateful logic belongs in Services.
- Traits in `app/Admin/Api/Traits/` for shared controller functionality (sanitization, caching, etc.).
- Standardize namespaces under `Fanculo\{Area}\...` aligned with folders (PSR-4 `Fanculo\` → `app/`).

#### O-11 (SHOULD) Example target layout (JS)
```text
src/
  app/
    components/
      editor/
      ui/
      icons/
    hooks/
    state/
    constants/
  utils/
    api/
    errors/
    format/
    scss/
    wp/
    examples/
  shared/
    constants/
```

#### O-12 (SHOULD) Example target layout (PHP)
```text
app/
  Admin/
    Api/
      Controllers/
      Services/     (SanitizationService, etc.)
      Traits/       (SanitizationTrait, etc.)
  Content/          (or Domain/)
  FilesManager/
    Contracts/
    Generators/
    Mappers/
    Services/
  Services/
  MetaBoxes/
  Helpers/
```

#### O-13 (SHOULD) Testing locations (future-safe)
- JS: colocate `__tests__` next to modules or use `src/tests/` mirroring structure.
- PHP: `tests/phpunit/` mirroring `app/` namespaces.
- **Test files organization**: All standalone test files (`.js`, `.html`, `.spec.js`, `.test.js`) should be organized in the `/test/` folder:
  - `/test/unit/` - Pure unit tests with no external dependencies
  - `/test/integration/` - Integration tests that interact with APIs, databases, or WordPress
  - `/test/fixtures/` - Test HTML files, mock data, and test assets
  - `/test/e2e/` - End-to-end browser tests (if implemented)
  - Never place test files in project root - always organize them in appropriate test subdirectories

#### O-14 (SHOULD) Linting/enforcement
- Add ESLint rules (e.g., `import/no-restricted-paths`) to enforce boundaries in O-6.
- For PHP, enforce PSR-4 and layer rules via PHPStan/PHPCS annotations where helpful.


---


## 4 — Domain & App Logic

#### D-1 (MUST) Glossary & taxonomy
- **Block**: A content unit that renders in Gutenberg; has schema, view/render, and styles.
- **Symbol**: A reusable asset (e.g., SVG/icon) referenced by blocks or templates.
- **SCSS Partial**: A named SCSS fragment included in compiled styles; not emitted standalone.
- **Metabox**: Editor-side UI to manage block/symbol/SCSS metadata saved as post meta.
- **Type taxonomy**: Classifies items as `block`, `symbol`, `scss-partial` (exact slugs documented in code).

#### D-2 (MUST) Content model (CPTs & taxonomies)
- CPT defined in `app/Content/FunculoPostType.php`.
- Taxonomy defined in `app/Content/FunculoTypeTaxonomy.php` (maps items to Block/Symbol/SCSS Partial).
- Document:
  - Post meta keys (see `app/Admin/Api/Services/MetaKeysConstants.php`)
  - Required fields and validation rules
  - Slug and naming constraints (allowed chars, uniqueness)

#### D-3 (MUST) Generated files and destinations
- Generation orchestrated by `app/FilesManager/FilesManagerService.php` and `app/Services/FileGenerationService.php`.
- Generators:
  - `BlockJson.php`: emits `block.json`.
  - `Render.php` / `ViewJS.php`: PHP render/view templates.
  - `Style.php` / `EditorStyle.php`: compiled CSS with source maps.
  - `ScssPartial.php`: SCSS partials (consumed by build).
  - `Symbol.php`: symbol assets.
- Document exact output paths (plugin `dist/…` or theme paths), file naming, and how imports are wired into builds.

#### D-4 (SHOULD) Generation lifecycle
- Triggers:
  - Manual actions from the editor UI (single or bulk)
  - On save/update of a Funculo item
  - Bulk regeneration via `GlobalRegenerator` and `GenerationCoordinator`
- Guarantees:
  - Idempotent outputs
  - Safe overwrites (no orphan files)
  - Clear logs/errors surfaced in UI

#### D-5 (MUST) Editor UI & sidebar settings
- Main editor shells: `src/app/components/editor/*` (e.g., `EditorMain`, `EditorSettings`, `InnerBlocksSettings`, `ScssPartialsManager`).
- Document each settings panel:
  - Fields, validation, and mapping to post meta keys
  - Which generator(s) consume each setting
  - Any build-time vs runtime effects

#### D-6 (MUST) Admin API surface (overview)
- Controllers in `app/Admin/Api/`:
  - `PostsApiController.php`: CRUD/queries for items
  - `RegisteredBlocksApiController.php`: discoverable blocks
  - `BlockCategoriesApiController.php`: categories for editor
  - `TaxonomyApiController.php`: types/terms
  - `FileGenerationApiController.php`: single/bulk generation endpoints
  - `ScssCompilerApiController.php`: SCSS compile endpoints
- Add a separate API reference (paths, methods, payloads, errors) and link it here.

#### D-6a (MUST) API Response Standards
- **ALL** API controllers **MUST** use `ApiResponseFormatter` for responses
- **NEVER** return raw `WP_REST_Response` or `rest_ensure_response()` directly
- **ALWAYS** inject `ApiResponseFormatter` in controller constructor
- Response patterns to use:
  - Success: `$this->responseFormatter->success($data, $meta)`
  - Collection: `$this->responseFormatter->collection($items, $meta)`
  - Paginated: `$this->responseFormatter->paginated($items, $total, $page, $perPage)`
  - Created: `$this->responseFormatter->created($data, $meta)`
  - Updated: `$this->responseFormatter->updated($data, $meta)`
  - Deleted: `$this->responseFormatter->deleted($message, $meta)`
  - Item: `$this->responseFormatter->item($item, $meta)`
  - Empty: `$this->responseFormatter->empty($message)`
- Error patterns (returns WP_Error):
  - Validation: `$this->responseFormatter->validationError($errors)`
  - Not Found: `$this->responseFormatter->notFound($resource, $id)`
  - Permission: `$this->responseFormatter->permissionDenied($message)`
  - Server Error: `$this->responseFormatter->serverError($message)`
- Benefits: Consistent structure, automatic timestamps, proper metadata, standardized error handling
- Example:
  ```php
  class MyApiController {
      private $responseFormatter;

      public function __construct() {
          $this->responseFormatter = new ApiResponseFormatter();
      }

      public function getItems() {
          $items = get_items();
          return $this->responseFormatter->collection($items, ['total' => count($items)]);
      }
  }
  ```

#### D-6b (MUST) API Sanitization Standards
- **REST API validation patterns**: Use simple WordPress functions in validation callbacks to avoid closure context issues
- **Safe sanitization callback examples**:
  ```php
  // GOOD: Simple WordPress function
  'sanitize_callback' => 'sanitize_text_field'

  // GOOD: Simple closure with direct value handling
  'sanitize_callback' => function($value) {
      return min(100, max(1, intval($value)));
  }

  // BAD: Using $this in closure (causes fatal errors)
  'sanitize_callback' => function($value) {
      return $this->getSanitizationService()->sanitizeText($value);
  }
  ```
- **Complex sanitization**: Use dedicated methods in controller for complex sanitization, call them from simple closures
- **Bulk operations**: Remember to add file generation triggers to bulk update operations, not just individual CRUD endpoints
- **Testing protocol**: Always test API endpoints after sanitization changes; verify both individual and bulk operations work

#### D-7 (SHOULD) Metaboxes
- Definitions in `app/MetaBoxes/`:
  - `BlocksMetaBox.php`: block metadata
  - `SymbolsMetaBox.php`: symbol metadata
  - `SCSSPartialsMetaBox.php`: SCSS partial metadata
- Document: fields, save flow, and relation to generators.

#### D-8 (SHOULD) File/folder organization rationale
- JS boundaries: see "3 — Code Organization" (components/ui/icons/hooks/state/utils/shared).
- PHP boundaries: Admin API (thin controllers), Services (domain logic), FilesManager (I/O & generation), Content (CPT/Taxonomy), MetaBoxes (editor integration), Helpers (stateless utilities).
- Explain why each boundary exists and forbidden cross-dependencies.

#### D-9 (MUST) Invariants & constraints
- Naming: slugs stable and kebab-case; symbols/partials map 1:1 to filenames.
- Versioning: changes to generation format bump a manifest version and trigger full regen.
- Security: sanitize meta, escape outputs, nonces for write actions.

#### D-10 (SHOULD) Data flows & lifecycles
- Provide a high-level diagram/text:
  - Editor change → API save → Services update → Generators write → Build/compile (if needed) → Editor preview.
- Note debounce, background jobs, and error propagation strategy.

#### D-11 (SHOULD) Where to find things (quick map)
- APIs: `app/Admin/Api/*`
- Services: `app/Services/*`, `app/FilesManager/Services/*`, `app/Admin/Api/Services/*` (sanitization)
- Generators: `app/FilesManager/Generators/*`
- Mappers: `app/FilesManager/Mappers/*`
- Contracts: `app/FilesManager/Contracts/*`
- API Traits: `app/Admin/Api/Traits/*` (sanitization, caching, bulk operations)
- Editor UI: `src/app/components/editor/*`
- Reusable UI: `src/app/components/ui/*`
- Icons: `src/app/components/icons/*`
- Utilities: `src/utils/*` (API, errors, formatting, SCSS, WP)
- Gutenberg helpers shipped: `assets/js/*`

#### D-12 (SHOULD) How to extend
- Add a new type/term: register in taxonomy, define meta keys, add UI, implement generators, wire routes.
- Add a new generator: implement contract, register in coordinator, document outputs and destinations.


---


## 5 — Testing & Quality Assurance
#### T-1 (MUST) Testing strategy and separation
- Follow TDD: scaffold stub → write failing test → implement functionality
- ALWAYS separate pure-logic unit tests from DB-touching integration tests
- Prefer integration tests over heavy mocking for realistic scenarios
- Unit-test complex algorithms thoroughly with edge cases and boundary conditions

#### T-2 (SHOULD) Test quality guidelines        
- Parameterize test inputs to cover multiple scenarios
- Avoid trivial assertions that don't verify meaningful behavior
- Ensure test descriptions clearly state what is being verified
- Test edge cases, realistic inputs, and boundary conditions
- Mirror file structure for tests (see O-13)

#### T-3 (MUST) WordPress-specific testing
- Use WordPress test framework for integration tests
- Mock WordPress functions appropriately in unit tests
- Test custom post types, taxonomies, and meta field interactions
- Verify proper sanitization and escaping in output tests  


---

## 6 — Development Workflow
#### W-1 (MUST) Conventional commits
- Use standardized commit format: `type(scope): description`
- Types: feat, fix, docs, style, refactor, test, chore
- Include breaking change indicators when applicable
- Reference issue numbers in commit body

#### W-2 (SHOULD) Code review standards
- Review for security, performance, and accessibility issues
- Verify adherence to coding standards and conventions
- Check test coverage for new functionality
- Ensure documentation updates accompany code changes

#### W-3 (MUST) Automated quality gates
- All commits must pass ESLint + Prettier checks
- Unit tests must pass before merge
- PHP CodeSniffer must pass for WordPress standards
- No suppressions without documented justification

#### W-4 (SHOULD) Development workflow practices
- Always test builds after structural changes
- Use `FANCULO_DEV_MODE=true` in .env for development
- Run `npm run dev` for development with live reload
- Run `npm run build` for production builds


---


## 7 — Documentation Rules

### README.md Maintenance
- **ALWAYS** update README.md when making structural changes to the project
- Update README.md when:
  - Moving files or directories
  - Changing namespaces
  - Adding new scripts to package.json
  - Modifying build configuration
  - Adding new environment variables
  - Changing project structure

### Project Structure Documentation
- Keep the "Project Structure" section in README.md accurate
- Include all main directories and important files
- Add comments explaining what each file/directory does

### Build & Development Documentation
- Update scripts documentation when package.json changes
- Document new environment variables in the setup section
- Keep build configuration details current

### Code Standards
- Use `Fanculo\` as the root namespace (not `Marko\Fanculo\`)
- Follow WordPress coding standards
- Use descriptive class and method names
- PHP classes go in `/app/` directory with appropriate subdirectories
- React components go in `/src/` directory
- Built assets go in `/dist/` (auto-generated)
- Configuration files stay in project root

### When to Update README
Update README.md immediately after:
1. File/directory moves
2. Namespace changes
3. New dependencies or scripts
4. Build configuration changes
5. Environment variable additions
6. Major structural changes


---


## 8 — Development Shortcuts & Commands

### Quick Compare Commands

#### FCOMP - Framework Comparison
- **Usage**: `FCOMP [feature/pattern]`
- **Purpose**: Compare your implementation with Gutenberg core examples
- **Steps**:
  1. Check `EXAMPLES/gutenberg-trunk/` for similar patterns
  2. Review [Block Editor Handbook](https://developer.wordpress.org/block-editor/) documentation
  3. Identify differences and best practices
  4. Document findings and recommendations
- **Example**: `FCOMP block-controls` → Compare how you implement block controls vs core

#### BCOMP - Block Comparison
- **Usage**: `BCOMP [block-name]`
- **Purpose**: Compare block implementation with core blocks (both generated output and generator templates)
- **Steps**:
  1. **Compare Generated Output** (`fanculo-blocks/[block-name]/`):
     - Find similar core blocks in `EXAMPLES/gutenberg-trunk/packages/block-library/src/`
     - Compare `block.json` structure and attributes
     - Review `render.php` patterns and data handling
     - Check `view.js` and styling approaches
  2. **Compare Generator Templates** (`app/FilesManager/Generators/`):
     - Review `BlockJsonGenerator.php` → Compare with core block.json patterns
     - Check `RenderFileGenerator.php` → Compare with core render.php patterns
     - Analyze `ViewFileGenerator.php` → Compare with core view.js patterns
     - Examine `StyleFileGenerator.php` → Compare with core styling approaches
  3. **Identify Gaps**:
     - Note differences between your generators and core patterns
     - Update generator templates to match best practices
     - Regenerate blocks to apply improvements
- **Example**: `BCOMP heading` → Compare both `fanculo-blocks/heading/` output AND `app/FilesManager/Generators/` templates with core/heading

#### APICOMP - API Comparison
- **Usage**: `APICOMP [endpoint-type]`
- **Purpose**: Compare REST API patterns with WordPress core
- **Steps**:
  1. Check core REST API implementations
  2. Review `EXAMPLES/gutenberg-trunk/` for API usage patterns
  3. Verify security practices (nonces, permissions)
  4. Compare error handling approaches

### Code Generation Shortcuts

#### BGEN - Block Generator
- **Usage**: `BGEN [block-name] [category]`
- **Purpose**: Generate new block with all required files
- **Generates**:
  - `block.json` with proper structure
  - `render.php` with security best practices
  - `style.css` with source maps for debugging
  - `edit.js` with TypeScript support
- **Example**: `BGEN testimonial content` → Creates testimonial block in content category

#### SGEN - Symbol Generator
- **Usage**: `SGEN [symbol-name]`
- **Purpose**: Create reusable PHP symbol component
- **Generates**:
  - PHP class with proper namespace
  - Meta field definitions
  - Sanitization/validation logic
- **Example**: `SGEN social-icons` → Creates social icons symbol

#### PGEN - Partial Generator
- **Usage**: `PGEN [partial-name]`
- **Purpose**: Create SCSS partial with proper structure
- **Generates**:
  - SCSS partial file with imports
  - Variable definitions
  - Mixin structure
- **Example**: `PGEN button-styles` → Creates button styling partial

### Development Workflow Shortcuts

#### DEVUP - Development Setup
- **Usage**: `DEVUP`
- **Purpose**: Quick development environment start
- **Actions**:
  - Run `npm run dev` for live reload
  - Enable `FANCULO_DEV_MODE=true` in .env
  - Start file watchers
  - Open browser to admin panel

#### BUILDCHECK - Build Verification
- **Usage**: `BUILDCHECK`
- **Purpose**: Comprehensive build and quality check
- **Actions**:
  - Run `npm run build` and verify success
  - Check for TypeScript errors
  - Verify ESLint compliance
  - Test generated blocks in editor
  - Validate CSS compilation

#### APITEST - API Testing
- **Usage**: `APITEST [controller]`
- **Purpose**: Test API endpoints and security
- **Actions**:
  - Test all endpoints in `app/Admin/Api/`
  - Verify nonce security implementation
  - Check input sanitization/output escaping
  - Validate error handling and responses
- **Example**: `APITEST FileGeneration` → Test file generation endpoints

#### GUTCHECK - Gutenberg Compatibility Check
- **Usage**: `GUTCHECK`
- **Purpose**: Verify compatibility with latest Gutenberg
- **Actions**:
  - Compare with `EXAMPLES/gutenberg-trunk/` patterns
  - Test block registration and rendering
  - Verify editor UI consistency
  - Check for deprecated API usage

### Quick Reference Commands

#### METAKEYS - List All Meta Keys
- **Usage**: `METAKEYS`
- **Purpose**: Quick reference to all meta field constants
- **Shows**: Contents of `app/Admin/Api/Services/MetaKeysConstants.php`

#### APIMAP - API Endpoint Map
- **Usage**: `APIMAP`
- **Purpose**: List all available API endpoints
- **Shows**: All controllers in `app/Admin/Api/` with routes and methods

#### GENMAP - Generator Map
- **Usage**: `GENMAP`
- **Purpose**: List all available file generators
- **Shows**: All generators in `app/FilesManager/Generators/` with purposes

#### FPULL - Write pull requests desctipion
- **Usage**: `FPULL`
- **Purpose**: Generate a simple 1-2 paragraph pull request description explaining what was changed, without technical details, file lists, or impact sections

