/**
 * Global type declarations for the Fanculo WordPress plugin
 */

declare global {
  interface Window {
    fanculo_ajax: {
      ajax_url: string;
      nonce: string;
      plugin_url: string;
      plugin_version: string;
      is_dev: boolean;
      detected_port: number | null;
      types: string[];
      type_labels: Record<string, string>;
      type_icons: Record<string, string>;
      settings: Record<string, any>;
      default_settings: Record<string, any>;
      license: Record<string, any>;
      user_can: {
        manage_options: boolean;
        edit_posts: boolean;
        delete_posts: boolean;
      };
    };
  }
}

// This export statement is required to make this file a module
// and prevent TypeScript from treating it as a script file
export {};
