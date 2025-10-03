import React, { useState, useEffect } from "react";
import Header from "../components/editor/Header";
import { apiClient } from "../../utils/index.js";

const LicencePage = () => {
  const [license, setLicense] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLicense();
  }, []);

  const fetchLicense = async () => {
    try {
      setLoading(true);
      const response = await apiClient.request("/license");

      // Handle new unified API response format
      if (response.success !== undefined && response.data !== undefined) {
        setLicense(response.data);
      } else {
        setLicense(response);
      }
    } catch (error) {
      console.error("Failed to fetch license:", error);
    } finally {
      setLoading(false);
    }
  };

  const getMaskedLicenseKey = (key) => {
    if (!key || key.length < 10) return key;
    const start = key.substring(0, 6);
    const end = key.substring(key.length - 4);
    const middle = "*".repeat(Math.min(key.length - 10, 20));
    return `${start}${middle}${end}`;
  };

  const handleDisable = async () => {
    if (
      !window.confirm(
        "Are you sure you want to disable your license? This will deactivate all premium features."
      )
    ) {
      return;
    }

    try {
      await apiClient.request("/license", {
        method: "DELETE",
      });

      // Reload the page immediately
      window.location.reload();
    } catch (error) {
      console.error("Failed to disable license:", error);
      alert("Failed to disable license. Please try again.");
    }
  };

  if (loading) {
    return (
      <div id="licence-page">
        <Header />
        <div className="flex items-center justify-center h-full p-8">
          <p className="text-contrast">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div id="licence-page">
      <Header />
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center max-w-2xl w-full">
          <h1 className="text-4xl font-bold text-highlight !mb-8">
            Licence Staus
          </h1>

          <div className="bg-base-2 border border-outline rounded-lg p-6">
            <div className="mb-6 relative flex items-center">
              <span className="text-[#3cc789] absolute right-4">✓ Active</span>
              <input
                type="text"
                value={getMaskedLicenseKey(license.licenseKey)}
                readOnly
                className="w-full rounded-xl border border-outline !bg-base-1 px-4 py-3  text-highlight placeholder:text-contrast focus:border-action focus:outline-none focus:ring-2 focus:ring-action"
              />
            </div>

            <button
              onClick={handleDisable}
              className="inline-flex items-center justify-center rounded-xl bg-action px-8 py-3 text-base font-semibold text-highlight shadow-md transition hover:bg-action/80 focus:outline-none focus:ring-2 focus:ring-action w-full"
            >
              Disable License
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LicencePage;
