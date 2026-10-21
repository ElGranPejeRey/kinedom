var KineDom = (() => {
  const state = {
    session: null,
    profile: null,
    users: [],
    reservas: [],
    informes: [],
    schedule: { published: false, slots: {} },
  };

  function client() {
    return window.KineDomDB && KineDomDB.client;
  }

  function unavailable() {
    return { ok: false, error: "La base de datos de Supabase todavía no está conectada." };
  }

  function dbError(error, fallback) {
    const text = `${error && error.message ? error.message : ""} ${error && error.details ? error.details : ""} ${error && error.code ? error.code : ""}`;
    if (/23505|duplicate key|unique/i.test(text)) return "Esa hora ya está ocupada. Elige otro horario.";
    if (/already registered|already been registered/i.test(text)) return "Ya existe una cuenta con este correo.";
    if (/invalid login|invalid credentials/i.test(text)) return "Correo o contraseña incorrectos.";
    if (/email not confirmed/i.test(text)) return "Confirma el correo antes de entrar.";
    if (/failed to fetch|network|load failed/i.test(text)) return "No se pudo conectar con la base de datos.";
    if (/no autorizado/i.test(text)) return "Esta acción solo está disponible para el administrador.";
    if (/no encontramos/i.test(text)) return "No encontramos a esa persona.";
    return fallback || "No se pudo completar la acción.";
  }

  function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  function normalizeName(name) {
    return String(name || "").trim().toLowerCase().replace(/\s+/g, " ");
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

  function citaEstadoLabel(estado) {
    if (estado === "confirmado") return "Confirmado";
    if (estado === "rechazado") return "Rechazado";
    return "Pendiente";
  }

  function formatCitaFecha(fecha) {
    const [year, month, day] = String(fecha || "").split("-").map(Number);
    if (!year || !month || !day) return String(fecha || "");
    return new Intl.DateTimeFormat("es-CL", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(new Date(year, month - 1, day));
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

  function notify() {
    document.dispatchEvent(new CustomEvent("kinedom-sync"));
  }

  function canStore() {
    return Boolean(client());
  }

  function getSession() {
    return state.session;
  }

  function requireAdmin() {
    const session = getSession();
    if (!session || session.role !== "admin") {
      return { ok: false, error: "Esta acción solo está disponible para el administrador." };
    }
    return { ok: true, session };
  }

  async function loadProfile(userId) {
    const db = client();
    const { data, error } = await db.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (error) return null;
    state.profile = mapProfile(data);
    return state.profile;
  }

  async function loadSchedule() {
    const db = client();
    if (!db) {
      state.schedule = { published: false, slots: {} };
      return;
    }
    const { data, error } = await db.from("schedule").select("published, slots").eq("id", 1).maybeSingle();
    if (error || !data) {
      state.schedule = { published: false, slots: {} };
      return;
    }
    state.schedule = {
      published: Boolean(data.published),
      slots: data.slots && typeof data.slots === "object" ? data.slots : {},
    };
  }

  async function loadReservas() {
    const db = client();
    if (!db) {
      state.reservas = [];
      return;
    }
    const occupied = await db.rpc("citas_ocupadas");
    const stubs = (occupied.data || []).map((row) => ({
      fecha: row.fecha,
      hora: hourValue(row.hora),
      email: "",
    }));
    let full = [];
    if (state.session) {
      const { data } = await db.from("citas").select("*").order("fecha", { ascending: true });
      full = (data || []).map(mapCita);
    }
    const seen = new Set(full.map((item) => `${item.fecha}|${item.hora}`));
    state.reservas = stubs.filter((item) => !seen.has(`${item.fecha}|${item.hora}`)).concat(full);
  }

  async function loadInformes() {
    const db = client();
    if (!db || !state.session) {
      state.informes = [];
      return;
    }
    const { data } = await db.from("informes").select("*").order("fecha", { ascending: false });
    state.informes = (data || []).map(mapInforme);
  }

  async function loadUsers() {
    const db = client();
    if (!db || !state.session || state.session.role !== "admin") {
      state.users = [];
      return;
    }
    const { data } = await db.from("profiles").select("*").eq("role", "patient").order("nombre");
    state.users = (data || []).map(mapProfile);
  }

  async function applyAuthSession(authSession) {
    if (!authSession || !authSession.user) {
      state.session = null;
      state.profile = null;
      return;
    }
    let profile = await loadProfile(authSession.user.id);
    if (!profile) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      profile = await loadProfile(authSession.user.id);
    }
    const role = profile && profile.role === "admin" ? "admin" : "patient";
    state.session = {
      role,
      email: normalizeEmail((profile && profile.email) || authSession.user.email),
      name: (profile && profile.nombre) || authSession.user.email,
      userId: authSession.user.id,
    };
  }

  async function refresh() {
    const db = client();
    if (!db) return getSession();
    const { data } = await db.auth.getSession();
    await applyAuthSession(data.session);
    if (window.KineDomContent && KineDomContent.load) await KineDomContent.load();
    await Promise.all([loadSchedule(), loadReservas(), loadInformes(), loadUsers()]);
    return getSession();
  }

  function subscribe() {
    const db = client();
    if (!db || state.listening) return;
    state.listening = true;
    const reload = (task) => {
      task().then(notify).catch(() => {});
    };
    db.channel("kinedom-db")
      .on("postgres_changes", { event: "*", schema: "public", table: "citas" }, () => reload(loadReservas))
      .on("postgres_changes", { event: "*", schema: "public", table: "informes" }, () => reload(loadInformes))
      .on("postgres_changes", { event: "*", schema: "public", table: "schedule" }, () => reload(loadSchedule))
      .on("postgres_changes", { event: "*", schema: "public", table: "site_content" }, () => {
        if (window.KineDomContent && KineDomContent.load) {
          KineDomContent.load().then(notify).catch(() => {});
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => reload(loadUsers))
      .subscribe();
  }

  async function register(user) {
    const db = client();
    if (!db) return unavailable();
    const email = normalizeEmail(user.email);
    const nombre = user.nombre.trim().replace(/\s+/g, " ");
    const { data, error } = await db.auth.signUp({
      email,
      password: user.password,
      options: {
        data: {
          nombre,
          edad: String(user.edad),
          fecha_nacimiento: user.fechaNacimiento || "",
          direccion: user.direccion.trim(),
          tipo_vivienda: user.tipoVivienda || "",
          numero: String(user.numero || "").trim(),
          comuna: String(user.comuna || "").trim(),
          torre: String(user.torre || "").trim(),
          codigo: user.codigo,
          celular: String(user.celular).replace(/\D/g, ""),
        },
      },
    });
    if (error) return { ok: false, error: dbError(error, "No se pudo crear la cuenta.") };
    if (!data.session) {
      return { ok: false, error: "Revisa tu correo para confirmar la cuenta. Después podrás entrar al panel." };
    }
    if (data.user) {
      const extra = {
        edad: Number(user.edad),
        fecha_nacimiento: user.fechaNacimiento || null,
        direccion: user.direccion.trim(),
        tipo_vivienda: user.tipoVivienda || null,
        numero: String(user.numero || "").trim(),
        comuna: String(user.comuna || "").trim(),
        torre: String(user.torre || "").trim() || null,
      };
      const updated = await db.from("profiles").update(extra).eq("id", data.user.id);
      if (updated.error && /column|schema cache|fecha_nacimiento|tipo_vivienda/i.test(`${updated.error.message || ""} ${updated.error.code || ""}`)) {
        await db.from("profiles").update({
          edad: extra.edad,
          direccion: extra.direccion,
        }).eq("id", data.user.id);
      }
    }
    await applyAuthSession(data.session);
    await loadUsers();
    document.dispatchEvent(new Event("kinedom-session"));
    return {
      ok: true,
      user: {
        nombre,
        edad: Number(user.edad),
        direccion: user.direccion.trim(),
        codigo: user.codigo,
        celular: String(user.celular).replace(/\D/g, ""),
        email,
      },
    };
  }

  async function login(email, password, role, remember) {
    const db = client();
    if (!db) return unavailable();
    if (remember) sessionStorage.removeItem("kinedom_use_session");
    else sessionStorage.setItem("kinedom_use_session", "1");
    [localStorage, sessionStorage].forEach((bag) => {
      const keys = [];
      for (let index = 0; index < bag.length; index += 1) keys.push(bag.key(index));
      keys.forEach((key) => {
        if (key && key.startsWith("sb-")) bag.removeItem(key);
      });
    });
    const { data, error } = await db.auth.signInWithPassword({
      email: normalizeEmail(email),
      password,
    });
    if (error) return { ok: false, error: dbError(error, "Correo o contraseña incorrectos.") };
    await applyAuthSession(data.session);
    if (!state.session || state.session.role !== role) {
      await db.auth.signOut();
      state.session = null;
      state.profile = null;
      return {
        ok: false,
        error: role === "admin"
          ? "Esa cuenta no es de administrador."
          : "Esa cuenta es de administrador. Entra en la pestaña Administrador.",
      };
    }
    await Promise.all([loadReservas(), loadInformes(), loadUsers()]);
    document.dispatchEvent(new Event("kinedom-session"));
    notify();
    return { ok: true, session: state.session };
  }

  async function logout() {
    const db = client();
    if (db) await db.auth.signOut();
    state.session = null;
    state.profile = null;
    state.users = [];
    state.informes = [];
    await loadReservas();
    document.dispatchEvent(new Event("kinedom-session"));
    notify();
  }

  async function requestPasswordReset(email) {
    const db = client();
    if (!db) return unavailable();
    const redirectTo = new URL("restablecer.html", window.location.href).href;
    const { error } = await db.auth.resetPasswordForEmail(normalizeEmail(email), { redirectTo });
    if (error) return { ok: false, error: dbError(error, "No se pudo enviar el correo de recuperación.") };
    return { ok: true };
  }

  async function updatePassword(password) {
    const db = client();
    if (!db) return unavailable();
    const { error } = await db.auth.updateUser({ password });
    if (error) return { ok: false, error: dbError(error, "No se pudo actualizar la contraseña.") };
    return { ok: true };
  }

  async function findEmails(nombre, codigo, celular) {
    const db = client();
    if (!db) return [];
    const { data, error } = await db.rpc("find_account_emails", {
      p_nombre: nombre,
      p_codigo: codigo,
      p_celular: String(celular).replace(/\D/g, ""),
    });
    if (error || !Array.isArray(data)) return [];
    return data.map((row) => row.email).filter(Boolean);
  }

  async function addReserva(reserva) {
    const db = client();
    if (!db) return unavailable();
    const session = getSession();
    if (!session || session.role !== "patient") {
      return { ok: false, error: "Entra con tu cuenta para agendar." };
    }
    const profile = state.profile || {};
    const row = {
      user_id: session.userId,
      email: session.email,
      fecha: reserva.fecha,
      hora: hourValue(reserva.hora),
      modalidad: reserva.modalidad === "Telemedicina" ? "Telemedicina" : "Domicilio",
      nombre: String(reserva.nombre || profile.nombre || session.name || "").trim(),
      edad: Number(reserva.edad || profile.edad) || null,
      direccion: String(reserva.direccion || profile.direccion || "").trim(),
      patologia: String(reserva.patologia || "").trim(),
    };
    const { error } = await db.from("citas").insert(row);
    if (error) return { ok: false, error: dbError(error, "No se pudo agendar la hora.") };
    await loadReservas();
    notify();
    openWhatsApp(
      [
        "Solicitud de hora.",
        `Paciente: ${row.nombre || session.name}`,
        `Correo: ${session.email}`,
        `Fecha: ${formatCitaFecha(row.fecha)}`,
        `Hora: ${row.hora}`,
        `Modalidad: ${row.modalidad}`,
        row.direccion ? `Dirección: ${row.direccion}` : "",
        row.patologia ? `Patología: ${row.patologia}` : "",
        "Estado: Pendiente",
      ]
        .filter(Boolean)
        .join("\n")
    );
    return { ok: true, estado: "pendiente" };
  }

  function currentPatient() {
    const session = getSession();
    if (!session || session.role !== "patient") return null;
    const user = state.profile;
    if (!user) return { nombre: session.name || "", edad: "", direccion: "" };
    return { nombre: user.nombre, edad: user.edad, direccion: user.direccion };
  }

  async function addCita(cita) {
    const session = getSession();
    if (!session || session.role !== "patient") {
      return { ok: false, error: "Entra con tu cuenta para agendar." };
    }
    const nombre = String(cita.nombre || "").trim().replace(/\s+/g, " ");
    const direccion = String(cita.direccion || "").trim().replace(/\s+/g, " ");
    const patologia = String(cita.patologia || "").trim().replace(/\s+/g, " ");
    const edad = Number(cita.edad);
    const fecha = String(cita.fecha || "");
    const hora = String(cita.hora || "");
    const modalidad = cita.modalidad === "Telemedicina" ? "Telemedicina" : "Domicilio";
    if (!/^[\p{L}\s'.-]{3,80}$/u.test(nombre) || !nombre.includes(" ")) {
      return { ok: false, field: "nombre", error: "Escribe el nombre completo." };
    }
    if (!Number.isInteger(edad) || edad < 1 || edad > 120) {
      return { ok: false, field: "edad", error: "Indica una edad válida, entre 1 y 120." };
    }
    if (direccion.length < 6 || direccion.length > 160) {
      return { ok: false, field: "direccion", error: "Escribe la dirección con calle y número." };
    }
    if (patologia.length < 2 || patologia.length > 240) {
      return { ok: false, field: "patologia", error: "Escribe la patología." };
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !/^\d{2}:\d{2}$/.test(hora)) {
      return { ok: false, error: "Elige de nuevo el día y la hora." };
    }
    return addReserva({ email: session.email, fecha, hora, modalidad, nombre, edad, direccion, patologia });
  }

  async function deleteCita(id) {
    const gate = requireAdmin();
    if (!gate.ok) return gate;
    const db = client();
    if (!db) return unavailable();
    const { error } = await db.from("citas").delete().eq("id", id);
    if (error) return { ok: false, error: dbError(error, "No encontramos esa hora.") };
    await loadReservas();
    notify();
    return { ok: true };
  }

  async function setCitaEstado(id, estado) {
    const gate = requireAdmin();
    if (!gate.ok) return gate;
    const db = client();
    if (!db) return unavailable();
    if (estado !== "pendiente" && estado !== "confirmado" && estado !== "rechazado") {
      return { ok: false, error: "Ese estado no es válido." };
    }
    const { error } = await db.from("citas").update({ estado }).eq("id", id);
    if (error) return { ok: false, error: dbError(error, "No se pudo actualizar el estado.") };
    await loadReservas();
    notify();
    return { ok: true, estado };
  }

  function listUsers() {
    return state.users.map((user) => ({
      id: user.id,
      nombre: user.nombre,
      edad: user.edad,
      fechaNacimiento: user.fechaNacimiento || "",
      direccion: user.direccion,
      tipoVivienda: user.tipoVivienda || "",
      numero: user.numero || "",
      comuna: user.comuna || "",
      torre: user.torre || "",
      codigo: user.codigo,
      celular: user.celular,
      email: user.email,
    }));
  }

  async function deleteUser(email) {
    const gate = requireAdmin();
    if (!gate.ok) return gate;
    const db = client();
    if (!db) return unavailable();
    const mail = normalizeEmail(email);
    const person = state.users.find((item) => item.email === mail);
    if (!person) return { ok: false, error: "No encontramos a esa persona." };
    const { error } = await db.rpc("delete_patient", { target: person.id });
    if (error) return { ok: false, error: dbError(error, "No se pudo eliminar la cuenta.") };
    await Promise.all([loadUsers(), loadReservas(), loadInformes()]);
    notify();
    return { ok: true };
  }

  function getInformes() {
    return state.informes.slice();
  }

  async function addInforme() {
    const db = client();
    if (!db) return unavailable();
    const session = getSession();
    if (!session || session.role !== "patient") {
      return { ok: false, error: "Entra con tu cuenta para solicitar el informe." };
    }
    const { data, error } = await db
      .from("informes")
      .insert({ user_id: session.userId, email: session.email, nombre: session.name })
      .select("*")
      .single();
    if (error) return { ok: false, error: dbError(error, "No se pudo registrar la solicitud.") };
    await loadInformes();
    notify();
    return { ok: true, informe: mapInforme(data) };
  }

  async function deleteInforme(id) {
    const gate = requireAdmin();
    if (!gate.ok) return gate;
    const db = client();
    if (!db) return unavailable();
    const { error } = await db.from("informes").delete().eq("id", id);
    if (error) return { ok: false, error: dbError(error, "No se pudo quitar la solicitud.") };
    await loadInformes();
    notify();
    return { ok: true };
  }

  async function saveInforme(id, texto) {
    const gate = requireAdmin();
    if (!gate.ok) return gate;
    const db = client();
    if (!db) return unavailable();
    const clean = String(texto || "").trim();
    if (clean.length < 20) return { ok: false, error: "Escribe el informe antes de guardarlo." };
    if (clean.length > 8000) return { ok: false, error: "El informe es demasiado largo para guardarlo." };
    const { error } = await db
      .from("informes")
      .update({ texto: clean, informe_fecha: new Date().toISOString() })
      .eq("id", id);
    if (error) return { ok: false, error: dbError(error, "No se pudo guardar el informe.") };
    await loadInformes();
    notify();
    return { ok: true };
  }

  function whatsappNumber() {
    let raw = "";
    if (window.KineDomContent) {
      const content = KineDomContent.get();
      raw = KineDomContent.pick(content, "footer.whatsapp") || KineDomContent.pick(content, "footer.phone") || "";
    }
    const digits = String(raw || "56941303571").replace(/\D/g, "");
    return digits === "56900000000" ? "56941303571" : digits || "56941303571";
  }

  function usesWhatsAppApp() {
    const ua = navigator.userAgent || "";
    if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return true;
    return navigator.maxTouchPoints > 1 && /Macintosh/i.test(ua);
  }

  function openWhatsApp(text) {
    const phone = whatsappNumber();
    const encoded = encodeURIComponent(text);
    if (usesWhatsAppApp()) {
      window.location.href = `whatsapp://send?phone=${phone}&text=${encoded}`;
      return { ok: true };
    }
    const link = document.createElement("a");
    link.href = `https://web.whatsapp.com/send?phone=${phone}&text=${encoded}`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.append(link);
    link.click();
    link.remove();
    return { ok: true };
  }

  function getSchedule() {
    return {
      published: Boolean(state.schedule.published),
      slots: state.schedule.slots || {},
    };
  }

  async function saveSchedule(schedule) {
    const gate = requireAdmin();
    if (!gate.ok) return gate;
    const db = client();
    if (!db) return unavailable();
    const slots = {};
    Object.keys(schedule.slots || {}).forEach((key) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return;
      const hours = [...new Set(schedule.slots[key] || [])].filter((hour) => /^\d{2}:\d{2}$/.test(hour)).sort();
      if (hours.length) slots[key] = hours;
    });
    const next = { id: 1, published: Boolean(schedule.published), slots, updated_at: new Date().toISOString() };
    const { error } = await db.from("schedule").upsert(next);
    if (error) return { ok: false, error: dbError(error, "No se pudo guardar la agenda.") };
    state.schedule = { published: next.published, slots };
    notify();
    return { ok: true };
  }

  async function updateAdminName(name) {
    const gate = requireAdmin();
    if (!gate.ok) return gate;
    const db = client();
    if (!db) return unavailable();
    const clean = String(name || "").trim().replace(/\s+/g, " ");
    if (clean.length < 2 || clean.length > 60) {
      return { ok: false, error: "El nombre de usuario debe tener entre 2 y 60 caracteres." };
    }
    const { error } = await db.from("profiles").update({ nombre: clean }).eq("id", gate.session.userId);
    if (error) return { ok: false, error: dbError(error, "No se pudo actualizar el nombre.") };
    state.session = { ...gate.session, name: clean };
    if (state.profile) state.profile.nombre = clean;
    document.dispatchEvent(new Event("kinedom-session"));
    return { ok: true, name: clean };
  }

  function maskEmail(email) {
    const [user, domain] = String(email).split("@");
    if (!domain) return email;
    return `${user.slice(0, 1)}${"•".repeat(Math.max(3, user.length - 1))}@${domain}`;
  }

  function getReservas() {
    return state.reservas.slice();
  }

  const ready = (async () => {
    await Promise.resolve();
    if (window.KineDomContent && KineDomContent.ready) await KineDomContent.ready;
    try {
      await refresh();
    } catch (error) {
      state.session = null;
    }
    subscribe();
    if (!client() && document.body) {
      const note = document.createElement("p");
      note.className = "bg-ink px-5 py-3 text-center text-sm text-cream";
      note.textContent = "La base de datos de Supabase todavía no está conectada. Falta pegar la URL del proyecto y la clave anon en js/supabase-config.js.";
      document.body.prepend(note);
    }
    document.dispatchEvent(new Event("kinedom-session"));
    notify();
    return getSession();
  })();

  return {
    canStore,
    ready,
    getSession,
    getReservas,
    listUsers,
    deleteUser,
    getSchedule,
    saveSchedule,
    listInformes: getInformes,
    addInforme,
    deleteInforme,
    saveInforme,
    openWhatsApp,
    updateAdminName,
    register,
    login,
    logout,
    requestPasswordReset,
    updatePassword,
    findEmails,
    addReserva,
    addCita,
    deleteCita,
    setCitaEstado,
    citaEstadoLabel,
    currentPatient,
    maskEmail,
    normalizeName,
    currentAdmin() {
      const session = getSession();
      if (!session || session.role !== "admin") return { email: "", name: "Administrador" };
      return { email: session.email, name: session.name || "Administrador" };
    },
  };
})();
