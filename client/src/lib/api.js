import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  timeout: 10000,
});

// Fetch all accounts
export function getAccounts() {
  return api.get("/accounts").then((res) => res.data);
}

// Fetch status for a specific account
export function getStatus(account) {
  return api.get(`/${account}/status`).then((res) => res.data);
}

// Fetch queue for a specific account
export function getQueue(account) {
  return api.get(`/${account}/queue`).then((res) => res.data);
}

// Create queue items (single or bulk)
export async function createQueueItems(account, items) {
  // items: array or single object (server will wrap if not array)
  const res = await api.post(`/${account}/queue`, items);
  return res.data; // { inserted, ids }
}

// Run index.js once for the account
export function runOnce(account) {
  return api.post(`/${account}/jobs/run-once`).then((res) => res.data);
}

// Start scheduled posting for the account
export function startScheduler(account) {
  return api.post(`/${account}/jobs/start`).then((res) => res.data);
}

// Stop scheduled posting for the account
export function stopScheduler(account) {
  return api.post(`/${account}/jobs/stop`).then((res) => res.data);
}

// Delete a specific item from the queue
export function deleteQueueItem(account, id) {
  return api.delete(`/${account}/queue/${id}`).then((res) => res.data);
}
