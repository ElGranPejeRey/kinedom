var KineDomDB = (() => {
  const config = window.KINEDOM_SUPABASE || {};
  const url = String(config.url || "").trim();
  const anonKey = String(config.anonKey || "").trim();
  const configured = url.startsWith("https://") && !url.includes("TU_PROYECTO") && anonKey && anonKey !== "TU_ANON_KEY";
  if (!configured || !window.supabase || typeof window.supabase.createClient !== "function") {
    return { client: null, configured: false };
  }

  const authStorage = {
    bag() {
      return sessionStorage.getItem("kinedom_use_session") === "1" ? sessionStorage : localStorage;
    },
    getItem(key) {
      return this.bag().getItem(key);
    },
    setItem(key, value) {
      this.bag().setItem(key, value);
    },
    removeItem(key) {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    },
  };

  const client = window.supabase.createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "implicit",
      storage: authStorage,
    },
  });

  return { client, configured: true };
})();
