# Fanculo WordPress Plugin

A WordPress plugin with React frontend built using esbuild.

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Development Mode
Set up your environment by editing the `.env` file:
```bash
FANCULO_DEV_MODE=true
```

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
  ├── Admin/
  │   └── SettingsPage.php        # WordPress admin page
  ├── Helpers/
  │   └── EsbuildAssets.php       # Asset loading class
/dist/                            # Built assets (auto-generated)
build.js                          # esbuild configuration
fanculo.php                       # Main plugin file
.env                              # Environment configuration
```

## How It Works

1. **React App**: Located in `/src/`, the React app mounts to a `#app` div in the WordPress admin
2. **Asset Loading**: `EsbuildAssets.php` handles loading the built JavaScript files
3. **Live Reload**: In development mode (`FANCULO_DEV_MODE=true`), LiveReload script is automatically injected
4. **WordPress Integration**: The admin page is created via `SettingsPage.php`
5. **Namespace**: Uses `Fanculo\` namespace (e.g., `Fanculo\Admin\SettingsPage`)

## Usage

### Adding New React Components
1. Create new components in `/src/`
2. Import them in `App.tsx`
3. Run `npm run dev` to see changes with live reload

### WordPress Admin Page
Navigate to **WordPress Admin → Fanculo** to see your React app.

### Environment Modes
- **Development**: Set `FANCULO_DEV_MODE=true` in `.env` for live reload
- **Production**: Set `FANCULO_DEV_MODE=false` or remove the line

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
- **livereload** - Development live reload functionality