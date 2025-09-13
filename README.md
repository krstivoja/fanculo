# Fanculo WordPress Plugin

A WordPress plugin with React frontend built using esbuild.

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Build Assets
No additional configuration needed - the build process automatically determines the mode.

## Development

### Start Development Server
```bash
npm run dev
```

This will:
- Build your React app with esbuild
- Watch for file changes and rebuild automatically
- Start a LiveReload server on port 35729
- Auto-reload your browser when files change

### Build for Production
```bash
npm run build
```

This creates a minified production build in the `/dist` folder.

## Project Structure

```
/src/
  ├── main.tsx                    # React entry point
  ├── App.tsx                     # Main React component
/app/
  ├── App.php                     # Main application initialization
  ├── Admin/
  │   └── SettingsPage.php        # WordPress admin page
  ├── Helpers/
  │   └── AdminAssets.php         # Admin asset loading class
/dist/                            # Built assets (auto-generated)
build.js                          # esbuild configuration
fanculo.php                       # Main plugin file
```

## How It Works

1. **Application Bootstrap**: `App.php` handles all plugin initialization using singleton pattern
2. **React App**: Located in `/src/`, the React app mounts to a `#app` div in the WordPress admin
3. **Asset Loading**: `AdminAssets.php` handles loading the built JavaScript and CSS files
4. **Live Reload**: In development mode (`.dev-mode` file exists), LiveReload script is automatically injected
5. **WordPress Integration**: The admin page is created via `SettingsPage.php`
6. **Namespace**: Uses `Fanculo\` namespace (e.g., `Fanculo\Admin\SettingsPage`)

## Usage

### Adding New React Components
1. Create new components in `/src/`
2. Import them in `App.tsx`
3. Run `npm run dev` to see changes with live reload

### WordPress Admin Page
Navigate to **WordPress Admin → Fanculo** to see your React app.

### Build Modes

The build process automatically determines the mode:

- **Development Mode** (`npm run dev`):
  - Enables livereload script injection
  - Creates `.dev-mode` marker file
  - Watches for file changes
  - Use for active development

- **Production Mode** (`npm run build`):
  - Disables livereload
  - Removes `.dev-mode` marker file
  - Creates minified assets
  - Use for testing/staging/production

## Build Configuration

The build is configured in `build.js` with:
- **esbuild** for fast bundling
- **JSX** with React 19
- **File loaders** for images and assets
- **Source maps** in development
- **Minification** in production
- **LiveReload** integration

## Scripts

- `npm run dev` - Development build with watch mode and live reload
- `npm run build` - Production build with minification

## Requirements

- Node.js
- WordPress
- PHP 7.4+

## Dependencies

- **esbuild** - Fast JavaScript bundler
- **React 19** - UI library
- **@jgoz/esbuild-plugin-livereload** - Integrated live reload for esbuild