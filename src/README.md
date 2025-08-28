# Fanculo WP React Settings

## Development Setup

1. Navigate to the src directory:
```bash
cd src/
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

This will start Vite dev server on `http://localhost:5174` with hot reload enabled.

## Building for Production

```bash
npm run build
```

This will create a `dist/` folder in the plugin root with the built assets.

## How it Works

- **Development**: The `_dev.php` file configures WordPress to load assets from the Vite dev server
- **Production**: WordPress loads the built assets from the `dist/` folder using the Vite manifest
- **Hot Reload**: React Fast Refresh is enabled automatically in development mode
- **Tailwind CSS v4**: Uses the new Vite plugin approach with `@import "tailwindcss"` - no config files needed!

## File Structure

```
src/
├── package.json
├── vite.config.ts        # Includes @tailwindcss/vite plugin
├── tsconfig.json
├── index.html
└── src/
    ├── main.tsx          # Entry point
    ├── App.tsx           # Main React app
    ├── index.css         # @import "tailwindcss" + CSS variables
    ├── lib/
    │   └── utils.ts      # Utility functions
    └── components/
        └── ui/           # UI components
```

## Tailwind CSS v4 Features

- **Zero Config**: No `tailwind.config.js` or `postcss.config.js` needed
- **Vite Plugin**: Seamless integration with `@tailwindcss/vite`
- **Modern Import**: Uses `@import "tailwindcss"` syntax
- **CSS Variables**: Design system built with CSS custom properties