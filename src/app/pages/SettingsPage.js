import React from "react";
import Header from "../components/editor/Header";

const SettingsPage = () => {
  return (
    <div id="settings-page">
      <Header />
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center max-w-2xl">
          <h1 className="text-4xl font-bold text-highlight mb-4">
            ⚙️ Settings
          </h1>
          <p className="text-contrast text-lg mb-6">
            Configure your FanCoolo plugin settings here.
          </p>
          <div className="bg-base-2 border border-outline rounded-lg p-6">
            <p className="text-sm text-contrast">
              Settings page coming soon...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
