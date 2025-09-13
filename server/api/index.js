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
const jobsRouter = require("./jobs");

router.use("/accounts", accountsRouter);
router.use("/:account/status", statusRouter);
router.use("/:account/queue", queueRouter);
router.use("/:account/jobs", jobsRouter);

module.exports = router;
