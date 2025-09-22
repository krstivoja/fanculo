/**
 * ===========================================
 * ATTRIBUTE CONSTANTS FOR FANCULO
 * ===========================================
 */

// Available attribute types with labels and values
export const ATTRIBUTE_TYPES = [
  { label: "Text", value: "text" },
  { label: "Textarea", value: "textarea" },
  { label: "Number", value: "number" },
  { label: "Range", value: "range" },
  { label: "Date", value: "date" },
  { label: "Image", value: "image" },
  { label: "Link", value: "link" },
  { label: "Color", value: "color" },
  { label: "Select", value: "select" },
  { label: "Toggle", value: "toggle" },
  { label: "Checkbox", value: "checkbox" },
  { label: "Radio", value: "radio" },
];

// Attribute types that require options
export const ATTRIBUTE_TYPES_WITH_OPTIONS = ["select", "radio"];

// Attribute types that require range settings
export const ATTRIBUTE_TYPES_WITH_RANGE = ["range"];

// Attribute types that should never have options
export const ATTRIBUTE_TYPES_WITHOUT_OPTIONS = [
  "number",
  "range",
  "text",
  "textarea",
  "date",
  "color",
  "toggle",
  "checkbox",
  "image",
  "link",
];

// Default new attribute structure
export const DEFAULT_NEW_ATTRIBUTE = {
  type: "text",
  name: "",
  id: "", // Will be set dynamically with timestamp
  order: 0,
  options: [], // Only added for types that need options
};

// Default option structure for select/radio attributes
export const DEFAULT_ATTRIBUTE_OPTION = {
  label: "",
  value: "",
};

// Default range structure for range attributes
export const DEFAULT_ATTRIBUTE_RANGE = {
  max: 100,
};

/**
 * ===========================================
 * FORM FIELD DEFAULTS
 * ===========================================
 */

// Placeholder text for form fields
export const PLACEHOLDER_TEXT = {
  ATTRIBUTE_NAME: "Attribute name",
  OPTION_LABEL: "Label",
  OPTION_VALUE: "Value",
  RANGE_MAX: "Max value",
};

// Button text constants
export const BUTTON_TEXT = {
  ADD_ATTRIBUTE: "+ Add attribute",
  ADD_OPTION: "+ Add Option",
};

// ARIA labels for accessibility
export const ARIA_LABELS = {
  DRAG_TO_REORDER: "Drag to reorder",
  DELETE_ATTRIBUTE: "Delete attribute",
  DELETE_OPTION: "Delete option",
};

/**
 * ===========================================
 * VALIDATION RULES
 * ===========================================
 */

// Validation constants
export const VALIDATION_RULES = {
  MIN_ATTRIBUTE_NAME_LENGTH: 1,
  MAX_ATTRIBUTE_NAME_LENGTH: 50,
  REQUIRED_FIELDS: ["name", "type"],
  ALLOWED_ATTRIBUTE_TYPES: ATTRIBUTE_TYPES.map((type) => type.value),
};

/**
 * ===========================================
 * ERROR MESSAGES
 * ===========================================
 */

// Default error messages
export const ERROR_MESSAGES = {
  ATTRIBUTE_PARSE_ERROR: "Failed to parse block attributes",
  GENERAL_ATTRIBUTE_ERROR: "Error parsing attributes",
  COPY_CODE_ERROR: "Failed to copy code",
  HIGHLIGHTING_ERROR: "Highlighting error",
};