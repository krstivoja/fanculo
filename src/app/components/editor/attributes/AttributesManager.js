import React, { useState, useEffect } from "react";
import { Button } from "../../ui";
import { useAttributeOperations } from "./hooks/useAttributeOperations";
import AttributeItem from "./AttributeItem";
import { BUTTON_TEXT } from "../../../constants/attributes.js";

/**
 * Main AttributesManager component - orchestrates all attribute management functionality
 */
const AttributesManager = ({
  blockMeta,
  onMetaChange,
  blockId,
  postId: propPostId,
}) => {
  const [localAttributes, setLocalAttributes] = useState([]);

  const parseAttributes = () => {
    if (!blockMeta?.attributes) {
      return [];
    }

    try {
      const parsed =
        typeof blockMeta.attributes === "string"
          ? JSON.parse(blockMeta.attributes)
          : blockMeta.attributes;

      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("Failed to parse attributes:", e);
      return [];
    }
  };

  useEffect(() => {
    setLocalAttributes(parseAttributes());
  }, [blockMeta?.attributes]);

  const updateParentStateWithAttributes = (newAttributes) => {
    setLocalAttributes(newAttributes);
    const attributesJson = JSON.stringify(newAttributes, null, 2);
    onMetaChange("blocks", "attributes", attributesJson);
  };

  const operationHandlers = useAttributeOperations(
    localAttributes,
    updateParentStateWithAttributes
  );

  return (
    <div className="attributes-manager max-h-[calc(100vh-200px)] h-full overflow-y-auto flex flex-col">
      {/* Header with Add Attribute button */}
      <div className="flex justify-between items-center pb-4">
        <h3 className="text-lg font-medium text-highlight">Block Attributes</h3>
        <Button
          variant="secondary"
          onClick={operationHandlers.addAttribute}
          className="add-attribute-button"
        >
          {BUTTON_TEXT.ADD_ATTRIBUTE}
        </Button>
      </div>

      {/* Empty state */}
      {localAttributes.length === 0 && (
        <p className="text-contrast text-center py-8">
          No attributes defined. Click "Add attribute" to create one.
        </p>
      )}

      {/* Attributes list */}
      <div className="attribute-rows min-h-[100px] max-h-full overflow-y-auto overflow-x-hidden space-y-2 px-4">
        {localAttributes.map((attribute, index) => (
          <AttributeItem
            key={attribute.id || index}
            attribute={attribute}
            index={index}
            operationHandlers={operationHandlers}
            onBlur={() => {}}
          />
        ))}
      </div>
    </div>
  );
};

export default AttributesManager;
