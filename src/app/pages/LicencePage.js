import React from "react";
import Header from "../components/editor/Header";

const LicencePage = () => {
  return (
    <div id="licence-page">
      <Header />
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center max-w-2xl">
          <h1 className="text-4xl font-bold text-highlight mb-4">📜 Licence</h1>
          <p className="text-contrast text-lg mb-6">
            Manage your Fanculo plugin licence here.
          </p>
          <div className="bg-base-2 border border-outline rounded-lg p-6">
            <p className="text-sm text-contrast mb-4">
              Licence management coming soon...
            </p>
            <div className="text-xs text-contrast/70">
              <p>Plugin Version: 1.0.0</p>
              <p className="mt-2">Licence Status: Active</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LicencePage;
