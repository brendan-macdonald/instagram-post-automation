/**
 * API Router for Instagram Post Automation
 * Mounts sub-routes for accounts, status, and queue management.
 *
 * This router is attached at /api by the main server.
 */

const express = require("express");
const router = express.Router();

const accountsRouter = require("./accounts");
const statusRouter = require("./status");
const queueRouter = require("./queue");

router.use("/accounts", accountsRouter);
router.use("/status", statusRouter);
router.use("/queue", queueRouter);

module.exports = router;
