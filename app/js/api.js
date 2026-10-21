var KineApi = (() => {
  const config = window.KINEDOM_SUPABASE || {};
  let client = null;
  const data = {
    session: null,
    users: [],
    citas: [],
    informes: [],
    schedule: { published: false, slots: {} },
    content: {},
  };

  function dbError(error, fallback) {
    const text = `${error && error.message ? error.message : ""} ${error && error.details ? error.details : ""} ${error && error.code ? error.code : ""}`;
    if (/23505|duplicate key|unique/i.test(text)) return "Esa hora ya está ocupada. Elige otro horario.";
    if (/invalid login|invalid credentials/i.test(text)) return "Correo o contraseña incorrectos.";
    if (/email not confirmed/i.test(text)) return "Confirma el correo antes de entrar.";
    if (/failed to fetch|network|load failed/i.test(text)) return "No se pudo conectar con la base de datos.";
    if (/no autorizado/i.test(text)) return "Esta acción solo está disponible para el administrador.";
    if (/no encontramos/i.test(text)) return "No encontramos a esa persona.";
    if (/payload too large|entity too large/i.test(text)) return "La imagen es demasiado pesada.";
    return fallback || "No se pudo completar la acción.";
  }

  function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  function hourValue(value) {
    return String(value || "").slice(0, 5);
  }

  function mapProfile(row) {
    if (!row) return null;
    return {
      id: row.id,
      email: normalizeEmail(row.email),
      nombre: row.nombre || "",
      edad: row.edad,
      fechaNacimiento: row.fecha_nacimiento || "",
      direccion: row.direccion || "",
      tipoVivienda: row.tipo_vivienda || "",
      numero: row.numero || "",
      comuna: row.comuna || "",
      torre: row.torre || "",
      codigo: row.codigo || "",
      celular: row.celular || "",
      role: row.role === "admin" ? "admin" : "patient",
    };
  }

  function mapCita(row) {
    return {
      id: row.id,
      email: normalizeEmail(row.email),
      fecha: row.fecha,
      hora: hourValue(row.hora),
      modalidad: row.modalidad || "Domicilio",
      nombre: row.nombre || "",
      edad: row.edad ?? "",
      direccion: row.direccion || "",
      patologia: row.patologia || "",
      estado: row.estado === "confirmado" || row.estado === "rechazado" ? row.estado : "pendiente",
      createdAt: row.created_at,
    };
  }

  function mapInforme(row) {
    return {
      id: row.id,
      email: normalizeEmail(row.email),
      nombre: row.nombre || "",
      fecha: row.fecha,
      texto: row.texto || "",
      informeFecha: row.informe_fecha || "",
    };
  }

  function citaEstadoLabel(estado) {
    if (estado === "confirmado") return "Confirmado";
    if (estado === "rechazado") return "Rechazado";
    return "Pendiente";
  }

  async function loadProfile(userId) {
    const { data: row, error } = await client.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (error) return null;
    return mapProfile(row);
  }

  async function applySession(authSession) {
    if (!authSession || !authSession.user) {
      data.session = null;
      return null;
    }
    let profile = await loadProfile(authSession.user.id);
    if (!profile) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      profile = await loadProfile(authSession.user.id);
    }
    if (!profile || profile.role !== "admin") {
      await client.auth.signOut();
      data.session = null;
      return { ok: false, error: "Esa cuenta no es de administrador." };
    }
    data.session = {
      role: "admin",
      email: normalizeEmail(profile.email || authSession.user.email),
      name: profile.nombre || "Administrador",
      userId: authSession.user.id,
    };
    return { ok: true, session: data.session };
  }

  async function loadSchedule() {
    const { data: row, error } = await client.from("schedule").select("published, slots").eq("id", 1).maybeSingle();
    if (error || !row) {
      data.schedule = { published: false, slots: {} };
      return;
    }
    data.schedule = {
      published: Boolean(row.published),
      slots: row.slots && typeof row.slots === "object" ? row.slots : {},
    };
  }

  async function loadCitas() {
    const occupied = await client.rpc("citas_ocupadas");
    const stubs = (occupied.data || []).map((row) => ({
      fecha: row.fecha,
      hora: hourValue(row.hora),
      email: "",
      estado: "pendiente",
    }));
    const { data: rows } = await client.from("citas").select("*").order("fecha", { ascending: true });
    const full = (rows || []).map(mapCita);
    const seen = new Set(full.map((item) => `${item.fecha}|${item.hora}`));
    data.citas = stubs.filter((item) => !seen.has(`${item.fecha}|${item.hora}`)).concat(full);
  }

  async function loadInformes() {
    const { data: rows } = await client.from("informes").select("*").order("fecha", { ascending: false });
    data.informes = (rows || []).map(mapInforme);
  }

  async function loadUsers() {
    const { data: rows } = await client.from("profiles").select("*").eq("role", "patient").order("nombre");
    data.users = (rows || []).map(mapProfile);
  }

  async function loadContent() {
    const { data: row, error } = await client.from("site_content").select("data").eq("id", 1).maybeSingle();
    data.content = !error && row && row.data && typeof row.data === "object" ? row.data : {};
    if (data.content.footer) {
      if (data.content.footer.whatsapp === "+56 9 0000 0000") data.content.footer.whatsapp = KineContent.defaults.footer.whatsapp;
      if (data.content.footer.phone === "+56 9 0000 0000") data.content.footer.phone = KineContent.defaults.footer.phone;
      if (data.content.footer.email === "contacto@kinedom.cl") data.content.footer.email = KineContent.defaults.footer.email;
    }
  }

  async function loadAll() {
    await Promise.all([loadSchedule(), loadCitas(), loadInformes(), loadUsers(), loadContent()]);
  }

  function connect() {
    if (client) return client;
    if (!window.supabase || !config.url || !config.anonKey) {
      throw new Error("No se pudo preparar la conexión con Supabase.");
    }
    const storage = {
      getItem(key) { return localStorage.getItem(key); },
      setItem(key, value) { localStorage.setItem(key, value); },
      removeItem(key) { localStorage.removeItem(key); },
    };
    client = window.supabase.createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storage,
        storageKey: "kinedom-admin-auth",
      },
    });
    return client;
  }

  async function restore() {
    connect();
    const { data: sessionData, error } = await client.auth.getSession();
    if (error) return { ok: false, error: dbError(error, "No se pudo recuperar la sesión.") };
    if (!sessionData.session) return { ok: false };
    const result = await applySession(sessionData.session);
    if (!result || !result.ok) return result || { ok: false };
    await loadAll();
    return result;
  }

  async function login(email, password) {
    connect();
    const { data: signIn, error } = await client.auth.signInWithPassword({
      email: normalizeEmail(email),
      password,
    });
    if (error) return { ok: false, error: dbError(error, "Correo o contraseña incorrectos.") };
    const result = await applySession(signIn.session);
    if (!result.ok) return result;
    await loadAll();
    return result;
  }

  async function logout() {
    if (client) await client.auth.signOut();
    data.session = null;
    data.users = [];
    data.informes = [];
    data.citas = [];
  }

  async function updateAdminName(name) {
    const clean = String(name || "").trim().replace(/\s+/g, " ");
    if (clean.length < 2 || clean.length > 60) {
      return { ok: false, error: "El nombre de usuario debe tener entre 2 y 60 caracteres." };
    }
    const { error } = await client.from("profiles").update({ nombre: clean }).eq("id", data.session.userId);
    if (error) return { ok: false, error: dbError(error, "No se pudo actualizar el nombre.") };
    data.session = { ...data.session, name: clean };
    return { ok: true, name: clean };
  }

  async function updatePassword(password) {
    if (String(password || "").length < 8) {
      return { ok: false, error: "La contraseña debe tener al menos 8 caracteres." };
    }
    const { error } = await client.auth.updateUser({ password });
    if (error) return { ok: false, error: dbError(error, "No se pudo actualizar la contraseña.") };
    return { ok: true };
  }

  async function deleteUser(email) {
    const mail = normalizeEmail(email);
    const person = data.users.find((item) => item.email === mail);
    if (!person) return { ok: false, error: "No encontramos a esa persona." };
    const { error } = await client.rpc("delete_patient", { target: person.id });
    if (error) return { ok: false, error: dbError(error, "No se pudo eliminar la cuenta.") };
    await Promise.all([loadUsers(), loadCitas(), loadInformes()]);
    return { ok: true };
  }

  async function setCitaEstado(id, estado) {
    if (estado !== "pendiente" && estado !== "confirmado" && estado !== "rechazado") {
      return { ok: false, error: "Ese estado no es válido." };
    }
    const { error } = await client.from("citas").update({ estado }).eq("id", id);
    if (error) return { ok: false, error: dbError(error, "No se pudo actualizar el estado.") };
    await loadCitas();
    return { ok: true };
  }

  async function deleteCita(id) {
    const { error } = await client.from("citas").delete().eq("id", id);
    if (error) return { ok: false, error: dbError(error, "No encontramos esa hora.") };
    await loadCitas();
    return { ok: true };
  }

  async function deleteInforme(id) {
    const { error } = await client.from("informes").delete().eq("id", id);
    if (error) return { ok: false, error: dbError(error, "No se pudo quitar la solicitud.") };
    await loadInformes();
    return { ok: true };
  }

  async function saveInforme(id, texto) {
    const clean = String(texto || "").trim();
    if (clean.length < 20) return { ok: false, error: "Escribe el informe antes de guardarlo." };
    if (clean.length > 8000) return { ok: false, error: "El informe es demasiado largo para guardarlo." };
    const { error } = await client
      .from("informes")
      .update({ texto: clean, informe_fecha: new Date().toISOString() })
      .eq("id", id);
    if (error) return { ok: false, error: dbError(error, "No se pudo guardar el informe.") };
    await loadInformes();
    return { ok: true };
  }

  async function saveSchedule(schedule) {
    const slots = {};
    Object.keys(schedule.slots || {}).forEach((key) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return;
      const hours = [...new Set(schedule.slots[key] || [])].filter((hour) => /^\d{2}:\d{2}$/.test(hour)).sort();
      if (hours.length) slots[key] = hours;
    });
    const next = { id: 1, published: Boolean(schedule.published), slots, updated_at: new Date().toISOString() };
    const { error } = await client.from("schedule").upsert(next);
    if (error) return { ok: false, error: dbError(error, "No se pudo guardar la agenda.") };
    data.schedule = { published: next.published, slots };
    return { ok: true };
  }

  async function uploadImage(dataUrl, path) {
    const match = String(dataUrl).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!match) return dataUrl;
    const binary = atob(match[2]);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    const ext = match[1].split("/")[1].replace("jpeg", "jpg").replace("+xml", "");
    const filePath = `${path}-${Date.now()}.${ext}`;
    const { error } = await client.storage.from("site-images").upload(filePath, bytes, {
      contentType: match[1],
      upsert: true,
    });
    if (error) throw new Error("No se pudo guardar la imagen.");
    return client.storage.from("site-images").getPublicUrl(filePath).data.publicUrl;
  }

  async function storeImages(value, path) {
    if (typeof value === "string" && value.startsWith("data:image/")) return uploadImage(value, path);
    if (Array.isArray(value)) {
      const next = [];
      for (let index = 0; index < value.length; index += 1) next.push(await storeImages(value[index], `${path}-${index}`));
      return next;
    }
    if (value && typeof value === "object") {
      const next = {};
      const keys = Object.keys(value);
      for (let index = 0; index < keys.length; index += 1) {
        const key = keys[index];
        next[key] = await storeImages(value[key], `${path}-${key}`);
      }
      return next;
    }
    return value;
  }

  async function saveContent(content) {
    try {
      const payload = await storeImages(content, "contenido");
      const { error } = await client.from("site_content").upsert({
        id: 1,
        data: payload,
        updated_at: new Date().toISOString(),
      });
      if (error) return { ok: false, error: "No se pudo guardar el contenido." };
      data.content = payload;
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message || "No se pudo guardar el contenido." };
    }
  }

  async function restoreContent() {
    data.content = {};
    return saveContent(KineContent.merged({}));
  }

  function subscribe(onChange) {
    const reload = (kind, task) => {
      task().then(() => onChange(kind)).catch(() => {});
    };
    client
      .channel("kinedom-admin-app")
      .on("postgres_changes", { event: "*", schema: "public", table: "citas" }, () => reload("citas", loadCitas))
      .on("postgres_changes", { event: "*", schema: "public", table: "informes" }, () => reload("informes", loadInformes))
      .on("postgres_changes", { event: "*", schema: "public", table: "schedule" }, () => reload("schedule", loadSchedule))
      .on("postgres_changes", { event: "*", schema: "public", table: "site_content" }, () => reload("content", loadContent))
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => reload("users", loadUsers))
      .subscribe();
  }

  return {
    data,
    connect,
    restore,
    login,
    logout,
    loadAll,
    updateAdminName,
    updatePassword,
    deleteUser,
    setCitaEstado,
    deleteCita,
    deleteInforme,
    saveInforme,
    saveSchedule,
    saveContent,
    restoreContent,
    subscribe,
    citaEstadoLabel,
    dbError,
  };
})();
