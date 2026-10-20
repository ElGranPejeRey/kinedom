(function () {
  const gate = document.getElementById("patient-gate");
  const app = document.getElementById("patient-app");
  const boot = window.KineDom && KineDom.ready ? KineDom.ready : Promise.resolve();
  boot.then(() => {
  const session = window.KineDom && KineDom.getSession();
  if (!session || session.role !== "patient") {
    gate.hidden = false;
    return;
  }
  app.hidden = false;

  const status = document.getElementById("patient-status");
  const welcome = document.getElementById("patient-welcome");
  welcome.textContent = `Bienvenido, ${session.name}`;

  function showStatus(message, isError) {
    status.hidden = !message;
    status.textContent = message || "";
    status.classList.toggle("is-error", Boolean(isError));
  }

  document.querySelectorAll("[data-panel]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-panel]").forEach((item) => {
        item.classList.toggle("is-active", item === button);
      });
      ["agendar", "informe"].forEach((name) => {
        document.getElementById(`panel-${name}`).hidden = name !== button.dataset.panel;
      });
      showStatus("");
    });
  });

  document.getElementById("patient-logout").addEventListener("click", async () => {
    await KineDom.logout();
    window.location.href = "index.html";
  });

  const citaModal = document.getElementById("cita-modal");
  const citaForm = document.getElementById("form-cita");
  const citaSlot = document.getElementById("cita-slot");
  const citaAlert = document.getElementById("cita-alert");
  let pendingCita = null;
  let citaFocus = null;

  function setCitaError(id, message) {
    const node = citaForm.querySelector(`[data-error-for="${id}"]`);
    if (node) node.textContent = message || "";
  }

  function clearCitaErrors() {
    citaForm.querySelectorAll(".field-error").forEach((node) => {
      node.textContent = "";
    });
    citaAlert.hidden = true;
    citaAlert.textContent = "";
  }

  function openCita(detail) {
    pendingCita = detail;
    clearCitaErrors();
    const profile = KineDom.currentPatient() || {};
    citaForm.nombre.value = profile.nombre || "";
    citaForm.edad.value = profile.edad || "";
    citaForm.direccion.value = profile.direccion || "";
    citaForm.patologia.value = "";
    citaSlot.textContent = `${detail.etiqueta} · ${detail.hora} · ${detail.modalidad}`;
    citaFocus = document.activeElement;
    citaModal.hidden = false;
    document.body.classList.add("overflow-hidden");
    citaForm.nombre.focus();
  }

  function closeCita() {
    citaModal.hidden = true;
    document.body.classList.remove("overflow-hidden");
    pendingCita = null;
    if (citaFocus && typeof citaFocus.focus === "function") citaFocus.focus();
  }

  window.addEventListener("kinedom-agendar", (event) => {
    if (!event.detail) return;
    openCita(event.detail);
  });

  citaModal.querySelectorAll("[data-close-cita]").forEach((node) => {
    node.addEventListener("click", closeCita);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !citaModal.hidden) closeCita();
  });

  citaForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!pendingCita) return;
    clearCitaErrors();
    const result = await KineDom.addCita({
      nombre: citaForm.nombre.value,
      edad: citaForm.edad.value,
      direccion: citaForm.direccion.value,
      patologia: citaForm.patologia.value,
      fecha: pendingCita.fecha,
      hora: pendingCita.hora,
      modalidad: pendingCita.modalidad,
    });
    if (!result.ok) {
      if (result.field) {
        const field = citaForm.elements[result.field];
        if (field) setCitaError(field.id, result.error);
      } else {
        citaAlert.hidden = false;
        citaAlert.textContent = result.error;
        citaAlert.classList.add("is-error");
      }
      return;
    }
    const when = pendingCita.etiqueta;
    const hour = pendingCita.hora;
    closeCita();
    renderPatientCitas();
    const text = `Solicitud enviada: ${when} a las ${hour}. El estado es Pendiente y se abrió WhatsApp para avisar al kinesiólogo.`;
    showStatus(text);
    window.dispatchEvent(new CustomEvent("kinedom-reservas", { detail: { text } }));
  });

  const citaList = document.getElementById("patient-citas");

  function estadoClass(estado) {
    if (estado === "confirmado") return "is-ready";
    if (estado === "rechazado") return "is-rejected";
    return "is-pending";
  }

  function renderPatientCitas() {
    if (!citaList) return;
    const mail = String(session.email || "").trim().toLowerCase();
    const citas = KineDom.getReservas()
      .filter((item) => item.email === mail && item.nombre)
      .slice()
      .sort((a, b) => `${b.fecha} ${b.hora}`.localeCompare(`${a.fecha} ${a.hora}`));
    citaList.replaceChildren();
    const heading = document.createElement("h2");
    heading.className = "font-serif text-3xl font-medium";
    heading.textContent = "Tus horas";
    citaList.append(heading);
    if (!citas.length) {
      const empty = document.createElement("p");
      empty.className = "mt-3 text-sm text-muted";
      empty.textContent = "Todavía no solicitas una hora.";
      citaList.append(empty);
      return;
    }
    citas.forEach((item) => {
      const card = document.createElement("article");
      card.className = "user-card";
      const [year, month, day] = String(item.fecha || "").split("-").map(Number);
      const label = Number.isFinite(year)
        ? new Date(year, month - 1, day).toLocaleDateString("es-CL", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })
        : item.fecha;
      const title = document.createElement("h3");
      title.className = "font-serif text-2xl";
      title.textContent = `${label} · ${item.hora}`;
      const mode = document.createElement("p");
      mode.className = "text-sm text-bark";
      mode.textContent = item.modalidad || "Domicilio";
      const state = document.createElement("p");
      state.className = `informe-state ${estadoClass(item.estado)}`;
      state.textContent = `Estado: ${KineDom.citaEstadoLabel(item.estado)}`;
      card.append(title, mode, state);
      citaList.append(card);
    });
  }

  const informeList = document.getElementById("patient-informes");

  function formatRequestDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Fecha no disponible";
    return new Intl.DateTimeFormat("es-CL", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  }

  function renderPatientInformes() {
    const mail = String(session.email || "").trim().toLowerCase();
    const informes = KineDom.listInformes().filter(
      (item) => String(item.email || "").trim().toLowerCase() === mail
    );
    informeList.replaceChildren();
    if (!informes.length) {
      const empty = document.createElement("p");
      empty.className = "text-sm text-muted";
      empty.textContent = "Todavía no has solicitado un informe kinésico.";
      informeList.append(empty);
      return;
    }
    informes.forEach((item) => {
      const ready = Boolean(String(item.texto || "").trim());
      const card = document.createElement("article");
      card.className = "user-card";
      const title = document.createElement("h2");
      title.className = "font-serif text-2xl";
      title.textContent = "Solicitud de informe kinésico";
      const when = document.createElement("p");
      when.className = "text-sm text-bark";
      when.textContent = `Fecha de solicitud: ${formatRequestDate(item.fecha)}`;
      const state = document.createElement("p");
      state.className = ready ? "informe-state is-ready" : "informe-state is-pending";
      state.textContent = ready ? "Estado: Listo" : "Estado: Solicitado";
      card.append(title, when, state);
      if (ready) {
        const actions = document.createElement("div");
        actions.className = "user-actions";
        const download = document.createElement("button");
        download.type = "button";
        download.className = "dash-solid";
        download.textContent = "Descargar PDF";
        download.addEventListener("click", () => {
          KineDomPdf.download({ nombre: item.nombre || session.name, email: item.email, texto: item.texto });
          showStatus("Se descargó el informe en PDF.");
        });
        actions.append(download);
        card.append(actions);
      }
      informeList.append(card);
    });
  }

  document.getElementById("informe-request").addEventListener("click", async () => {
    const result = await KineDom.addInforme();
    if (!result.ok) {
      showStatus(result.error, true);
      return;
    }
    renderPatientInformes();
    const current = KineDom.getSession();
    KineDom.openWhatsApp(
      [
        "Solicitud de informe kinésico.",
        `Paciente: ${current.name}`,
        `Correo: ${current.email}`,
        "Quiero solicitar mi informe kinésico.",
      ].join("\n")
    );
    showStatus("La solicitud quedó registrada con la fecha de hoy. El estado es Solicitado.");
  });

  document.addEventListener("kinedom-sync", () => {
    renderPatientInformes();
    renderPatientCitas();
  });
  window.addEventListener("pageshow", () => {
    renderPatientInformes();
    renderPatientCitas();
  });
  renderPatientInformes();
  renderPatientCitas();
  }).catch(() => {
    gate.hidden = false;
  });
})();
