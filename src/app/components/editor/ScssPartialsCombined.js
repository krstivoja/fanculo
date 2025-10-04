import React from "react";
import ScssPartialsManager from "./ScssPartialsManager";

const ScssPartialsCombined = ({
  selectedPost,
  metaData,
  onMetaChange,
  sharedData,
  dataLoading,
}) => {
  // Get partials data from shared data (no API call needed)
  const globalPartials = sharedData?.scssPartials?.globalPartials || [];
  const availablePartials = sharedData?.scssPartials?.availablePartials || [];
  const loading = dataLoading?.scssPartials || false;

  if (loading) {
    return (
      <div className="p-4 text-center text-contrast">Loading partials...</div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 space-y-6 overflow-y-auto">
      {/* Global Partials Section - Shown once at the top */}
      {globalPartials.length > 0 && (
        <div>
          <h4 className="font-medium text-highlight mb-3 flex items-center gap-2">
            🌍 Global Partials
            <span className="text-xs bg-action text-white px-2 py-1 rounded">
              Auto-included
            </span>
          </h4>
          <div className="space-y-2">
            {globalPartials.map((partial) => (
              <div
                key={partial.id}
                className="flex items-center gap-3 p-3 bg-base-2 border border-outline rounded opacity-75"
              >
                <span className="flex-1 text-sm">{partial.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Style Partials Section */}
      <div className="pt-4 border-t border-outline">
        <h4 className="font-medium text-highlight mb-3">
          Frontend Style Partials
        </h4>
        <ScssPartialsManager
          selectedPost={selectedPost}
          metaData={metaData}
          onMetaChange={onMetaChange}
          mode="style"
          hideGlobalPartials={true}
          sharedData={sharedData}
          dataLoading={dataLoading}
        />
      </div>

      {/* Editor Style Partials Section */}
      <div className="pt-4 border-t border-outline">
        <h4 className="font-medium text-highlight mb-3">
          Editor Style Partials
        </h4>
        <ScssPartialsManager
          selectedPost={selectedPost}
          metaData={metaData}
          onMetaChange={onMetaChange}
          mode="editorStyle"
          hideGlobalPartials={true}
          sharedData={sharedData}
          dataLoading={dataLoading}
        />
      </div>
    </div>
  );
};

export default ScssPartialsCombined;
