(function () {
  const root = document.getElementById("calendar");
  if (!root || !window.KineDom) return;

  const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const MODES = [
    { value: "Domicilio", label: "A domicilio", icon: "home" },
    { value: "Telemedicina", label: "Videoconsulta", icon: "video" },
  ];
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

  function longDate(value) {
    const [year, month, day] = value.split("-").map(Number);
    const formatted = new Intl.DateTimeFormat("es-CL", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(new Date(year, month - 1, day));
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  function modeLabel(value) {
    const mode = MODES.find((item) => item.value === value);
    return mode ? mode.label : "A domicilio";
  }

  function icon(name) {
    const paths = {
      home: '<path d="M4 11.2 12 5l8 6.2V20a1 1 0 0 1-1 1h-5.2v-6.2H10.2V21H5a1 1 0 0 1-1-1z"></path>',
      video: '<rect x="3" y="6.5" width="11" height="11" rx="2"></rect><path d="M14 10.2 21 7v10l-7-3.2z"></path>',
      clock: '<circle cx="12" cy="12" r="8"></circle><path d="M12 8.2V12l2.8 1.8"></path>',
      timer: '<path d="M9 3h6M12 7v1"></path><circle cx="12" cy="14" r="6.5"></circle><path d="M12 14V11"></path>',
      tag: '<path d="M20 13.2 12.2 21 3 11.8V4h7.8z"></path><circle cx="8.2" cy="8.2" r="1.1"></circle>',
      calendar: '<rect x="4" y="5" width="16" height="15" rx="2"></rect><path d="M8 3.5v4M16 3.5v4M4 10h16"></path>',
    };
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "18");
    svg.setAttribute("height", "18");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.7");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML = paths[name] || "";
    return svg;
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

  function summaryItem(iconName, label, value) {
    const item = el("div", "book-summary-item");
    item.append(icon(iconName));
    item.append(el("strong", "", label));
    item.append(el("span", "", value));
    return item;
  }

  function fillPanel(panel, data) {
    panel.className = "book-detail";
    if (!selectedDate) {
      panel.append(el("p", "cal-hint", "Toca un día en amarillo para ver los horarios."));
      return;
    }
    const info = data[selectedDate] || { available: [], booked: [] };
    panel.append(el("h3", "book-date", longDate(selectedDate)));
    if (!info.available.length && !info.booked.length) {
      panel.append(el("p", "cal-hint", "Este día no tiene horas publicadas."));
      return;
    }

    const modes = el("div", "book-modes");
    MODES.forEach((mode) => {
      const button = el("button", "book-mode");
      button.type = "button";
      button.append(icon(mode.icon), el("span", "", mode.label));
      const active = mode.value === modalidad;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
      button.addEventListener("click", () => {
        modalidad = mode.value;
        render();
      });
      modes.append(button);
    });
    panel.append(modes);

    const head = el("div", "book-hours-head");
    const title = el("p", "book-hours-title");
    title.append(icon("clock"), el("span", "", "Horarios disponibles"));
    const meta = el("div", "book-meta");
    const duration = el("span", "", "50 min");
    duration.prepend(icon("timer"));
    const price = el("span", "", "$25.000");
    price.prepend(icon("tag"));
    meta.append(duration, price);
    head.append(title, meta);
    panel.append(head);

    const slots = el("div", "book-slots");
    [...info.available, ...info.booked].sort().forEach((hour) => {
      const booked = info.booked.includes(hour);
      const button = el("button", "book-slot", hour);
      button.type = "button";
      if (booked) {
        button.classList.add("is-booked");
        button.disabled = true;
        button.setAttribute("aria-label", `${hour} ocupada`);
      } else if (hour === selectedHour) {
        button.classList.add("is-selected");
        button.setAttribute("aria-pressed", "true");
        button.setAttribute("aria-label", `${hour} seleccionada`);
      } else {
        button.setAttribute("aria-pressed", "false");
        button.setAttribute("aria-label", `${hour} disponible`);
      }
      button.addEventListener("click", () => {
        selectedHour = hour;
        render();
      });
      slots.append(button);
    });
    panel.append(slots);

    const summary = el("div", "book-summary");
    summary.append(
      summaryItem("calendar", "Fecha", longDate(selectedDate)),
      summaryItem("clock", "Horario", selectedHour || "Elige una"),
      summaryItem(modalidad === "Telemedicina" ? "video" : "home", "Modalidad", modeLabel(modalidad))
    );
    panel.append(summary);

    const action = el("button", "book-go");
    action.type = "button";
    action.append(el("span", "", "Continuar con la reserva"));
    action.insertAdjacentHTML(
      "beforeend",
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"></path></svg>'
    );
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

    const monthName = MONTHS[viewMonth].charAt(0).toUpperCase() + MONTHS[viewMonth].slice(1);
    const titleWrap = el("div", "cal-title-wrap");
    titleWrap.append(el("h3", "cal-title", `${monthName} ${viewYear}`));

    const current = new Date(viewYear, viewMonth, 1);
    prev.disabled = current <= minMonth;
    next.disabled = current >= maxMonth;
    prev.addEventListener("click", () => shiftMonth(-1));
    next.addEventListener("click", () => shiftMonth(1));
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
      const button = el("button", "cal-day");
      button.type = "button";
      button.append(el("span", "cal-day-num", String(day)));
      const fullyBooked = info && info.booked.length && !openHours.length;
      if (key === selectedDate) button.classList.add("is-selected");
      else if (openHours.length) button.classList.add("is-free");
      else if (fullyBooked) button.classList.add("is-busy");
      if (past) button.classList.add("is-disabled");
      button.disabled = past;
      const spoken = new Intl.DateTimeFormat("es-CL", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(date);
      button.setAttribute(
        "aria-label",
        openHours.length
          ? `${spoken}, disponible a las ${openHours.join(" y ")}`
          : info && info.booked.length
            ? `${spoken}, ocupado`
            : `${spoken}, sin horas`
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
      ["is-free", "Disponible"],
      ["is-busy", "Ocupada"],
      ["is-pick", "Seleccionada"],
    ].forEach(([kind, label]) => {
      const item = el("span", "cal-legend-item");
      item.append(el("i", kind), document.createTextNode(label));
      legend.append(item);
    });

    const panel = el("div", "book-detail");
    panel.setAttribute("aria-live", "polite");
    fillPanel(panel, data);
    card.append(head, grid, legend);
    root.append(card, panel);
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
            modalidadLabel: modeLabel(modalidad),
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
      text: `Solicitud enviada: ${when} a las ${hour}, ${modeLabel(mode)}. El estado es Pendiente y se abrió WhatsApp para avisar al kinesiólogo.`,
    };
    render();
  }

  const boot = window.KineDom && KineDom.ready ? KineDom.ready : Promise.resolve();
  boot.then(() => {
    const initial = getData();
    const todayKey = iso(today);
    const firstOpen = Object.keys(initial)
      .filter((key) => initial[key].available.length)
      .sort()[0];
    if (initial[todayKey] && initial[todayKey].available.length) selectedDate = todayKey;
    else if (firstOpen) selectedDate = firstOpen;
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
