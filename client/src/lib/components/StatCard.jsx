/**
 * StatCard
 * Displays a stat with icon, title, and value in a styled card.
 *
 * Props:
 *   - title: string
 *   - value: string | number
 *   - icon: React node
 */
import React from "react";

export default function StatCard({ title, value, icon }) {
  return (
    <div className="bg-white rounded-lg shadow-sm flex flex-col items-center justify-center p-4 min-w-[120px]">
      <div className="mb-2 text-2xl">{icon}</div>
      <div className="text-gray-500 text-sm">{title}</div>
      <div className="font-bold text-xl">{value}</div>
    </div>
  );
}