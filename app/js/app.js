var KineApp = (() => {
  const SLOTS = ["18:00", "19:00"];
  const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const WEEK_NAMES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const VIEWS = ["inicio", "citas", "horas", "informes", "mas", "personas", "contenido", "cuenta"];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const ui = {
    view: "inicio",
    booting: true,
    busy: false,
    toast: null,
    loginError: "",
    citaFilter: "todas",
    peopleQuery: "",
    informeQuery: "",
    viewYear: today.getFullYear(),
    viewMonth: today.getMonth(),
    selected: iso(today),
    draft: {},
    dirty: false,
    contentDirty: false,
    modal: null,
    editing: null,
    informeText: "",
    informeMode: "write",
    informeAlert: "",
    ai: { motivo: "", antecedentes: "", evaluacion: "", plan: "" },
    installHidden: localStorage.getItem("kinedom-install-hide") === "1",
  };

  let toastTimer = 0;
  let bound = false;
  let listening = false;

  function iso(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[char]));
  }

  function app() {
    return document.getElementById("app");
  }

  function session() {
    return KineApi.data.session;
  }

  function namedCitas() {
    return KineApi.data.citas.filter((item) => item.nombre && item.id);
  }

  function occupying() {
    return KineApi.data.citas.filter((item) => item.estado !== "rechazado");
  }

  function pendingCitas() {
    return namedCitas().filter((item) => item.estado === "pendiente");
  }

  function pendingInformes() {
    return KineApi.data.informes.filter((item) => !item.texto);
  }

  function personByEmail(email) {
    return KineApi.data.users.find((user) => user.email === email);
  }

  function formatDay(fecha) {
    const [year, month, day] = String(fecha || "").split("-").map(Number);
    if (!year || !month || !day) return String(fecha || "");
    return new Intl.DateTimeFormat("es-CL", { weekday: "long", day: "numeric", month: "long" }).format(new Date(year, month - 1, day));
  }

  function formatStamp(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short" }).format(date);
  }

  function toast(message, isError) {
    ui.toast = message ? { message, isError: Boolean(isError) } : null;
    const el = document.getElementById("toast");
    if (el) {
      el.hidden = !message;
      el.textContent = message || "";
      el.classList.toggle("is-error", Boolean(isError));
    }
    clearTimeout(toastTimer);
    if (message) toastTimer = setTimeout(() => toast(""), isError ? 6400 : 4200);
  }

  function icon(name) {
    const paths = {
      home: '<path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z"/>',
      calendar: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/>',
      clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v5l3 2"/>',
      file: '<path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v6h6"/>',
      more: '<circle cx="6" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="18" cy="12" r="1.4"/>',
    };
    return `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;
  }

  function tabBar() {
    const tabs = [
      ["inicio", "Inicio", "home"],
      ["citas", "Citas", "calendar"],
      ["horas", "Horas", "clock"],
      ["informes", "Informes", "file"],
      ["mas", "Más", "more"],
    ];
    const current = ["personas", "contenido", "cuenta"].includes(ui.view) ? "mas" : ui.view;
    return `<nav class="tabs">${tabs.map(([id, label, glyph]) => {
      const count = id === "citas" ? pendingCitas().length : id === "informes" ? pendingInformes().length : 0;
      return `<button class="tab${current === id ? " is-on" : ""}" type="button" data-action="go" data-view="${id}">${icon(glyph)}${label}${count ? `<span class="count">${count}</span>` : ""}</button>`;
    }).join("")}</nav>`;
  }

  function header(eyebrow, title) {
    return `<header class="top"><div><p class="eyebrow">${esc(eyebrow)}</p><h1>${esc(title)}</h1></div><button class="icon-btn" type="button" data-action="refresh" aria-label="Actualizar">↻</button></header>`;
  }

  function badge(estado) {
    const key = estado === "confirmado" || estado === "rechazado" ? estado : "pendiente";
    return `<span class="badge ${key}">${esc(KineApi.citaEstadoLabel(key))}</span>`;
  }

  function citaCard(item) {
    const person = personByEmail(item.email);
    const phone = person && person.celular ? `${person.codigo || ""} ${person.celular}`.trim() : "";
    const tel = phone.replace(/\D/g, "");
    return `<article class="card">
      <h2>${esc(item.nombre)}</h2>
      <p class="bark">${esc(formatDay(item.fecha))} · ${esc(item.hora)} · ${esc(item.modalidad || "Domicilio")}</p>
      <p class="muted">${item.edad ? `Edad: ${esc(item.edad)} años` : "Edad: no indicada"}</p>
      <p class="muted">Dirección: ${esc(item.direccion || "no indicada")}</p>
      <p class="bark">Patología: ${esc(item.patologia || "no indicada")}</p>
      ${item.email ? `<p class="muted"><a href="mailto:${esc(item.email)}">${esc(item.email)}</a></p>` : ""}
      ${tel ? `<p class="muted"><a href="tel:+${esc(tel)}">${esc(phone)}</a></p>` : ""}
      ${badge(item.estado)}
      <div class="actions">
        ${item.estado !== "confirmado" ? `<button class="btn" type="button" data-action="cita-estado" data-id="${esc(item.id)}" data-estado="confirmado">Confirmar</button>` : ""}
        ${item.estado !== "rechazado" ? `<button class="btn soft" type="button" data-action="cita-estado" data-id="${esc(item.id)}" data-estado="rechazado">Rechazar</button>` : ""}
        <button class="btn danger" type="button" data-action="cita-delete" data-id="${esc(item.id)}">Quitar</button>
      </div>
    </article>`;
  }

  function signBlock() {
    return `<div class="sign"><b>Erick Rodrigo Barrios Arias</b><span>17.202.257-k</span><span>kinesiólogo</span><span>RSS: 664849</span></div>`;
  }

  function informeCard(item) {
    return `<article class="card">
      <h2>${esc(item.nombre)}</h2>
      <p class="bark">${esc(item.email)}</p>
      <p class="muted">${esc(formatStamp(item.fecha))}</p>
      <p class="bark">${item.texto ? "Informe creado" : "Solicitud de informe kinésico"}</p>
      ${item.texto ? `<p class="informe-body">${esc(item.texto)}</p>${signBlock()}` : ""}
      <div class="actions">
        <button class="btn" type="button" data-action="informe-open" data-id="${esc(item.id)}">${item.texto ? "Editar informe" : "Crear informe"}</button>
        ${item.texto ? `<button class="btn soft" type="button" data-action="informe-share" data-id="${esc(item.id)}">Compartir PDF</button><button class="btn soft" type="button" data-action="informe-mail" data-id="${esc(item.id)}">Enviar por correo</button>` : ""}
        <button class="btn danger" type="button" data-action="informe-delete" data-id="${esc(item.id)}">Quitar</button>
      </div>
    </article>`;
  }

  function filteredCitas() {
    return namedCitas()
      .filter((item) => ui.citaFilter === "todas" || item.estado === ui.citaFilter)
      .slice()
      .sort((a, b) => `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`));
  }

  function viewInicio() {
    const upcoming = namedCitas()
      .filter((item) => item.estado !== "rechazado" && item.fecha >= iso(today))
      .sort((a, b) => `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`))
      .slice(0, 4);
    const days = Object.keys(KineApi.data.schedule.slots || {}).length;
    const install = standalone() || ui.installHidden ? "" : `<section class="install">
      <strong>Instálala en el teléfono</strong>
      <p>${esc(installHelp())}</p>
      <button class="linkish" type="button" data-action="hide-install">Entendido</button>
    </section>`;
    return `${header("Panel", `Hola, ${session().name}`)}
      <div class="stats">
        <button class="stat" type="button" data-action="go-filter" data-view="citas" data-filter="pendiente"><b>${pendingCitas().length}</b><span>Citas pendientes</span></button>
        <button class="stat" type="button" data-action="go" data-view="informes"><b>${pendingInformes().length}</b><span>Informes por crear</span></button>
        <button class="stat" type="button" data-action="go" data-view="personas"><b>${KineApi.data.users.length}</b><span>Personas</span></button>
        <button class="stat" type="button" data-action="go" data-view="horas"><b>${days}</b><span>${KineApi.data.schedule.published ? "Días publicados" : "Días sin publicar"}</span></button>
      </div>
      ${install}
      <h2 class="section-title">Próximas horas</h2>
      ${upcoming.length ? upcoming.map(citaCard).join("") : `<p class="empty">No hay horas próximas confirmadas ni pendientes.</p>`}`;
  }

  function viewCitas() {
    const filters = [
      ["todas", "Todas"],
      ["pendiente", "Pendientes"],
      ["confirmado", "Confirmadas"],
      ["rechazado", "Rechazadas"],
    ];
    const list = filteredCitas();
    return `${header("Agenda", "Citas")}
      <p class="intro">Confirma o rechaza las solicitudes. Si rechazas una, esa hora vuelve a quedar disponible.</p>
      <div class="chips">${filters.map(([id, label]) => `<button class="chip${ui.citaFilter === id ? " is-on" : ""}" type="button" data-action="cita-filter" data-filter="${id}">${label}</button>`).join("")}</div>
      ${list.length ? list.map(citaCard).join("") : `<p class="empty">No hay citas en esta vista.</p>`}`;
  }

  function bookedOn(date) {
    return occupying().filter((item) => item.fecha === date).map((item) => item.hora);
  }

  function viewHoras() {
    const note = ui.dirty
      ? "Hay cambios sin guardar. Pulsa Guardar para que los días y las horas se vean en el sitio."
      : "Marca 18:00 y 19:00 en los días que quieras y pulsa Guardar. En el sitio quedan en amarillo, con la palabra disponibilidad.";
    const first = new Date(ui.viewYear, ui.viewMonth, 1);
    let lead = first.getDay() - 1;
    if (lead < 0) lead = 6;
    const days = new Date(ui.viewYear, ui.viewMonth + 1, 0).getDate();
    let cells = WEEKDAYS.map((label) => `<div class="cal-weekday">${label}</div>`).join("");
    for (let index = 0; index < lead; index += 1) cells += `<div></div>`;
    for (let day = 1; day <= days; day += 1) {
      const date = new Date(ui.viewYear, ui.viewMonth, day);
      const key = iso(date);
      const open = (ui.draft[key] || []).length > 0;
      const past = date < today;
      const classes = ["cal-day"];
      if (date.getTime() === today.getTime()) classes.push("is-today");
      if (key === ui.selected) classes.push("is-selected");
      if (open) classes.push("is-open", "has-slots");
      cells += `<button class="${classes.join(" ")}" type="button" data-action="pick-day" data-date="${key}" ${past ? "disabled" : ""}>${day}</button>`;
    }
    const selectedDate = new Date(`${ui.selected}T00:00:00`);
    const inMonth = selectedDate.getFullYear() === ui.viewYear && selectedDate.getMonth() === ui.viewMonth;
    let panel = `<p class="hint">Elige un día de este mes, marca las horas y pulsa Guardar.</p>`;
    if (inMonth && selectedDate >= today) {
      const reserved = bookedOn(ui.selected);
      const chosen = new Set(ui.draft[ui.selected] || []);
      reserved.forEach((hour) => chosen.add(hour));
      const hours = SLOTS.concat(reserved.filter((hour) => !SLOTS.includes(hour)));
      const slots = hours.map((hour) => {
        const locked = reserved.includes(hour);
        return `<label class="slot"><input type="checkbox" data-action="toggle-hour" value="${esc(hour)}" ${chosen.has(hour) ? "checked" : ""} ${locked ? "disabled" : ""}>${locked ? `${esc(hour)} reservada` : `${esc(hour)} · Disponibilidad`}</label>`;
      }).join("");
      const bookings = namedCitas().filter((item) => item.fecha === ui.selected && item.estado !== "rechazado");
      panel = `<h3>${esc(formatDay(ui.selected))}</h3>
        <div class="slots">${slots}</div>
        <div class="actions">
          <button class="btn" type="button" data-action="save-hours">Guardar</button>
          <button class="btn soft" type="button" data-action="copy-hours">Copiar a cada ${esc(WEEK_NAMES[selectedDate.getDay()])}</button>
          <button class="btn danger" type="button" data-action="clear-hours">Quitar horas de este día</button>
        </div>
        ${bookings.map((item) => `<p class="bark">${esc(item.hora)} · ${esc(item.modalidad)} · ${esc(item.nombre)}</p>`).join("")}`;
    }
    const published = KineApi.data.schedule.published;
    return `${header("Agenda", "Horas")}
      <p class="intro">${esc(note)}</p>
      <span class="badge ${published ? "live" : "off"}">${published ? "Publicadas en el sitio" : "Ocultas en el sitio"}</span>
      <div class="cal" style="margin-top:12px">
        <div class="cal-head">
          <button class="icon-btn" type="button" data-action="month" data-step="-1" aria-label="Mes anterior">‹</button>
          <h2>${MONTHS[ui.viewMonth]} ${ui.viewYear}</h2>
          <button class="icon-btn" type="button" data-action="month" data-step="1" aria-label="Mes siguiente">›</button>
        </div>
        <div class="cal-grid">${cells}</div>
        <div class="cal-panel">${panel}</div>
        <p class="legend"><span><i class="swatch"></i>Disponibilidad</span></p>
        <button class="linkish" type="button" data-action="unpublish">Dejar de publicar las horas en el sitio</button>
      </div>`;
  }

  function viewInformes() {
    const query = ui.informeQuery.trim().toLowerCase();
    const list = KineApi.data.informes.filter((item) => !query || `${item.nombre} ${item.email}`.toLowerCase().includes(query));
    return `${header("Pacientes", "Informes")}
      <p class="intro">Aquí llegan las solicitudes. En cada una puedes crear el informe y dejarlo firmado.</p>
      <input class="field search" id="informe-query" type="search" placeholder="Buscar paciente" value="${esc(ui.informeQuery)}">
      ${list.length ? list.map(informeCard).join("") : `<p class="empty">${query ? "Nadie coincide con esa búsqueda." : "Todavía no hay solicitudes de informe kinésico."}</p>`}`;
  }

  function viewMas() {
    const rows = [
      ["personas", "Personas", "Cuentas registradas y sus horas"],
      ["contenido", "Contenido del sitio", "Textos y fotos de la página"],
      ["cuenta", "Cuenta", "Nombre, contraseña y sesión"],
    ];
    return `${header("Panel", "Más")}
      ${rows.map(([view, title, text]) => `<button class="menu-row" type="button" data-action="go" data-view="${view}"><span><strong>${title}</strong><small>${text}</small></span><span class="chev">›</span></button>`).join("")}
      <a class="menu-row" href="${esc(KINEDOM_SUPABASE.site)}" target="_blank" rel="noopener noreferrer"><span><strong>Ver el sitio</strong><small>tukinedom.netlify.app</small></span><span class="chev">›</span></a>
      <button class="btn danger block" type="button" data-action="logout">Cerrar sesión</button>`;
  }

  function viewPersonas() {
    const query = ui.peopleQuery.trim().toLowerCase();
    const people = KineApi.data.users.filter((user) => !query || `${user.nombre} ${user.email} ${user.celular}`.toLowerCase().includes(query));
    const cards = people.map((user) => {
      const count = namedCitas().filter((item) => item.email === user.email).length;
      return `<article class="card">
        <h2>${esc(user.nombre)}</h2>
        <p class="bark">${esc(user.email)}</p>
        <p class="muted">${esc(user.codigo || "")} ${esc(user.celular || "")}${user.edad || user.edad === 0 ? ` · ${esc(user.edad)} años` : ""}${user.fechaNacimiento ? ` · ${esc(user.fechaNacimiento.split("-").reverse().join("-"))}` : ""}</p>
        <p class="muted">${user.tipoVivienda === "departamento" ? "Departamento · " : user.tipoVivienda === "casa" ? "Casa · " : ""}${esc(user.direccion || "")}</p>
        <p class="bark">${count === 1 ? "1 hora reservada" : `${count} horas reservadas`}</p>
        <div class="actions"><button class="btn danger" type="button" data-action="user-delete" data-email="${esc(user.email)}">Eliminar</button></div>
      </article>`;
    }).join("");
    return `${header("Pacientes", "Personas")}
      <button class="back" type="button" data-action="go" data-view="mas">‹ Más</button>
      <p class="intro">Estas cuentas están en la base de datos. Eliminar a una persona también borra sus horas y sus informes.</p>
      <input class="field search" id="people-query" type="search" placeholder="Buscar por nombre, correo o teléfono" value="${esc(ui.peopleQuery)}">
      ${cards || `<p class="empty">${query ? "Nadie coincide con esa búsqueda." : "Todavía no hay personas registradas."}</p>`}`;
  }

  function fieldControl(field, content) {
    const value = KineContent.pick(content, field.key) || "";
    if (field.type === "image") {
      const preview = value ? `<img class="preview" alt="" src="${esc(value)}">` : "";
      return `<div class="field-block"><label>${esc(field.label)}</label>${preview}<input class="field" type="file" accept="image/*" data-file="${esc(field.key)}"><label class="check"><input type="checkbox" data-clear="${esc(field.key)}">Volver a la imagen original</label></div>`;
    }
    if (field.type === "textarea") {
      return `<div class="field-block"><label>${esc(field.label)}</label><textarea class="field" data-key="${esc(field.key)}" rows="3">${esc(value)}</textarea></div>`;
    }
    return `<div class="field-block"><label>${esc(field.label)}</label><input class="field" type="text" data-key="${esc(field.key)}" value="${esc(value)}"></div>`;
  }

  function viewContenido() {
    const content = KineContent.merged(KineApi.data.content);
    const groups = KineContent.groups.map((group, index) => `<details class="group" ${index === 0 ? "open" : ""}><summary>${esc(group.title)}</summary><div class="pad">${group.fields.map((field) => fieldControl(field, content)).join("")}</div></details>`).join("");
    return `${header("Sitio", "Contenido")}
      <button class="back" type="button" data-action="go" data-view="mas">‹ Más</button>
      <p class="intro">Edita los textos y las fotos. Al guardar, los cambios quedan en la base de datos y se ven en el sitio.</p>
      <form id="content-form">${groups}</form>
      <div class="sticky-actions">
        <button class="btn block" type="button" data-action="content-save">Guardar contenido</button>
        <button class="btn soft block" type="button" data-action="content-restore">Restaurar textos originales</button>
      </div>`;
  }

  function viewCuenta() {
    const current = session();
    return `${header("Acceso", "Cuenta")}
      <button class="back" type="button" data-action="go" data-view="mas">‹ Más</button>
      <p class="intro">Este nombre aparece cuando entras como administrador. La sesión es la misma del sitio.</p>
      <form id="account-form" class="form">
        <div><label for="admin-name">Nombre de usuario</label><input id="admin-name" class="field" type="text" maxlength="60" required value="${esc(current.name)}"></div>
        <button class="btn block" type="submit">Guardar nombre</button>
      </form>
      <h2 class="section-title">Contraseña</h2>
      <form id="password-form" class="form">
        <div><label for="new-password">Nueva contraseña</label><input id="new-password" class="field" type="password" minlength="8" autocomplete="new-password" required></div>
        <div><label for="new-password2">Repite la contraseña</label><input id="new-password2" class="field" type="password" minlength="8" autocomplete="new-password" required></div>
        <button class="btn block" type="submit">Actualizar contraseña</button>
      </form>
      <p class="fine">${esc(current.email)}</p>
      <button class="btn danger block" type="button" data-action="logout" style="margin-top:16px">Cerrar sesión</button>`;
  }

  const renderers = {
    inicio: viewInicio,
    citas: viewCitas,
    horas: viewHoras,
    informes: viewInformes,
    mas: viewMas,
    personas: viewPersonas,
    contenido: viewContenido,
    cuenta: viewCuenta,
  };

  function loginHtml() {
    return `<main class="login">
      <div class="brand"><span class="logo">K</span><div><strong>KineDom</strong><span>Administrador</span></div></div>
      <h1>Entra para gestionar tu consulta</h1>
      <p class="lead">Citas, horas, pacientes, informes y el contenido del sitio, desde el teléfono.</p>
      <form id="login-form" class="form">
        <div><label for="login-email">Correo</label><input id="login-email" class="field" type="email" autocomplete="username" required></div>
        <div><label for="login-password">Contraseña</label><div class="password-row"><input id="login-password" class="field" type="password" autocomplete="current-password" required><button class="ghost" type="button" data-action="toggle-password" data-target="login-password">Ver</button></div></div>
        <p id="login-alert" class="alert" ${ui.loginError ? "" : "hidden"}>${esc(ui.loginError)}</p>
        <button id="login-submit" class="btn block" type="submit">Entrar</button>
      </form>
      <p class="fine">Usa la misma cuenta de administrador del sitio.</p>
    </main>`;
  }

  function shellHtml() {
    return `<div class="shell"><div class="view" id="view">${renderers[ui.view]()}</div>${tabBar()}</div>
      <p id="toast" class="toast${ui.toast && ui.toast.isError ? " is-error" : ""}" ${ui.toast ? "" : "hidden"}>${ui.toast ? esc(ui.toast.message) : ""}</p>
      <div id="modal-root">${ui.modal === "informe" ? modalHtml() : ""}</div>`;
  }

  function modalHtml() {
    const item = ui.editing;
    if (!item) return "";
    const ai = ui.informeMode === "ai";
    return `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="informe-title">
      <div class="modal-head">
        <div><p class="eyebrow">Informe</p><h2 id="informe-title">Crear informe</h2><p class="muted">${esc(item.nombre)} · ${esc(item.email)}</p></div>
        <button class="icon-btn" type="button" data-action="informe-close" aria-label="Cerrar">×</button>
      </div>
      <div class="mode">
        <button class="btn${ai ? " soft" : ""}" type="button" data-action="informe-mode" data-mode="write">Escribir</button>
        <button class="btn${ai ? "" : " soft"}" type="button" data-action="informe-mode" data-mode="ai">Solicitar con IA</button>
      </div>
      <p class="intro">${ai ? "Completa la información clínica y después pulsa Generar informe." : "Escribe el informe. La firma de Erick Rodrigo Barrios Arias, kinesiólogo, queda al final."}</p>
      <p id="informe-alert" class="alert" ${ui.informeAlert ? "" : "hidden"}>${esc(ui.informeAlert)}</p>
      <div ${ai ? "" : "hidden"}>
        <div class="field-block"><label for="ai-motivo">Motivo de consulta</label><textarea id="ai-motivo" class="field" rows="2" maxlength="400">${esc(ui.ai.motivo)}</textarea></div>
        <div class="field-block"><label for="ai-antecedentes">Antecedentes relevantes</label><textarea id="ai-antecedentes" class="field" rows="3" maxlength="800">${esc(ui.ai.antecedentes)}</textarea></div>
        <div class="field-block"><label for="ai-evaluacion">Evaluación</label><textarea id="ai-evaluacion" class="field" rows="3" maxlength="800" placeholder="Dolor, movilidad, fuerza y función">${esc(ui.ai.evaluacion)}</textarea></div>
        <div class="field-block"><label for="ai-plan">Plan e indicaciones</label><textarea id="ai-plan" class="field" rows="3" maxlength="800">${esc(ui.ai.plan)}</textarea></div>
        <button class="btn block" type="button" data-action="informe-generate" style="margin-top:12px">Generar informe</button>
      </div>
      <form id="informe-form" ${ai ? "hidden" : ""}>
        <label for="informe-texto">Informe</label>
        <textarea id="informe-texto" class="field" rows="12" maxlength="8000" required>${esc(ui.informeText)}</textarea>
        ${signBlock()}
        <div class="actions">
          <button class="btn soft" type="button" data-action="informe-share-current">Compartir PDF</button>
          <button class="btn soft" type="button" data-action="informe-mail-current">Enviar por correo</button>
        </div>
        <button class="btn block" type="submit" style="margin-top:12px">Guardar informe</button>
      </form>
    </div>`;
  }

  function paint() {
    const root = app();
    if (ui.booting) {
      root.className = "boot";
      root.innerHTML = `<span class="logo">K</span><p>Abriendo el panel…</p>`;
      return;
    }
    if (!session()) {
      root.className = "";
      root.innerHTML = loginHtml();
      return;
    }
    const scroller = document.querySelector(".view");
    const top = scroller ? scroller.scrollTop : 0;
    root.className = "";
    root.innerHTML = shellHtml();
    const next = document.querySelector(".view");
    if (next) next.scrollTop = top;
  }

  function standalone() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  }

  function installHelp() {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const android = /android/i.test(navigator.userAgent);
    if (ios) return "En Safari, pulsa Compartir y luego Agregar a inicio.";
    if (android) return "En Chrome, abre el menú y pulsa Instalar app o Agregar a la pantalla principal.";
    return "En el teléfono abre https://tukinedom.netlify.app/app/ y agrégala a la pantalla de inicio.";
  }

  function ensureDraft() {
    ui.draft = JSON.parse(JSON.stringify(KineApi.data.schedule.slots || {}));
    ui.dirty = false;
  }

  function canLeave() {
    if (!ui.contentDirty && !ui.dirty) return true;
    const ok = window.confirm("Hay cambios sin guardar. ¿Salir igual?");
    if (ok) {
      ui.contentDirty = false;
      ui.dirty = false;
    }
    return ok;
  }

  function navigate(view, replace) {
    if (!VIEWS.includes(view) || view === ui.view) return;
    if (!canLeave()) return;
    if (view === "horas") ensureDraft();
    ui.view = view;
    const url = `#${view}`;
    if (replace) history.replaceState({ view }, "", url);
    else history.pushState({ view }, "", url);
    paint();
  }

  function readAi() {
    ["motivo", "antecedentes", "evaluacion", "plan"].forEach((key) => {
      const node = document.getElementById(`ai-${key}`);
      if (node) ui.ai[key] = node.value;
    });
  }

  function readInformeText() {
    const node = document.getElementById("informe-texto");
    if (node) ui.informeText = node.value;
  }

  function informeContext(item) {
    const user = personByEmail(item.email);
    const citas = namedCitas().filter((cita) => cita.email === item.email);
    return { user, citas };
  }

  function draftInforme(item, answers) {
    const { user, citas } = informeContext(item);
    const edad = user && (user.edad || user.edad === 0) ? `${user.edad} años` : "edad no registrada en la ficha";
    const nacimiento = user && /^\d{4}-\d{2}-\d{2}$/.test(user.fechaNacimiento || "")
      ? new Date(
          Number(user.fechaNacimiento.slice(0, 4)),
          Number(user.fechaNacimiento.slice(5, 7)) - 1,
          Number(user.fechaNacimiento.slice(8, 10))
        ).toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" })
      : "";
    const direccion = user && user.direccion ? user.direccion : "dirección no registrada en la ficha";
    const atenciones = citas.length
      ? citas.map((cita) => `${formatDay(cita.fecha)} a las ${cita.hora}, en modalidad ${cita.modalidad || "domicilio"}`).join(". ")
      : "No hay horas agendadas registradas para este paciente.";
    return [
      "Informe kinésico",
      "",
      `Paciente: ${item.nombre}`,
      `Edad: ${edad}`,
      ...(nacimiento ? [`Fecha de nacimiento: ${nacimiento}`] : []),
      `Dirección: ${direccion}`,
      `Correo: ${item.email}`,
      "",
      "Motivo de consulta",
      `${item.nombre} consulta por ${answers.motivo}.`,
      "",
      "Antecedentes",
      answers.antecedentes,
      "",
      "Atenciones registradas",
      atenciones,
      "",
      "Evaluación",
      answers.evaluacion,
      "",
      "Plan",
      answers.plan,
      "",
      "Informe redactado a partir de la información entregada. Revísalo antes de entregarlo al paciente.",
    ].join("\n");
  }

  function currentReport() {
    readInformeText();
    const texto = ui.informeText.trim();
    if (!ui.editing || texto.length < 20) return null;
    return { nombre: ui.editing.nombre, email: ui.editing.email, texto };
  }

  async function sharePdf(item) {
    const bytes = KinePdf.reportPdf(item);
    const file = new File([bytes], KinePdf.fileName(item.nombre), { type: "application/pdf" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: file.name, text: `Informe kinésico de ${item.nombre}` });
      } catch (error) {
        if (error && error.name === "AbortError") return;
        throw error;
      }
      return;
    }
    const link = document.createElement("a");
    link.href = URL.createObjectURL(KinePdf.blobFor(item));
    link.download = file.name;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1500);
  }

  function mailInforme(item) {
    const subject = `Informe kinésico de ${item.nombre}`;
    const body = `Te envío el informe kinésico de ${item.nombre}.\nAdjunta el PDF: ${KinePdf.fileName(item.nombre)}\n\nErick Rodrigo Barrios Arias\n17.202.257-k\nkinesiólogo\nRSS: 664849`;
    window.location.href = `mailto:${encodeURIComponent(item.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  function findInforme(id) {
    return KineApi.data.informes.find((item) => item.id === id);
  }

  function openInforme(item) {
    const { citas } = informeContext(item);
    const motivos = [...new Set(citas.map((cita) => cita.patologia).filter(Boolean))];
    ui.editing = item;
    ui.informeText = item.texto || "";
    ui.informeMode = "write";
    ui.informeAlert = "";
    ui.ai = { motivo: motivos.join("; "), antecedentes: "", evaluacion: "", plan: "" };
    ui.modal = "informe";
    history.pushState({ modal: true, view: ui.view }, "", "#informe");
    paint();
  }

  function closeInforme() {
    if (location.hash === "#informe") {
      history.back();
      return;
    }
    ui.modal = null;
    ui.editing = null;
    paint();
  }

  function writeDraft(key, hours) {
    const kept = new Set(hours);
    bookedOn(key).forEach((hour) => kept.add(hour));
    const next = [...kept].sort();
    if (next.length) ui.draft[key] = next;
    else delete ui.draft[key];
    ui.dirty = true;
  }

  function checkedHours() {
    return [...document.querySelectorAll(".slots input:checked")].map((input) => input.value);
  }

  async function persistHours(published, message) {
    const result = await KineApi.saveSchedule({ published, slots: ui.draft });
    if (!result.ok) {
      toast(result.error, true);
      ensureDraft();
      paint();
      return;
    }
    ui.dirty = false;
    toast(message);
    paint();
  }

  function readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
      reader.readAsDataURL(file);
    });
  }

  async function saveContent() {
    const data = KineContent.merged(KineApi.data.content);
    document.querySelectorAll("[data-key]").forEach((input) => {
      KineContent.put(data, input.dataset.key, input.value.trim());
    });
    const files = [...document.querySelectorAll("[data-file]")];
    for (const input of files) {
      const key = input.dataset.file;
      const clear = document.querySelector(`[data-clear="${key}"]`);
      if (clear && clear.checked) {
        KineContent.put(data, key, "");
        continue;
      }
      const file = input.files && input.files[0];
      if (!file) continue;
      if (!file.type.startsWith("image/")) throw new Error("Elige un archivo de imagen.");
      if (file.size > 800 * 1024) throw new Error("Cada imagen debe pesar menos de 800 KB.");
      KineContent.put(data, key, await readFile(file));
    }
    const result = await KineApi.saveContent(data);
    if (!result.ok) {
      toast(result.error, true);
      return;
    }
    ui.contentDirty = false;
    toast("Contenido guardado. Ya se ve en el sitio.");
    paint();
  }

  async function withBusy(fn) {
    if (ui.busy) return;
    ui.busy = true;
    try {
      await fn();
    } catch (error) {
      toast(error.message || "No se pudo completar la acción.", true);
    } finally {
      ui.busy = false;
    }
  }

  async function onSubmit(event) {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (form.id === "login-form") {
      event.preventDefault();
      await withBusy(async () => {
        const button = document.getElementById("login-submit");
        button.disabled = true;
        button.textContent = "Entrando…";
        const result = await KineApi.login(form.querySelector("#login-email").value, form.querySelector("#login-password").value);
        if (!result.ok) {
          ui.loginError = result.error || "No se pudo entrar.";
          button.disabled = false;
          button.textContent = "Entrar";
          const alert = document.getElementById("login-alert");
          if (alert) {
            alert.hidden = false;
            alert.textContent = ui.loginError;
          }
          return;
        }
        ui.loginError = "";
        ensureDraft();
        ui.view = "inicio";
        history.replaceState({ view: "inicio" }, "", "#inicio");
        listen();
        paint();
      });
      return;
    }
    if (form.id === "account-form") {
      event.preventDefault();
      await withBusy(async () => {
        const result = await KineApi.updateAdminName(document.getElementById("admin-name").value);
        if (!result.ok) {
          toast(result.error, true);
          return;
        }
        toast(`Nombre actualizado. El acceso dirá: Hola, ${result.name}`);
        paint();
      });
      return;
    }
    if (form.id === "password-form") {
      event.preventDefault();
      const password = document.getElementById("new-password").value;
      const again = document.getElementById("new-password2").value;
      if (password.length < 8) {
        toast("La contraseña debe tener al menos 8 caracteres.", true);
        return;
      }
      if (password !== again) {
        toast("Las contraseñas no coinciden.", true);
        return;
      }
      await withBusy(async () => {
        const result = await KineApi.updatePassword(password);
        if (!result.ok) {
          toast(result.error, true);
          return;
        }
        form.reset();
        toast("Contraseña actualizada.");
      });
      return;
    }
    if (form.id === "informe-form") {
      event.preventDefault();
      readInformeText();
      await withBusy(async () => {
        const result = await KineApi.saveInforme(ui.editing.id, ui.informeText);
        if (!result.ok) {
          ui.informeAlert = result.error;
          const alert = document.getElementById("informe-alert");
          if (alert) {
            alert.hidden = false;
            alert.textContent = result.error;
          }
          return;
        }
        closeInforme();
        toast("Informe guardado, con la firma de Erick Rodrigo Barrios Arias, kinesiólogo.");
        paint();
      });
    }
    if (form.id === "content-form") event.preventDefault();
  }

  async function onClick(event) {
    const node = event.target.closest("[data-action]");
    if (!node || !app().contains(node)) return;
    const action = node.dataset.action;
    if (action === "go") {
      navigate(node.dataset.view);
      return;
    }
    if (action === "go-filter") {
      ui.citaFilter = node.dataset.filter || "todas";
      navigate(node.dataset.view);
      return;
    }
    if (action === "toggle-password") {
      const input = document.getElementById(node.dataset.target);
      if (!input) return;
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      node.textContent = show ? "Ocultar" : "Ver";
      return;
    }
    if (action === "hide-install") {
      ui.installHidden = true;
      localStorage.setItem("kinedom-install-hide", "1");
      paint();
      return;
    }
    if (action === "logout") {
      if (!canLeave()) return;
      await KineApi.logout();
      ui.modal = null;
      history.replaceState({}, "", location.pathname);
      paint();
      return;
    }
    if (action === "refresh") {
      await withBusy(async () => {
        await KineApi.loadAll();
        if (!ui.dirty) ensureDraft();
        toast("Datos actualizados.");
        paint();
      });
      return;
    }
    if (action === "cita-filter") {
      ui.citaFilter = node.dataset.filter;
      paint();
      return;
    }
    if (action === "cita-estado") {
      await withBusy(async () => {
        const result = await KineApi.setCitaEstado(node.dataset.id, node.dataset.estado);
        if (!result.ok) {
          toast(result.error, true);
          return;
        }
        toast(node.dataset.estado === "confirmado" ? "La hora quedó confirmada." : "La hora quedó rechazada y vuelve a estar disponible.");
        paint();
      });
      return;
    }
    if (action === "cita-delete") {
      if (!window.confirm("¿Quitar esta hora agendada?")) return;
      await withBusy(async () => {
        const result = await KineApi.deleteCita(node.dataset.id);
        if (!result.ok) {
          toast(result.error, true);
          return;
        }
        toast("Se quitó la hora agendada.");
        paint();
      });
      return;
    }
    if (action === "user-delete") {
      const person = personByEmail(node.dataset.email);
      if (!person || !window.confirm(`¿Eliminar la cuenta de ${person.nombre}?`)) return;
      await withBusy(async () => {
        const result = await KineApi.deleteUser(person.email);
        if (!result.ok) {
          toast(result.error, true);
          return;
        }
        toast(`Se eliminó a ${person.nombre}.`);
        paint();
      });
      return;
    }
    if (action === "informe-open") {
      const item = findInforme(node.dataset.id);
      if (item) openInforme(item);
      return;
    }
    if (action === "informe-delete") {
      if (!window.confirm("¿Quitar esta solicitud de informe?")) return;
      await withBusy(async () => {
        const result = await KineApi.deleteInforme(node.dataset.id);
        if (!result.ok) {
          toast(result.error, true);
          return;
        }
        toast("Se quitó la solicitud de informe.");
        paint();
      });
      return;
    }
    if (action === "informe-share" || action === "informe-mail") {
      const item = findInforme(node.dataset.id);
      if (!item || !item.texto) return;
      await withBusy(async () => {
        if (action === "informe-share") await sharePdf(item);
        else mailInforme(item);
      });
      return;
    }
    if (action === "informe-close") {
      closeInforme();
      return;
    }
    if (action === "informe-mode") {
      readInformeText();
      readAi();
      ui.informeMode = node.dataset.mode;
      ui.informeAlert = "";
      paint();
      return;
    }
    if (action === "informe-generate") {
      readAi();
      const answers = {
        motivo: ui.ai.motivo.trim().replace(/\s+/g, " "),
        antecedentes: ui.ai.antecedentes.trim().replace(/\s+/g, " "),
        evaluacion: ui.ai.evaluacion.trim().replace(/\s+/g, " "),
        plan: ui.ai.plan.trim().replace(/\s+/g, " "),
      };
      let message = "";
      if (answers.motivo.length < 3) message = "Escribe el motivo de consulta.";
      else if (answers.antecedentes.length < 3) message = "Escribe los antecedentes relevantes.";
      else if (answers.evaluacion.length < 8) message = "Describe la evaluación: dolor, movilidad, fuerza o función.";
      else if (answers.plan.length < 8) message = "Escribe el plan y las indicaciones.";
      if (message) {
        ui.informeAlert = message;
        paint();
        return;
      }
      readInformeText();
      if (ui.informeText.trim() && !window.confirm("¿Reemplazar el informe actual por el texto generado?")) return;
      ui.informeText = draftInforme(ui.editing, answers);
      ui.informeMode = "write";
      ui.informeAlert = "";
      paint();
      return;
    }
    if (action === "informe-share-current" || action === "informe-mail-current") {
      const report = currentReport();
      if (!report) {
        ui.informeAlert = "Escribe el informe antes de compartirlo.";
        paint();
        return;
      }
      await withBusy(async () => {
        if (action === "informe-share-current") await sharePdf(report);
        else mailInforme(report);
      });
      return;
    }
    if (action === "month") {
      ui.viewMonth += Number(node.dataset.step);
      if (ui.viewMonth < 0) {
        ui.viewMonth = 11;
        ui.viewYear -= 1;
      }
      if (ui.viewMonth > 11) {
        ui.viewMonth = 0;
        ui.viewYear += 1;
      }
      paint();
      return;
    }
    if (action === "pick-day") {
      ui.selected = node.dataset.date;
      paint();
      return;
    }
    if (action === "toggle-hour") return;
    if (action === "save-hours") {
      await withBusy(() => persistHours(true, "Cambios guardados. Las horas ya se ven en el calendario del sitio."));
      return;
    }
    if (action === "copy-hours") {
      const selectedDate = new Date(`${ui.selected}T00:00:00`);
      const hours = checkedHours();
      const total = new Date(ui.viewYear, ui.viewMonth + 1, 0).getDate();
      for (let day = 1; day <= total; day += 1) {
        const date = new Date(ui.viewYear, ui.viewMonth, day);
        if (date < today || date.getDay() !== selectedDate.getDay()) continue;
        writeDraft(iso(date), hours);
      }
      toast(`Esas horas quedaron en cada ${WEEK_NAMES[selectedDate.getDay()]} de este mes. Pulsa Guardar para publicarlas.`);
      paint();
      return;
    }
    if (action === "clear-hours") {
      writeDraft(ui.selected, []);
      toast("Este día quedó sin horas. Pulsa Guardar para aplicar el cambio en el sitio.");
      paint();
      return;
    }
    if (action === "unpublish") {
      await withBusy(() => persistHours(false, "Las horas dejaron de mostrarse en el sitio."));
      return;
    }
    if (action === "content-save") {
      await withBusy(saveContent);
      return;
    }
    if (action === "content-restore") {
      if (!window.confirm("¿Restaurar todos los textos e imágenes originales?")) return;
      await withBusy(async () => {
        const result = await KineApi.restoreContent();
        if (!result.ok) {
          toast(result.error, true);
          return;
        }
        ui.contentDirty = false;
        toast("Se restauró el contenido original.");
        paint();
      });
    }
  }

  function onInput(event) {
    const target = event.target;
    if (target.id === "people-query") {
      ui.peopleQuery = target.value;
      paint();
      const input = document.getElementById("people-query");
      if (input) {
        input.focus();
        const end = input.value.length;
        input.setSelectionRange(end, end);
      }
      return;
    }
    if (target.id === "informe-query") {
      ui.informeQuery = target.value;
      paint();
      const input = document.getElementById("informe-query");
      if (input) {
        input.focus();
        const end = input.value.length;
        input.setSelectionRange(end, end);
      }
      return;
    }
    if (target.dataset && target.dataset.key) ui.contentDirty = true;
    if (target.id && target.id.startsWith("ai-")) readAi();
    if (target.id === "informe-texto") ui.informeText = target.value;
  }

  async function onChange(event) {
    const target = event.target;
    if (target.dataset && target.dataset.action === "toggle-hour") {
      writeDraft(ui.selected, checkedHours());
      paint();
      return;
    }
    if (target.dataset && target.dataset.clear) ui.contentDirty = true;
    if (target.dataset && target.dataset.file) {
      ui.contentDirty = true;
      const file = target.files && target.files[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        toast("Elige un archivo de imagen.", true);
        target.value = "";
        return;
      }
      if (file.size > 800 * 1024) {
        toast("Cada imagen debe pesar menos de 800 KB.", true);
        target.value = "";
        return;
      }
      const url = await readFile(file);
      let preview = target.parentElement.querySelector("img");
      if (!preview) {
        preview = document.createElement("img");
        preview.className = "preview";
        preview.alt = "";
        target.before(preview);
      }
      preview.src = url;
    }
  }

  function onRemote(kind) {
    if (ui.modal === "informe") return;
    if (ui.view === "contenido" && ui.contentDirty) return;
    if (kind === "schedule" && ui.dirty) return;
    if (kind === "schedule" && !ui.dirty) ui.draft = JSON.parse(JSON.stringify(KineApi.data.schedule.slots || {}));
    if (session()) paint();
  }

  function listen() {
    if (listening) return;
    listening = true;
    KineApi.subscribe(onRemote);
  }

  function bind() {
    if (bound) return;
    bound = true;
    const root = app();
    root.addEventListener("click", onClick);
    root.addEventListener("submit", onSubmit);
    root.addEventListener("input", onInput);
    root.addEventListener("change", onChange);
    window.addEventListener("popstate", () => {
      if (ui.modal) {
        ui.modal = null;
        ui.editing = null;
        paint();
        return;
      }
      if (!session()) return;
      const view = location.hash.replace("#", "");
      if (!VIEWS.includes(view) || view === ui.view) return;
      if (!canLeave()) {
        history.pushState({ view: ui.view }, "", `#${ui.view}`);
        return;
      }
      if (view === "horas") ensureDraft();
      ui.view = view;
      paint();
    });
  }

  async function start() {
    bind();
    ui.booting = true;
    paint();
    if (!window.supabase) {
      ui.booting = false;
      ui.loginError = "No se pudo cargar la conexión. Revisa tu internet y vuelve a abrir la app.";
      paint();
      return;
    }
    try {
      const result = await KineApi.restore();
      ui.booting = false;
      if (result.ok) {
        ensureDraft();
        ui.view = "inicio";
        history.replaceState({ view: "inicio" }, "", "#inicio");
        listen();
      }
    } catch (error) {
      ui.booting = false;
      ui.loginError = "No se pudo conectar con la base de datos.";
    }
    paint();
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    }
  }

  return { start };
})();

KineApp.start();
