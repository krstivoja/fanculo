Without _dev.php (Manual Development)

  You can develop without it by:
  1. Running npm run dev in the src/ directory
  2. Building for production with npm run build
  3. WordPress will load the built assets from dist/

  With _dev.php (Automatic Hot Reload)

  When _dev.php exists, WordPress automatically:
  - Detects you're in development mode
  - Loads assets directly from Vite dev server (localhost:5174)
  - Enables React Fast Refresh and hot reload
  - No need to rebuild - changes appear instantly

  To Enable Hot Reload:

  Simply ensure the _dev.php file exists in your plugin root (it's already created). When you run npm run dev, WordPress will automatically switch to
  development mode.

  To Disable:

  Delete or rename _dev.php - WordPress will fall back to loading built assets from dist/.

  Recommendation: Keep _dev.php for the best development experience with instant hot reload!

