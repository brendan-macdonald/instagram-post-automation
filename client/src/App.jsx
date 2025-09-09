import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAccounts, getStatus, getQueue } from "./lib/api";
import AccountSelector from "./lib/components/AccountSelector";
import StatCard from "./lib/components/StatCard";
import QueuePreview from "./lib/components/QueuePreview";
import { Users, Download, CheckCircle, AlertTriangle } from "lucide-react";

export default function App() {
  const [activeAccount, setActiveAccount] = useState("");

  // Fetch accounts list
  const { data: accounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: getAccounts,
  });

  // Fetch status for selected account
  const {
    data: status,
    isLoading: statusLoading,
  } = useQuery({
    queryKey: ["status", activeAccount],
    queryFn: () => getStatus(activeAccount),
    enabled: !!activeAccount,
  });

  // Fetch queue for selected account
  const {
    data: queue = [],
    isLoading: queueLoading,
  } = useQuery({
    queryKey: ["queue", activeAccount],
    queryFn: () => getQueue(activeAccount),
    enabled: !!activeAccount,
  });

  // Ensure AccountSelector and all API calls use the exact username string from accounts
  const handleAccountChange = (username) => {
    setActiveAccount(username);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Instagram Automation Dashboard</h1>
        <AccountSelector
          accounts={accounts}
          value={activeAccount}
          onChange={handleAccountChange}
        />
      </header>

      {!activeAccount ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
          <Users className="w-12 h-12 mb-2" />
          <div>Select an account to view stats and queue.</div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard
              title="Pending"
              value={statusLoading ? "…" : status?.pending ?? 0}
              icon={<Download />}
            />
            <StatCard
              title="Downloaded"
              value={statusLoading ? "…" : status?.downloaded ?? 0}
              icon={<CheckCircle />}
            />
            <StatCard
              title="Posted"
              value={statusLoading ? "…" : status?.posted ?? 0}
              icon={<Users />}
            />
            <StatCard
              title="Errors"
              value={0}
              icon={<AlertTriangle />}
            />
          </div>
          <div className="bg-white rounded shadow p-4">
            <h2 className="text-lg font-semibold mb-3">Latest Queue</h2>
            {queueLoading ? (
              <div className="text-gray-400">Loading queue…</div>
            ) : (
              <QueuePreview rows={queue} />
            )}
          </div>
        </>
      )}
    </div>
  );
}