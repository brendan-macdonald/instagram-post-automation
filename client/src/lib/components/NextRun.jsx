/**
 * NextRun
 * Countdown timer to a target timestamp.
 *
 * Props:
 *   - target: Date or number (timestamp in ms)
 *
 * Displays mm:ss and ticks every second. Shows 'queued' when zero.
 */
import React, { useEffect, useState } from "react";

function getTimeLeft(target) {
  const now = Date.now();
  const diff = Math.max(0, target - now);
  const mm = String(Math.floor(diff / 60000)).padStart(2, "0");
  const ss = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
  return { mm, ss, done: diff === 0 };
}

export default function NextRun({ target }) {
  const [time, setTime] = useState(() => getTimeLeft(+target));

  useEffect(() => {
    if (time.done) return;
    const interval = setInterval(() => {
      setTime(getTimeLeft(+target));
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, [target, time.done]);

  if (time.done) {
    return <span className="text-green-600 font-semibold">queued</span>;
  }
  return (
    <span className="font-mono">
      {time.mm}:{time.ss}
    </span>
  );
}