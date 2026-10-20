(function () {
  const root = document.getElementById("calendar");
  if (!root || !window.KineDom) return;

  const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const MONTHS = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const maxMonth = new Date(today.getFullYear(), today.getMonth() + 4, 1);

  let viewYear = today.getFullYear();
  let viewMonth = today.getMonth();
  let selectedDate = null;
  let selectedHour = null;
  let modalidad = "Domicilio";
  let pendingMessage = null;

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function iso(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function applyReservations(data) {
    KineDom.getReservas().forEach((reserva) => {
      if (reserva.estado === "rechazado") return;
      const [year, month, day] = String(reserva.fecha || "").split("-").map(Number);
      if (year !== viewYear || month - 1 !== viewMonth) return;
      const date = new Date(year, month - 1, day);
      date.setHours(0, 0, 0, 0);
      if (date < today) return;
      if (!data[reserva.fecha]) data[reserva.fecha] = { available: [], booked: [] };
      data[reserva.fecha].available = data[reserva.fecha].available.filter(
        (hour) => hour !== reserva.hora
      );
      if (!data[reserva.fecha].booked.includes(reserva.hora)) {
        data[reserva.fecha].booked.push(reserva.hora);
      }
    });
    return data;
  }

  function scheduleAvailability(year, month) {
    const schedule = KineDom.getSchedule ? KineDom.getSchedule() : null;
    if (!schedule || !schedule.published) return {};
    const result = {};
    const days = new Date(year, month + 1, 0).getDate();
    const now = new Date();
    for (let day = 1; day <= days; day += 1) {
      const date = new Date(year, month, day);
      date.setHours(0, 0, 0, 0);
      if (date < today) continue;
      const key = iso(date);
      let slots = (schedule.slots[key] || []).slice();
      if (date.getTime() === today.getTime()) {
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        slots = slots.filter((slot) => {
          const [hours, minutes] = slot.split(":").map(Number);
          return hours * 60 + minutes > nowMinutes + 30;
        });
      }
      if (slots.length) result[key] = { available: slots.sort(), booked: [] };
    }
    return result;
  }

  function getData() {
    return applyReservations(scheduleAvailability(viewYear, viewMonth));
  }

  function isPublished() {
    const schedule = KineDom.getSchedule ? KineDom.getSchedule() : null;
    return Boolean(schedule && schedule.published);
  }

  function longDate(value) {
    const [year, month, day] = value.split("-").map(Number);
    return new Intl.DateTimeFormat("es-CL", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(new Date(year, month - 1, day));
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function renderMine() {
    const box = document.getElementById("mis-horas");
    if (!box) return;
    const session = KineDom.getSession();
    box.replaceChildren();
    if (!session || session.role !== "patient") {
      box.hidden = true;
      return;
    }
    box.hidden = false;
    box.append(el("h3", "", "Tus horas"));
    const mine = KineDom.getReservas().filter((item) => item.email === session.email);
    if (!mine.length) {
      box.append(el("p", "mine-empty", "Todavía no apartas una hora."));
      return;
    }
    mine.slice().reverse().forEach((item) => {
      const [year, month, day] = item.fecha.split("-").map(Number);
      const label = new Intl.DateTimeFormat("es-CL", {
        weekday: "short",
        day: "numeric",
        month: "short",
      }).format(new Date(year, month - 1, day));
      const card = el("div", "mine-item");
      card.append(el("p", "", `${label} · ${item.hora} · ${item.modalidad}`));
      const estado = item.estado === "confirmado" || item.estado === "rechazado" ? item.estado : "pendiente";
      const state = el("p", `informe-state is-${estado === "confirmado" ? "ready" : estado === "rechazado" ? "rejected" : "pending"}`, `Estado: ${KineDom.citaEstadoLabel(estado)}`);
      card.append(state);
      box.append(card);
    });
  }

  function fillPanel(panel, data) {
    if (!selectedDate) {
      panel.append(el("p", "cal-hint", "Selecciona un día marcado para ver las horas."));
      return;
    }
    const info = data[selectedDate] || { available: [], booked: [] };
    panel.append(el("h4", "cal-panel-title", longDate(selectedDate)));
    if (!info.available.length && !info.booked.length) {
      panel.append(el("p", "cal-hint", "Este día no tiene horas publicadas."));
      return;
    }

    const modes = el("div", "cal-modes");
    ["Domicilio", "Telemedicina"].forEach((mode) => {
      const button = el("button", "cal-mode", mode);
      button.type = "button";
      const active = mode === modalidad;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
      button.addEventListener("click", () => {
        modalidad = mode;
        render();
      });
      modes.append(button);
    });
    panel.append(modes);

    const slots = el("div", "cal-slots");
    [...info.available, ...info.booked].sort().forEach((hour) => {
      const booked = info.booked.includes(hour);
      const published = isPublished();
      const button = el("button", "cal-slot", booked || !published ? hour : `${hour} · Disponibilidad`);
      button.type = "button";
      if (booked) {
        button.classList.add("is-booked");
        button.disabled = true;
        button.setAttribute("aria-label", `${hour} ocupada`);
      } else if (hour === selectedHour) {
        button.classList.add("is-selected");
        if (published) button.classList.add("is-open");
        button.setAttribute("aria-pressed", "true");
        button.setAttribute("aria-label", published ? `${hour}, disponibilidad` : `${hour} disponible`);
      } else {
        if (published) button.classList.add("is-open");
        button.setAttribute("aria-pressed", "false");
        button.setAttribute("aria-label", published ? `${hour}, disponibilidad` : `${hour} disponible`);
      }
      button.addEventListener("click", () => {
        selectedHour = hour;
        render();
      });
      slots.append(button);
    });
    panel.append(slots);

    const agendaMode = root.dataset.mode === "agenda";
    const action = el(
      "button",
      "cal-book",
      !selectedHour ? "Elige una hora" : agendaMode ? "Agendar" : `Reservar ${selectedHour} · ${modalidad}`
    );
    action.type = "button";
    action.disabled = !selectedHour || !info.available.includes(selectedHour);
    action.addEventListener("click", book);
    panel.append(action);
    panel.append(el("p", "cal-msg", ""));
  }

  function render() {
    const data = getData();
    root.replaceChildren();
    const card = el("div", "cal-card");
    const head = el("div", "cal-head");
    const prev = el("button", "cal-nav");
    prev.type = "button";
    prev.setAttribute("aria-label", "Mes anterior");
    prev.innerHTML =
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6 9 12l6 6"></path></svg>';
    const next = el("button", "cal-nav");
    next.type = "button";
    next.setAttribute("aria-label", "Mes siguiente");
    next.innerHTML =
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"></path></svg>';

    const titleWrap = el("div", "cal-title-wrap");
    titleWrap.append(el("h3", "cal-title", `${MONTHS[viewMonth]} ${viewYear}`));
    const todayButton = el("button", "cal-today", "Hoy");
    todayButton.type = "button";
    titleWrap.append(todayButton);

    const current = new Date(viewYear, viewMonth, 1);
    prev.disabled = current <= minMonth;
    next.disabled = current >= maxMonth;
    prev.addEventListener("click", () => shiftMonth(-1));
    next.addEventListener("click", () => shiftMonth(1));
    todayButton.addEventListener("click", () => {
      viewYear = today.getFullYear();
      viewMonth = today.getMonth();
      render();
    });
    head.append(prev, titleWrap, next);

    const grid = el("div", "cal-grid");
    grid.setAttribute("role", "grid");
    grid.setAttribute("aria-label", `Calendario de ${MONTHS[viewMonth]} de ${viewYear}`);
    WEEKDAYS.forEach((label) => {
      const cell = el("div", "cal-weekday", label);
      cell.setAttribute("role", "columnheader");
      grid.append(cell);
    });

    const first = new Date(viewYear, viewMonth, 1);
    let lead = first.getDay() - 1;
    if (lead < 0) lead = 6;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    for (let index = 0; index < lead; index += 1) grid.append(el("div", "cal-empty"));

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(viewYear, viewMonth, day);
      date.setHours(0, 0, 0, 0);
      const key = iso(date);
      const info = data[key];
      const past = date < today;
      const openHours = info && info.available.length ? info.available : [];
      const publishedOpen = isPublished() && openHours.length;
      const button = el("button", "cal-day");
      button.type = "button";
      button.append(el("span", "cal-day-num", String(day)));
      if (publishedOpen) {
        button.append(el("span", "cal-open-label", "Disponibilidad"));
      }
      if (date.getTime() === today.getTime()) button.classList.add("is-today");
      if (key === selectedDate) button.classList.add("is-selected");
      if (openHours.length) button.classList.add("has-slots");
      if (publishedOpen) button.classList.add("is-open");
      if (past) button.classList.add("is-disabled");
      button.disabled = past;
      const spoken = new Intl.DateTimeFormat("es-CL", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(date);
      button.setAttribute(
        "aria-label",
        publishedOpen
          ? `${spoken}, disponibilidad a las ${openHours.join(" y ")}`
          : openHours.length
            ? `${spoken}, con horas disponibles`
            : `${spoken}, sin horas disponibles`
      );
      button.setAttribute("aria-pressed", key === selectedDate ? "true" : "false");
      button.addEventListener("click", () => {
        selectedDate = key;
        selectedHour = null;
        render();
      });
      grid.append(button);
    }

    const legend = el("div", "cal-legend");
    [
      [isPublished() ? "is-open-mark" : "is-free", isPublished() ? "Disponibilidad" : "Disponible"],
      ["is-busy", "Ocupada"],
      ["is-pick", "Seleccionada"],
    ].forEach(([kind, label]) => {
      const item = el("span", "cal-legend-item");
      item.append(el("i", kind), document.createTextNode(label));
      legend.append(item);
    });

    const panel = el("div", "cal-panel");
    panel.setAttribute("aria-live", "polite");
    fillPanel(panel, data);
    card.append(head, grid, legend, panel);
    root.append(card);
    renderMine();

    if (pendingMessage) {
      const message = document.querySelector(".cal-msg");
      if (message) {
        message.textContent = pendingMessage.text;
        message.className = `cal-msg ${pendingMessage.kind}`;
      }
      pendingMessage = null;
    }
  }

  function shiftMonth(delta) {
    viewMonth += delta;
    if (viewMonth < 0) {
      viewMonth = 11;
      viewYear -= 1;
    }
    if (viewMonth > 11) {
      viewMonth = 0;
      viewYear += 1;
    }
    selectedHour = null;
    render();
  }

  async function book() {
    if (!selectedDate || !selectedHour) return;
    const session = KineDom.getSession();
    if (root.dataset.mode === "agenda") {
      window.dispatchEvent(
        new CustomEvent("kinedom-agendar", {
          detail: {
            fecha: selectedDate,
            hora: selectedHour,
            modalidad,
            etiqueta: longDate(selectedDate),
          },
        })
      );
      return;
    }
    if (session && session.role === "admin") {
      pendingMessage = {
        kind: "is-error",
        text: "Las horas se reservan con una cuenta de paciente.",
      };
      render();
      return;
    }
    if (!session) {
      const query = new URLSearchParams({
        fecha: selectedDate,
        hora: selectedHour,
        modalidad,
      });
      window.location.href = `registro.html?${query.toString()}`;
      return;
    }
    const when = longDate(selectedDate);
    const hour = selectedHour;
    const mode = modalidad;
    const result = await KineDom.addReserva({
      email: session.email,
      fecha: selectedDate,
      hora,
      modalidad: mode,
    });
    if (!result.ok) {
      pendingMessage = { kind: "is-error", text: result.error };
      render();
      return;
    }
    selectedHour = null;
    pendingMessage = {
      kind: "is-ok",
      text: `Solicitud enviada: ${when} a las ${hour}, en modalidad ${mode}. El estado es Pendiente y se abrió WhatsApp para avisar al kinesiólogo.`,
    };
    render();
  }

  const boot = window.KineDom && KineDom.ready ? KineDom.ready : Promise.resolve();
  boot.then(() => {
    const initial = getData();
    const todayKey = iso(today);
    if (initial[todayKey] && initial[todayKey].available.length) selectedDate = todayKey;
    render();
  });

  window.addEventListener("kinedom-sync", () => render());
  window.addEventListener("kinedom-reservas", (event) => {
    selectedHour = null;
    if (event.detail && event.detail.text) {
      pendingMessage = { kind: "is-ok", text: event.detail.text };
    }
    render();
  });
  window.addEventListener("pageshow", () => render());
})();
