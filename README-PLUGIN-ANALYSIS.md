# Fanculo Plugin - Architecture & Purpose Analysis

> **Note**: This README is for reference and understanding of the original Gutenberg Studio plugin functionality, now being refactored as "Fanculo"

## 🎯 Plugin Purpose

**Fanculo** (formerly Gutenberg Studio) is a WordPress plugin that provides a visual, no-code/low-code interface for creating custom native Gutenberg blocks. It bridges the gap between design and development by offering a comprehensive development environment within WordPress.

## 🏗️ Core Architecture

### Backend (PHP)
```
app/
├── App.php                 # Main application bootstrap
├── Admin/                  # WordPress admin integration
├── Blocks/                 # Block management system
│   ├── LoadBlocks/        # Block loading and registration
│   ├── RegisterBlocks/    # Block registration logic
│   └── SaveBlocks/        # Block saving and file generation
├── Reusable/              # Reusable component management
├── Scss/                  # SCSS component system
├── Backup/                # Backup and restore system
├── EDDUpdater/            # License management
└── Support/               # Helper classes and utilities
```

### Frontend (React)
```
src/
├── pages/
│   ├── blocks/            # Main block editor interface
│   ├── reusable/          # Reusable components editor
│   ├── scss/              # SCSS components editor
│   ├── settings/          # Plugin settings
│   └── licence/           # License management
├── _library/
│   ├── components/        # Shared React components
│   ├── context/           # React context providers
│   ├── hooks/             # Custom React hooks
│   ├── monaco/            # Monaco Editor integration
│   └── services/          # API and utility services
```

## 🔧 Core Functionality

### 1. Component Types
The plugin manages three main types of components:

- **📦 Blocks** (`gbs_block`): Full Gutenberg blocks with complete functionality
- **🔄 Reusable Components** (`gbs_reusable`): Smaller UI elements shared across blocks  
- **🎨 SCSS Components** (`gbs_scss`): Style modules for consistent design system

### 2. Block Creation Workflow
1. **Create Block**: User defines block metadata (title, icon, category)
2. **Code Editor**: Write PHP render code using Monaco Editor (VS Code-like interface)
3. **Styling**: Add SCSS styles with real-time compilation
4. **Attributes**: Configure block attributes using visual attribute manager
5. **Generation**: Plugin automatically generates WordPress-compliant files:
   - `block.json` - Block configuration
   - `index.js` - JavaScript registration
   - `render.php` - Server-side rendering
   - `style.css` - Compiled styles
   - Asset files and dependencies

### 3. Key Features

#### Monaco Editor Integration
- VS Code-like editing experience
- Syntax highlighting for PHP, JavaScript, SCSS
- IntelliSense and code completion
- Emmet support for HTML/CSS
- Multiple themes (light/dark)
- Custom language configurations

#### Attribute Management System
- Visual builder for block attributes
- Support for various input types:
  - Text, Textarea, Number, Range
  - Color picker, Image uploader  
  - Checkbox, Toggle, Radio, Select
  - Date picker, Link selector
- Automatic JavaScript generation
- Server-side attribute processing

#### Real-time Development
- Live preview of blocks as they're built
- Frontend synchronization for testing
- Debounced auto-save functionality
- Hot reloading in development mode

## 📁 Generated File Structure

When a block is created, the plugin generates a complete WordPress block structure:

```
/wp-content/plugins/gutenberg-blocks/[block-name]/
├── block.json          # WordPress block configuration
├── index.js           # JavaScript for Gutenberg editor
├── index.asset.php    # Asset dependencies
├── render.php         # Server-side rendering (PHP)
├── style.css          # Frontend styles (compiled SCSS)
├── editor.css         # Editor-specific styles (optional)
└── view.js           # Frontend JavaScript (optional)
```

## 🗄️ Database Schema

### Custom Post Types
- **`gbs_block`**: Stores block data and code
- **`gbs_reusable`**: Stores reusable component data
- **`gbs_scss`**: Stores SCSS component data

### Meta Fields
- `_block_code`: PHP render code
- `_block_style`: SCSS styling code
- `_block_attributes`: JSON attribute configuration
- `_block_options`: Block settings and configuration
- Various other meta fields for component-specific data

## 🔄 User Workflows

### Creating a New Block
1. Navigate to plugin admin interface
2. Click "Create New Block" 
3. Enter block metadata (name, category, icon, description)
4. Write PHP render code in Monaco editor
5. Add SCSS styles in style tab
6. Configure block attributes using visual builder
7. Save - plugin generates all WordPress files automatically
8. Block immediately available in Gutenberg editor

### Managing Components
1. Browse organized list of blocks/components
2. Search and filter by categories
3. Edit existing components with live preview
4. Duplicate components for quick variations
5. Export/import for sharing between sites
6. Backup and restore functionality

## ⚡ Technical Implementation

### Code Generation Templates
The plugin uses PHP template classes to generate WordPress-compliant code:

```php
// Example: Block generation process
Templates/
├── BlockJson.php      # Generates block.json
├── Index.php          # Generates index.js
├── Render.php         # Generates render.php
├── Style.php          # Generates style.css
└── Components/        # Attribute-specific generators
```

### API Integration
- WordPress REST API endpoints for CRUD operations
- Real-time synchronization between editor and frontend  
- Nonce-based security for API requests
- Custom endpoints for block operations

### Build System
- WordPress Scripts (Webpack) for JavaScript compilation
- Tailwind CSS for utility-first styling
- PostCSS for CSS processing
- SCSS compilation with custom pipeline
- Development server with hot module replacement

## 🔒 Security Considerations

### Strengths
- WordPress nonce verification
- Capability checks for user permissions
- License validation system
- Sanitized input handling

### Areas of Concern
- Allows PHP code execution (requires careful sandboxing)
- File system write operations
- Potential for XSS if user input not properly escaped

## 🚀 Current Refactoring (Fanculo v2)

The plugin is being refactored into a modern React/TypeScript application with:

### New Architecture
- **React 18** with TypeScript
- **WordPress Components** for consistent UI
- **Vite** for faster development builds
- **Tailwind CSS 4** for styling
- Modular component architecture

### Improvements
- Better code organization and separation of concerns
- Modern development tooling
- Improved performance and bundle size
- Enhanced user experience with WordPress-native components
- Better TypeScript support and type safety

### Current State
- ✅ Basic project structure setup
- ✅ Navigation with custom icons
- ✅ Post management (CRUD operations) 
- ✅ Modal system with WordPress components
- ✅ Sidebar component extraction
- ✅ WordPress styling integration
- 🔄 Form management and editor interface (in progress)

## 📚 Learning Resources

### Key Files to Study
- `_test/gutenberg-studio/PLUGIN_ARCHITECTURE.md` - Detailed architecture docs
- `_test/gutenberg-studio/app/Blocks/SaveBlocks/Templates/` - Code generation examples
- `_test/gutenberg-studio/src/pages/blocks/App.js` - Main React application
- `_test/gutenberg-studio/_learnings/` - Development insights and documentation

### Notable Patterns
- **Template-based Code Generation**: PHP classes generate WordPress files
- **Context-driven State Management**: React contexts for feature isolation
- **Monaco Editor Integration**: Advanced code editing capabilities
- **Real-time Synchronization**: Live preview and testing systems
- **Component Reusability**: Shared libraries and templates

This analysis provides the foundation for understanding the plugin's purpose and guiding the ongoing refactoring efforts into the modern Fanculo v2 architecture.