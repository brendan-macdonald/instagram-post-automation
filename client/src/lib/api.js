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
