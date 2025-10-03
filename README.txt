=== FanCoolo ===
Contributors: markokrstic
Tags: gutenberg, blocks, builder, custom-blocks, react
Requires at least: 5.0
Tested up to: 6.8
Requires PHP: 8.0
Stable tag: 0.0.1
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Build Gutenberg blocks without screaming at the screen. A powerful block builder with React frontend.

== Description ==

FanCoolo is a comprehensive WordPress plugin that allows you to build custom Gutenberg blocks with ease. It features a React-based admin interface and a sophisticated file generation system that automatically creates all necessary block files.

**Key Features:**

* **Visual Block Builder**: Create custom Gutenberg blocks with an intuitive React interface
* **Automatic File Generation**: Automatically generates render.php, view.js, style.scss, and block.json files
* **Symbol Management**: Create reusable PHP symbols for your blocks
* **SCSS Partials**: Organize your styles with reusable SCSS partials
* **Global SCSS**: Define global styles that affect all blocks
* **Live Development**: Real-time preview with live reload during development
* **Type System**: Organize content with custom taxonomy types (blocks, symbols, scss-partials)

**Perfect for:**

* WordPress developers building custom blocks
* Agencies creating branded block libraries
* Theme developers needing custom functionality
* Anyone who wants to extend Gutenberg without the complexity

**Developer-Friendly:**

* Modern React 19 frontend
* Clean, maintainable code architecture
* Comprehensive file generation system
* REST API for all operations
* WordPress coding standards compliant

== Installation ==

1. Upload the plugin files to the `/wp-content/plugins/fancoolo` directory, or install the plugin through the WordPress plugins screen directly.
2. Activate the plugin through the 'Plugins' screen in WordPress.
3. Navigate to 'FanCoolo' in your WordPress admin menu to start building blocks.

== Frequently Asked Questions ==

= What is FanCoolo? =

FanCoolo is a Gutenberg block builder that helps you create custom blocks without dealing with complex setup and configuration.

= Do I need coding knowledge? =

Basic knowledge of HTML, CSS, and PHP is helpful, but the plugin provides a user-friendly interface for creating blocks.

= Can I create reusable components? =

Yes! You can create symbols (PHP components) and SCSS partials that can be reused across multiple blocks.

= Does it work with any theme? =

Yes, FanCoolo works with any WordPress theme that supports Gutenberg blocks.

= Is it compatible with WordPress multisite? =

Yes, FanCoolo is fully compatible with WordPress multisite installations.

== Screenshots ==

1. Main block builder interface with React frontend
2. Block creation form with all available options
3. Generated block files in the file system
4. SCSS partials management interface
5. Symbol components library

== Changelog ==

= 0.0.1 =
* Initial release
* React-based admin interface
* Automatic file generation system
* Support for blocks, symbols, and SCSS partials
* Global SCSS functionality
* REST API endpoints
* Live reload development environment

== Upgrade Notice ==

= 0.0.1 =
Initial release of FanCoolo block builder plugin.

== Developer Information ==

**Built with:**
* React 19
* esbuild for fast bundling
* WordPress REST API
* Modern PHP architecture

**File Generation:**
The plugin automatically generates all necessary files for your blocks:
* `render.php` - Server-side rendering
* `view.js` - Frontend JavaScript
* `style.scss` - Block styles
* `block.json` - Block configuration

**Architecture:**
* Clean separation of concerns
* Modular file generators
* Comprehensive caching system
* WordPress coding standards compliant

For more technical documentation, visit the plugin's GitHub repository.