/**
 * QueuePreview
 * Renders a table of the latest media queue rows.
 *
 * Props:
 *   - rows: Array of {id, source, url, format_preset, caption_strategy, created_at}
 */
import React from "react";

export default function QueuePreview({ rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white rounded shadow-sm">
        <thead>
          <tr className="bg-gray-100 text-xs text-gray-600">
            <th className="px-3 py-2 text-left">ID</th>
            <th className="px-3 py-2 text-left">Source</th>
            <th className="px-3 py-2 text-left">URL</th>
            <th className="px-3 py-2 text-left">Preset</th>
            <th className="px-3 py-2 text-left">Caption</th>
            <th className="px-3 py-2 text-left">Created</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id} className="hover:bg-gray-50">
              <td className="px-3 py-2">{row.id}</td>
              <td className="px-3 py-2">{row.source}</td>
              <td className="px-3 py-2 max-w-[180px] truncate" title={row.url}>{row.url}</td>
              <td className="px-3 py-2">{row.format_preset}</td>
              <td className="px-3 py-2">{row.caption_strategy}</td>
              <td className="px-3 py-2">{row.created_at}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}