import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAccounts, getStatus, getQueue, runOnce, startScheduler, stopScheduler } from "./lib/api";
import AccountSelector from "./lib/components/AccountSelector";
import StatCard from "./lib/components/StatCard";
import QueuePreview from "./lib/components/QueuePreview";
import NewItemForm from "./components/NewItemForm";
import { Users, Download, CheckCircle, AlertTriangle, Play, Pause, RefreshCw } from "lucide-react";

export default function App() {
  const [activeAccount, setActiveAccount] = useState("");
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState({ run: false, start: false, stop: false });

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

  const handleAccountChange = (username) => {
    setActiveAccount(username);
  };

  // Button handlers
  const handleRunOnce = async () => {
    if (!activeAccount) return;
    setLoading(l => ({ ...l, run: true }));
    try {
      await runOnce(activeAccount);
      await queryClient.invalidateQueries({ queryKey: ["status", activeAccount] });
      await queryClient.invalidateQueries({ queryKey: ["queue", activeAccount] });
    } finally {
      setLoading(l => ({ ...l, run: false }));
    }
  };

  const handleStart = async () => {
    if (!activeAccount) return;
    setLoading(l => ({ ...l, start: true }));
    try {
      await startScheduler(activeAccount);
      // Optionally show a toast here
    } finally {
      setLoading(l => ({ ...l, start: false }));
    }
  };

  const handleStop = async () => {
    if (!activeAccount) return;
    setLoading(l => ({ ...l, stop: true }));
    try {
      await stopScheduler(activeAccount);
    } finally {
      setLoading(l => ({ ...l, stop: false }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Instagram Automation Dashboard</h1>
        <div className="flex items-center gap-3">
          <AccountSelector
            accounts={accounts}
            value={activeAccount}
            onChange={handleAccountChange}
          />
          <button
            className="flex items-center gap-1 px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
            onClick={handleRunOnce}
            disabled={!activeAccount || loading.run}
            title="Run Once"
          >
            <RefreshCw className="w-4 h-4" /> Run Once
          </button>
          <button
            className="flex items-center gap-1 px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
            onClick={handleStart}
            disabled={!activeAccount || loading.start}
            title="Start Scheduler"
          >
            <Play className="w-4 h-4" /> Start
          </button>
          <button
            className="flex items-center gap-1 px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            onClick={handleStop}
            disabled={!activeAccount || loading.stop}
            title="Stop Scheduler"
          >
            <Pause className="w-4 h-4" /> Stop
          </button>
        </div>
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
          <NewItemForm
            account={activeAccount}
            onCreated={() => {
              queryClient.invalidateQueries({ queryKey: ["queue", activeAccount] });
              queryClient.invalidateQueries({ queryKey: ["status", activeAccount] });
            }}
          />
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