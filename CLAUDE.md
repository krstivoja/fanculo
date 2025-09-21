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

- **C-1 SHOULD** Use tailwindcss class names instead of creatingnew css files. 
- **C-2 MUST**  check tailwind theme config src/app/style.css so we do not use always defaults
- **C-3 MUST**  check in ./EXAMPLES/gutenberg-trunk/ for latest gutenberg code, best practices, compatibility and how gutenberg is doing things and compare with out sulutions 
- **C-4 SHOULD**  check for latest Official documntation https://developer.wordpress.org/block-editor/
- **C-5 (SHOULD)** Prefer simple, composable, testable functions.
- **C-6 (SHOULD NOT)** Extract a new function unless it will be reused elsewhere, is the only way to unit-test otherwise untestable logic, or drastically improves readability of an opaque block.

### 3 — Code Organization

- **O-1 (Should)** When createing new code extract small components if they can be reused in `src/app/components/ui` same as for best practices in react
- **O-2 (Should)** Icons components should be in  `src/app/components/icons`
- **O-3 (Should)** App parts  should be in  `src/app/components/editor`
- **O-4 (Should)** parserse and extra reusable functions that are loaded in gutenberg are in  `assets/js` those should be shiped with plugin production. They do not need to be compiled as they are written in plain js. And will not be aloded in fanculo app, it will be loaded in gutenberg editor


## Documentation Rules

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

## Code Standards

### Namespace Convention
- Use `Fanculo\` as the root namespace (not `Marko\Fanculo\`)
- Follow WordPress coding standards
- Use descriptive class and method names

### File Organization
- PHP classes go in `/app/` directory with appropriate subdirectories
- React components go in `/src/` directory
- Built assets go in `/dist/` (auto-generated)
- Configuration files stay in project root

## Development Workflow
- Always test builds after structural changes
- Use `FANCULO_DEV_MODE=true` in .env for development
- Run `npm run dev` for development with live reload
- Run `npm run build` for production builds

## When to Update README
Update README.md immediately after:
1. File/directory moves
2. Namespace changes
3. New dependencies or scripts
4. Build configuration changes
5. Environment variable additions
6. Major structural changes




