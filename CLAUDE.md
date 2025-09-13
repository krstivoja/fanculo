# Claude Code Rules for Fanculo Plugin

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