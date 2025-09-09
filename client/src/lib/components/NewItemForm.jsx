import React, { useState } from "react";
import { createQueueItems } from "../api";

const CAPTION_STRATEGIES = [
  { value: "default", label: "Default" },
  { value: "custom", label: "Custom" },
  { value: "from_source", label: "From Source" },
];

const FORMAT_PRESETS = [
  { value: "", label: "Auto (recommended)" },
  { value: "raw", label: "Raw" },
  { value: "logo_only", label: "Logo Only" },
  { value: "caption_top", label: "Caption Top" },
];

export default function NewItemForm({ account, onCreated }) {
  const [mode, setMode] = useState("single"); // "single" or "bulk"

  // Single mode state
  const [url, setUrl] = useState("");
  const [captionStrategy, setCaptionStrategy] = useState("default");
  const [captionCustom, setCaptionCustom] = useState("");
  const [formatPreset, setFormatPreset] = useState("");
  const [logo, setLogo] = useState(true);

  // Bulk mode state
  const [urls, setUrls] = useState("");
  const [bulkCaptionStrategy, setBulkCaptionStrategy] = useState("default");
  const [bulkCaptionCustom, setBulkCaptionCustom] = useState("");
  const [bulkFormatPreset, setBulkFormatPreset] = useState("");
  const [bulkLogo, setBulkLogo] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const resetForm = () => {
    setUrl("");
    setCaptionStrategy("default");
    setCaptionCustom("");
    setFormatPreset("");
    setLogo(true);
    setUrls("");
    setBulkCaptionStrategy("default");
    setBulkCaptionCustom("");
    setBulkFormatPreset("");
    setBulkLogo(true);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "single") {
        if (!url.trim()) {
          setError("URL is required.");
          setLoading(false);
          return;
        }
        const item = {
          url: url.trim(),
          caption_strategy: captionStrategy,
          caption_custom: captionStrategy === "custom" ? captionCustom : "",
          format_preset: formatPreset,
          logo,
        };
        await createQueueItems(account, [item]);
      } else {
        // Bulk mode
        const urlLines = urls
          .split("\n")
          .map((u) => u.trim())
          .filter(Boolean);
        if (urlLines.length === 0) {
          setError("At least one URL is required.");
          setLoading(false);
          return;
        }
        const items = urlLines.map((u) => ({
          url: u,
          caption_strategy: bulkCaptionStrategy,
          caption_custom: bulkCaptionStrategy === "custom" ? bulkCaptionCustom : "",
          format_preset: bulkFormatPreset,
          logo: bulkLogo,
        }));
        await createQueueItems(account, items);
      }
      resetForm();
      if (onCreated) onCreated();
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to add items.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="bg-white rounded shadow p-4 mb-6" onSubmit={handleSubmit}>
      <div className="mb-4 flex gap-4">
        <button
          type="button"
          className={`px-3 py-1 rounded ${mode === "single" ? "bg-blue-600 text-white" : "bg-gray-100"}`}
          onClick={() => setMode("single")}
        >
          Single
        </button>
        <button
          type="button"
          className={`px-3 py-1 rounded ${mode === "bulk" ? "bg-blue-600 text-white" : "bg-gray-100"}`}
          onClick={() => setMode("bulk")}
        >
          Bulk
        </button>
      </div>

      {mode === "single" ? (
        <>
          <div className="mb-3">
            <label className="block font-medium mb-1">URL<span className="text-red-500">*</span></label>
            <input
              type="text"
              className="border rounded px-3 py-2 w-full"
              value={url}
              onChange={e => setUrl(e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label className="block font-medium mb-1">Caption Strategy</label>
            <select
              className="border rounded px-3 py-2 w-full"
              value={captionStrategy}
              onChange={e => setCaptionStrategy(e.target.value)}
            >
              {CAPTION_STRATEGIES.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          {captionStrategy === "custom" && (
            <div className="mb-3">
              <label className="block font-medium mb-1">Custom Caption</label>
              <textarea
                className="border rounded px-3 py-2 w-full"
                value={captionCustom}
                onChange={e => setCaptionCustom(e.target.value)}
                rows={2}
              />
            </div>
          )}
          <div className="mb-3">
            <label className="block font-medium mb-1">Format Preset</label>
            <select
              className="border rounded px-3 py-2 w-full"
              value={formatPreset}
              onChange={e => setFormatPreset(e.target.value)}
            >
              {FORMAT_PRESETS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="mb-4 flex items-center">
            <input
              type="checkbox"
              id="logo"
              className="mr-2"
              checked={logo}
              onChange={e => setLogo(e.target.checked)}
            />
            <label htmlFor="logo" className="font-medium">Overlay Logo</label>
          </div>
        </>
      ) : (
        <>
          <div className="mb-3">
            <label className="block font-medium mb-1">URLs (one per line)<span className="text-red-500">*</span></label>
            <textarea
              className="border rounded px-3 py-2 w-full"
              value={urls}
              onChange={e => setUrls(e.target.value)}
              rows={4}
              required
            />
          </div>
          <div className="mb-3">
            <label className="block font-medium mb-1">Caption Strategy</label>
            <select
              className="border rounded px-3 py-2 w-full"
              value={bulkCaptionStrategy}
              onChange={e => setBulkCaptionStrategy(e.target.value)}
            >
              {CAPTION_STRATEGIES.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          {bulkCaptionStrategy === "custom" && (
            <div className="mb-3">
              <label className="block font-medium mb-1">Custom Caption</label>
              <textarea
                className="border rounded px-3 py-2 w-full"
                value={bulkCaptionCustom}
                onChange={e => setBulkCaptionCustom(e.target.value)}
                rows={2}
              />
            </div>
          )}
          <div className="mb-3">
            <label className="block font-medium mb-1">Format Preset</label>
            <select
              className="border rounded px-3 py-2 w-full"
              value={bulkFormatPreset}
              onChange={e => setBulkFormatPreset(e.target.value)}
            >
              {FORMAT_PRESETS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="mb-4 flex items-center">
            <input
              type="checkbox"
              id="bulk-logo"
              className="mr-2"
              checked={bulkLogo}
              onChange={e => setBulkLogo(e.target.checked)}
            />
            <label htmlFor="bulk-logo" className="font-medium">Overlay Logo</label>
          </div>
        </>
      )}

      {error && <div className="text-red-600 mb-2">{error}</div>}

      <button
        type="submit"
        className="bg-blue-600 text-white px-4 py-2 rounded font-semibold"
        disabled={loading}
      >
        {loading ? "Adding..." : "Add to Queue"}
      </button>
    </form>
  );
}