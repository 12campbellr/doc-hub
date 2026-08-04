"use client";

import { useEffect, useState } from "react";

export default function OfflineIndicator() {
  // Start as false (assume online) so SSR/first paint matches — this only
  // ever flips true client-side in response to real browser events.
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    setIsOffline(!navigator.onLine);
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="bg-amber-400 text-navy-950 text-xs font-medium text-center py-1 px-3">
      You're offline — previously viewed documents still work, but new folders and uploads need a
      connection.
    </div>
  );
}
