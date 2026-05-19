import { useState, useEffect } from "react";

const STORAGE_KEY = "@ehs:recent_users";
const MAX_RECENT = 10;

export function useRecentUsers() {
  const [recentUsers, setRecentUsers] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setRecentUsers(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load recent users", e);
    }
  }, []);

  const addRecentUser = (name: string) => {
    if (!name || name.trim().length === 0) return;
    const cleanName = name.trim();
    
    setRecentUsers(prev => {
      const filtered = prev.filter(n => n.toLowerCase() !== cleanName.toLowerCase());
      const updated = [cleanName, ...filtered].slice(0, MAX_RECENT);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to save recent users", e);
      }
      return updated;
    });
  };

  return { recentUsers, addRecentUser };
}
