const { expireAbandonedReservations } = require("../services/reservation.service");
const { processPendingOutboxEvents } = require("../services/outbox.service");

let timer;
let running = false;

const getIntervalMs = () => {
  const value = Number(process.env.COMMERCE_WORKER_INTERVAL_MS);
  return Number.isFinite(value) && value >= 5000 ? value : 30000;
};

const runCommerceTasks = async () => {
  const expiredReservations = await expireAbandonedReservations();
  const processedOutboxEvents = await processPendingOutboxEvents();
  return { expiredReservations, processedOutboxEvents };
};

const tick = async () => {
  if (running) return null;
  running = true;

  try {
    return await runCommerceTasks();
  } catch (error) {
    console.error("Commerce worker tick failed:", error.message);
    return null;
  } finally {
    running = false;
  }
};

const startCommerceWorker = () => {
  if (timer || process.env.DISABLE_COMMERCE_WORKER === "true") return;
  void tick();
  timer = setInterval(() => void tick(), getIntervalMs());
  timer.unref();
};

const stopCommerceWorker = () => {
  if (timer) clearInterval(timer);
  timer = undefined;
};

module.exports = {
  runCommerceTasks,
  startCommerceWorker,
  stopCommerceWorker,
  tick,
};
