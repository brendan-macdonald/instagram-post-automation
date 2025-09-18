/**
 * AccountSelector
 * Controlled select component for choosing an account.
 *
 * Props:
 *   - accounts: Array of account objects (must have a 'username' property)
 *   - value: Selected username (string, or "")
 *   - onChange: Function to call with new username when selection changes
 *
 * Renders:
 *   <select> with "Select account" placeholder and one <option> per account.
 */

import React from "react";

export default function AccountSelector({ accounts, value, onChange }) {
  return (
    <select
      className="border rounded px-3 py-2"
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      <option value="">Select account</option>
      {accounts.map(acc => (
        <option key={acc.username} value={acc.username}>
          {acc.username}
        </option>
      ))}
    </select>
  );
}