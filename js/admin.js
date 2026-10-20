(function () {
  const gate = document.getElementById("dash-gate");
  const app = document.getElementById("dash-app");
  const boot = window.KineDom && KineDom.ready ? KineDom.ready : Promise.resolve();
  boot.then(() => {
  const session = window.KineDom && KineDom.getSession();
  if (!session || session.role !== "admin") {
    gate.hidden = false;
    return;
  }
  app.hidden = false;

  const status = document.getElementById("dash-status");
  const welcome = document.getElementById("dash-welcome");

  function paintWelcome() {
    const current = KineDom.getSession();
    welcome.textContent = `Bienvenido, ${current ? current.name : session.name}`;
  }

  function showStatus(message, isError) {
    status.hidden = !message;
    status.textContent = message || "";
    status.classList.toggle("is-error", Boolean(isError));
  }

  paintWelcome();

  document.querySelectorAll("[data-panel]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-panel]").forEach((item) => {
        item.classList.toggle("is-active", item === button);
      });
      ["contenido", "personas", "horas", "citas", "informes", "cuenta"].forEach((name) => {
        document.getElementById(`panel-${name}`).hidden = name !== button.dataset.panel;
      });
      showStatus("");
    });
  });

  document.getElementById("dash-logout").addEventListener("click", async () => {
    await KineDom.logout();
    window.location.href = "index.html";
  });

  const form = document.getElementById("content-form");
  form.addEventListener("submit", (event) => event.preventDefault());

  function fieldControl(field, content) {
    const wrap = document.createElement("div");
    wrap.className = "mt-4";
    const label = document.createElement("label");
    label.className = "mb-1.5 block text-sm font-medium text-bark";
    label.textContent = field.label;
    wrap.append(label);
    const value = KineDomContent.pick(content, field.key) || "";
    if (field.type === "image") {
      if (value) {
        const preview = document.createElement("img");
        preview.className = "image-preview";
        preview.alt = "";
        preview.src = value;
        wrap.append(preview);
      }
      const input = document.createElement("input");
      input.className = "field";
      input.type = "file";
      input.accept = "image/*";
      input.dataset.file = field.key;
      wrap.append(input);
      const clearWrap = document.createElement("label");
      clearWrap.className = "mt-2 flex items-center gap-2 text-sm text-muted";
      const clear = document.createElement("input");
      clear.type = "checkbox";
      clear.dataset.clear = field.key;
      clearWrap.append(clear, document.createTextNode("Volver a la imagen original"));
      wrap.append(clearWrap);
      return wrap;
    }
    const input = document.createElement(field.type === "textarea" ? "textarea" : "input");
    input.className = "field";
    if (field.type !== "textarea") input.type = "text";
    input.dataset.key = field.key;
    input.value = value;
    wrap.append(input);
    return wrap;
  }

  function renderContentForm() {
    const content = KineDomContent.get();
    form.replaceChildren();
    KineDomContent.groups.forEach((group, index) => {
      const details = document.createElement("details");
      details.className = "dash-group";
      if (index === 0) details.open = true;
      const summary = document.createElement("summary");
      summary.textContent = group.title;
      details.append(summary);
      group.fields.forEach((field) => details.append(fieldControl(field, content)));
      form.append(details);
    });
  }

  function readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
      reader.readAsDataURL(file);
    });
  }

  document.getElementById("content-save").addEventListener("click", async () => {
    const data = KineDomContent.get();
    form.querySelectorAll("[data-key]").forEach((input) => {
      KineDomContent.put(data, input.dataset.key, input.value.trim());
    });
    const files = [...form.querySelectorAll("[data-file]")];
    try {
      for (const input of files) {
        const key = input.dataset.file;
        const clear = form.querySelector(`[data-clear="${key}"]`);
        if (clear && clear.checked) {
          KineDomContent.put(data, key, "");
          continue;
        }
        const file = input.files && input.files[0];
        if (!file) continue;
        if (!file.type.startsWith("image/")) throw new Error("Elige un archivo de imagen.");
        if (file.size > 800 * 1024) throw new Error("Cada imagen debe pesar menos de 800 KB.");
        KineDomContent.put(data, key, await readFile(file));
      }
    } catch (error) {
      showStatus(error.message, true);
      return;
    }
    const result = await KineDomContent.save(data);
    if (!result.ok) {
      showStatus(result.error, true);
      return;
    }
    renderContentForm();
    showStatus("Contenido guardado. Ya se ve en el sitio.");
  });

  document.getElementById("content-restore").addEventListener("click", async () => {
    if (!window.confirm("¿Restaurar todos los textos e imágenes originales?")) return;
    await KineDomContent.restore();
    renderContentForm();
    showStatus("Se restauró el contenido original.");
  });

  renderContentForm();

  const userList = document.getElementById("user-list");

  function renderUsers() {
    const users = KineDom.listUsers();
    const reservas = KineDom.getReservas();
    userList.replaceChildren();
    if (!users.length) {
      const empty = document.createElement("p");
      empty.className = "text-sm text-muted";
      empty.textContent = "Todavía no hay personas registradas.";
      userList.append(empty);
      return;
    }
    users.forEach((user) => {
      const card = document.createElement("article");
      card.className = "user-card";
      const title = document.createElement("h2");
      title.className = "font-serif text-2xl";
      title.textContent = user.nombre;
      const mail = document.createElement("p");
      mail.className = "text-sm text-bark";
      mail.textContent = user.email;
      const phone = document.createElement("p");
      phone.className = "text-sm text-muted";
      phone.textContent = `${user.codigo} ${user.celular} · ${user.edad} años`;
      const address = document.createElement("p");
      address.className = "text-sm text-muted";
      address.textContent = user.direccion;
      const count = reservas.filter((item) => item.email === user.email).length;
      const bookings = document.createElement("p");
      bookings.className = "text-sm text-bark";
      bookings.textContent = count === 1 ? "1 hora reservada" : `${count} horas reservadas`;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "dash-danger";
      button.textContent = "Eliminar";
      button.addEventListener("click", async () => {
        if (!window.confirm(`¿Eliminar la cuenta de ${user.nombre}?`)) return;
        const result = await KineDom.deleteUser(user.email);
        if (!result.ok) {
          showStatus(result.error, true);
          return;
        }
        renderUsers();
        renderInformes();
        renderCitas();
        showStatus(`Se eliminó a ${user.nombre}.`);
      });
      card.append(title, mail, phone, address, bookings, button);
      userList.append(card);
    });
  }

  renderUsers();

  async function changeCitaEstado(id, estado, message) {
    const result = await KineDom.setCitaEstado(id, estado);
    if (!result.ok) {
      showStatus(result.error, true);
      return;
    }
    renderCitas();
    renderHours();
    showStatus(message);
  }

  function renderCitas() {
    const list = document.getElementById("cita-list");
    const citas = KineDom.getReservas()
      .filter((item) => item.nombre)
      .slice()
      .sort((a, b) => `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`));
    list.replaceChildren();
    if (!citas.length) {
      const empty = document.createElement("p");
      empty.className = "text-sm text-muted";
      empty.textContent = "Todavía no hay horas agendadas.";
      list.append(empty);
      return;
    }
    citas.forEach((item) => {
      const card = document.createElement("article");
      card.className = "user-card";
      const title = document.createElement("h2");
      title.className = "font-serif text-2xl";
      title.textContent = item.nombre || "Paciente";
      const when = document.createElement("p");
      when.className = "text-sm font-semibold text-bark";
      const [year, month, day] = String(item.fecha || "").split("-").map(Number);
      const label = Number.isFinite(year)
        ? new Date(year, month - 1, day).toLocaleDateString("es-CL", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })
        : item.fecha;
      when.textContent = `${label} · ${item.hora} · ${item.modalidad || "Domicilio"}`;
      const age = document.createElement("p");
      age.className = "text-sm text-muted";
      age.textContent = item.edad ? `Edad: ${item.edad} años` : "Edad: no indicada";
      const address = document.createElement("p");
      address.className = "text-sm text-muted";
      address.textContent = `Dirección: ${item.direccion || "no indicada"}`;
      const condition = document.createElement("p");
      condition.className = "text-sm text-bark";
      condition.textContent = `Patología: ${item.patologia || "no indicada"}`;
      const estado = item.estado === "confirmado" || item.estado === "rechazado" ? item.estado : "pendiente";
      const state = document.createElement("p");
      state.className = `informe-state ${estado === "confirmado" ? "is-ready" : estado === "rechazado" ? "is-rejected" : "is-pending"}`;
      state.textContent = `Estado: ${KineDom.citaEstadoLabel(estado)}`;
      card.append(title, when, age, address, condition, state);
      if (item.id) {
        const actions = document.createElement("div");
        actions.className = "user-actions";
        if (estado !== "confirmado") {
          const confirm = document.createElement("button");
          confirm.type = "button";
          confirm.className = "dash-solid";
          confirm.textContent = "Confirmar";
          confirm.addEventListener("click", () => changeCitaEstado(item.id, "confirmado", "La hora quedó confirmada."));
          actions.append(confirm);
        }
        if (estado !== "rechazado") {
          const reject = document.createElement("button");
          reject.type = "button";
          reject.className = "dash-solid is-soft";
          reject.textContent = "Rechazar";
          reject.addEventListener("click", () => changeCitaEstado(item.id, "rechazado", "La hora quedó rechazada y vuelve a estar disponible."));
          actions.append(reject);
        }
        const button = document.createElement("button");
        button.type = "button";
        button.className = "dash-danger";
        button.textContent = "Quitar";
        button.addEventListener("click", async () => {
          const result = await KineDom.deleteCita(item.id);
          if (!result.ok) {
            showStatus(result.error, true);
            return;
          }
          renderCitas();
          renderUsers();
          renderHours();
          showStatus("Se quitó la hora agendada.");
        });
        actions.append(button);
        card.append(actions);
      }
      list.append(card);
    });
  }

  renderCitas();

  function renderInformes() {
    const list = document.getElementById("informe-list");
    const informes = KineDom.listInformes();
    list.replaceChildren();
    if (!informes.length) {
      const empty = document.createElement("p");
      empty.className = "text-sm text-muted";
      empty.textContent = "Todavía no hay solicitudes de informe kinésico.";
      list.append(empty);
      return;
    }
    informes.forEach((item) => {
      const card = document.createElement("article");
      card.className = "user-card";
      const title = document.createElement("h2");
      title.className = "font-serif text-2xl";
      title.textContent = item.nombre;
      const mail = document.createElement("p");
      mail.className = "text-sm text-bark";
      mail.textContent = item.email;
      const when = document.createElement("p");
      when.className = "text-sm text-muted";
      when.textContent = new Intl.DateTimeFormat("es-CL", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(item.fecha));
      const note = document.createElement("p");
      note.className = "text-sm text-bark";
      note.textContent = item.texto ? "Informe creado" : "Solicitud de informe kinésico";
      const actions = document.createElement("div");
      actions.className = "user-actions";
      const create = document.createElement("button");
      create.type = "button";
      create.className = "dash-solid";
      create.textContent = "Crear informe";
      create.addEventListener("click", () => openInforme(item));
      const button = document.createElement("button");
      button.type = "button";
      button.className = "dash-danger";
      button.textContent = "Quitar";
      button.addEventListener("click", async () => {
        const result = await KineDom.deleteInforme(item.id);
        if (!result.ok) {
          showStatus(result.error, true);
          return;
        }
        renderInformes();
        showStatus("Se quitó la solicitud de informe.");
      });
      actions.append(create);
      if (item.texto) {
        const download = document.createElement("button");
        download.type = "button";
        download.className = "dash-solid is-soft";
        download.textContent = "Descargar";
        download.addEventListener("click", () => downloadInforme(item));
        const gmail = document.createElement("button");
        gmail.type = "button";
        gmail.className = "dash-solid is-soft";
        gmail.textContent = "Enviar por Gmail";
        gmail.addEventListener("click", () => sendInformeGmail(item));
        actions.append(download, gmail);
      }
      actions.append(button);
      card.append(title, mail, when, note);
      if (item.texto) {
        const body = document.createElement("p");
        body.className = "informe-body";
        body.textContent = item.texto;
        const sign = document.createElement("div");
        sign.className = "informe-sign";
        const signName = document.createElement("p");
        signName.className = "informe-sign-name";
        signName.textContent = "Erick Barrios";
        const signRole = document.createElement("p");
        signRole.className = "informe-sign-role";
        signRole.textContent = "Kinesiólogo";
        sign.append(signName, signRole);
        card.append(body, sign);
      }
      card.append(actions);
      list.append(card);
    });
  }

  renderInformes();

  const informeModal = document.getElementById("informe-modal");
  const informeForm = document.getElementById("form-informe");
  const informeText = document.getElementById("informe-texto");
  const informePatient = document.getElementById("informe-patient");
  const informeAlert = document.getElementById("informe-alert");
  let editingInforme = null;
  let informeFocus = null;

  function downloadInforme(item) {
    KineDomPdf.download(item);
  }

  function sendInformeGmail(item) {
    const fileName = KineDomPdf.fileName(item.nombre);
    downloadInforme(item);
    const subject = `Informe kinésico de ${item.nombre}`;
    const body = `Te envío el informe kinésico de ${item.nombre}.\nAdjunta el PDF descargado: ${fileName}\n\nErick Barrios\nKinesiólogo`;
    const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(item.email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.append(link);
    link.click();
    link.remove();
  }

  function currentReport() {
    const texto = informeText.value.trim();
    if (!editingInforme || texto.length < 20) return null;
    return { nombre: editingInforme.nombre, email: editingInforme.email, texto };
  }

  function refreshReportActions() {
    document.getElementById("informe-share").hidden = !currentReport();
  }

  function informeContext(item) {
    const user = KineDom.listUsers().find((person) => person.email === item.email);
    const citas = KineDom.getReservas().filter((cita) => cita.email === item.email && cita.nombre);
    return { user, citas };
  }

  function draftInforme(item, answers) {
    const { user, citas } = informeContext(item);
    const edad = user && user.edad ? `${user.edad} años` : "edad no registrada en la ficha";
    const direccion = user && user.direccion ? user.direccion : "dirección no registrada en la ficha";
    const atenciones = citas.length
      ? citas
          .map((cita) => {
            const [year, month, day] = String(cita.fecha || "").split("-").map(Number);
            const dia = Number.isFinite(year)
              ? new Date(year, month - 1, day).toLocaleDateString("es-CL", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })
              : cita.fecha;
            return `${dia} a las ${cita.hora}, en modalidad ${cita.modalidad || "domicilio"}`;
          })
          .join(". ")
      : "No hay horas agendadas registradas para este paciente.";
    return [
      "Informe kinésico",
      "",
      `Paciente: ${item.nombre}`,
      `Edad: ${edad}`,
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

  function showInformeAlert(message) {
    informeAlert.hidden = !message;
    informeAlert.textContent = message || "";
    informeAlert.classList.toggle("is-error", Boolean(message));
  }

  function setInformeMode(mode) {
    const ai = mode === "ai";
    document.getElementById("informe-ai-panel").hidden = !ai;
    document.getElementById("informe-write-panel").hidden = ai;
    document.getElementById("informe-ai").classList.toggle("is-soft", !ai);
    document.getElementById("informe-write").classList.toggle("is-soft", ai);
    document.getElementById("informe-help").textContent = ai
      ? "Completa la información clínica y después pulsa Generar informe con la IA."
      : "Escribe el informe. La firma de Erick Barrios, kinesiólogo, queda al final.";
    showInformeAlert("");
    refreshReportActions();
  }

  function resetAiFields(item) {
    const { citas } = informeContext(item);
    const motivos = [...new Set(citas.map((cita) => cita.patologia).filter(Boolean))];
    document.getElementById("ai-motivo").value = motivos.join("; ");
    document.getElementById("ai-antecedentes").value = "";
    document.getElementById("ai-evaluacion").value = "";
    document.getElementById("ai-plan").value = "";
  }

  function aiAnswers() {
    const read = (id) => document.getElementById(id).value.trim().replace(/\s+/g, " ");
    return {
      motivo: read("ai-motivo"),
      antecedentes: read("ai-antecedentes"),
      evaluacion: read("ai-evaluacion"),
      plan: read("ai-plan"),
    };
  }

  function openInforme(item) {
    editingInforme = item;
    informeText.value = item.texto || "";
    informePatient.textContent = `${item.nombre} · ${item.email}`;
    resetAiFields(item);
    setInformeMode("write");
    informeFocus = document.activeElement;
    informeModal.hidden = false;
    document.body.classList.add("overflow-hidden");
    informeText.focus();
  }

  function closeInforme() {
    informeModal.hidden = true;
    document.body.classList.remove("overflow-hidden");
    editingInforme = null;
    if (informeFocus && typeof informeFocus.focus === "function") informeFocus.focus();
  }

  informeModal.querySelectorAll("[data-close-informe]").forEach((node) => {
    node.addEventListener("click", closeInforme);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !informeModal.hidden) closeInforme();
  });

  document.getElementById("informe-write").addEventListener("click", () => {
    setInformeMode("write");
    informeText.focus();
  });

  document.getElementById("informe-ai").addEventListener("click", () => {
    setInformeMode("ai");
    document.getElementById("ai-motivo").focus();
  });

  document.getElementById("informe-generate").addEventListener("click", () => {
    if (!editingInforme) return;
    const answers = aiAnswers();
    if (answers.motivo.length < 3) {
      showInformeAlert("Escribe el motivo de consulta.");
      return;
    }
    if (answers.antecedentes.length < 3) {
      showInformeAlert("Escribe los antecedentes relevantes.");
      return;
    }
    if (answers.evaluacion.length < 8) {
      showInformeAlert("Describe la evaluación: dolor, movilidad, fuerza o función.");
      return;
    }
    if (answers.plan.length < 8) {
      showInformeAlert("Escribe el plan y las indicaciones.");
      return;
    }
    if (informeText.value.trim() && !window.confirm("¿Reemplazar el informe actual por el texto generado?")) return;
    informeText.value = draftInforme(editingInforme, answers);
    setInformeMode("write");
    informeText.focus();
  });

  informeText.addEventListener("input", refreshReportActions);

  document.getElementById("informe-download").addEventListener("click", () => {
    const report = currentReport();
    if (!report) {
      showInformeAlert("Genera o escribe el informe antes de descargarlo.");
      return;
    }
    downloadInforme(report);
  });

  document.getElementById("informe-gmail").addEventListener("click", () => {
    const report = currentReport();
    if (!report) {
      showInformeAlert("Genera o escribe el informe antes de enviarlo.");
      return;
    }
    sendInformeGmail(report);
    showStatus("Se descargó el PDF y Gmail se abrió en otra pestaña. Adjunta ese archivo antes de enviar.");
  });

  informeForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!editingInforme) return;
    const result = await KineDom.saveInforme(editingInforme.id, informeText.value);
    if (!result.ok) {
      showInformeAlert(result.error);
      return;
    }
    closeInforme();
    renderInformes();
    showStatus("Informe guardado, con la firma de Erick Barrios, kinesiólogo.");
  });

  document.addEventListener("kinedom-sync", () => {
    renderInformes();
    renderCitas();
    renderUsers();
    if (!dirty) {
      schedule = KineDom.getSchedule();
      draft = cloneSlots(schedule.slots);
      renderHours();
    }
  });

  const SLOTS = ["18:00", "19:00"];
  const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const WEEK_NAMES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const MONTHS = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let viewYear = today.getFullYear();
  let viewMonth = today.getMonth();
  let selected = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  let schedule = KineDom.getSchedule();
  let draft = JSON.parse(JSON.stringify(schedule.slots || {}));
  let dirty = false;

  function cloneSlots(slots) {
    return JSON.parse(JSON.stringify(slots || {}));
  }

  function writeDraft(key, hours) {
    const kept = new Set(hours);
    bookedOn(key).forEach((hour) => kept.add(hour));
    const next = [...kept].sort();
    if (next.length) draft[key] = next;
    else delete draft[key];
    dirty = true;
  }

  function iso(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function bookedOn(date) {
    return KineDom.getReservas().filter((item) => item.fecha === date).map((item) => item.hora);
  }

  async function persist(message) {
    const result = await KineDom.saveSchedule(schedule);
    if (!result.ok) {
      showStatus(result.error, true);
      schedule = KineDom.getSchedule();
      renderHours();
      return;
    }
    dirty = false;
    showStatus(message);
    renderHours();
  }

  function renderHours() {
    const note = document.getElementById("hour-note");
    note.textContent = dirty
      ? "Hay cambios sin guardar. Pulsa Guardar para que los días y las horas se vean en el sitio."
      : "Marca 18:00 y 19:00 en los días que quieras y pulsa Guardar. En el sitio quedan en amarillo, con la palabra disponibilidad.";
    const root = document.getElementById("hour-editor");
    root.replaceChildren();
    const card = document.createElement("div");
    card.className = "cal-card";
    const head = document.createElement("div");
    head.className = "cal-head";
    const prev = document.createElement("button");
    prev.type = "button";
    prev.className = "cal-nav";
    prev.setAttribute("aria-label", "Mes anterior");
    prev.textContent = "‹";
    const next = document.createElement("button");
    next.type = "button";
    next.className = "cal-nav";
    next.setAttribute("aria-label", "Mes siguiente");
    next.textContent = "›";
    const title = document.createElement("h2");
    title.className = "cal-title";
    title.textContent = `${MONTHS[viewMonth]} ${viewYear}`;
    prev.addEventListener("click", () => {
      viewMonth -= 1;
      if (viewMonth < 0) {
        viewMonth = 11;
        viewYear -= 1;
      }
      renderHours();
    });
    next.addEventListener("click", () => {
      viewMonth += 1;
      if (viewMonth > 11) {
        viewMonth = 0;
        viewYear += 1;
      }
      renderHours();
    });
    head.append(prev, title, next);

    const grid = document.createElement("div");
    grid.className = "cal-grid";
    WEEKDAYS.forEach((label) => {
      const cell = document.createElement("div");
      cell.className = "cal-weekday";
      cell.textContent = label;
      grid.append(cell);
    });
    const first = new Date(viewYear, viewMonth, 1);
    let lead = first.getDay() - 1;
    if (lead < 0) lead = 6;
    const days = new Date(viewYear, viewMonth + 1, 0).getDate();
    for (let index = 0; index < lead; index += 1) {
      const empty = document.createElement("div");
      empty.className = "cal-empty";
      grid.append(empty);
    }
    for (let day = 1; day <= days; day += 1) {
      const date = new Date(viewYear, viewMonth, day);
      const key = iso(date);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "cal-day";
      button.textContent = String(day);
      if (date.getTime() === today.getTime()) button.classList.add("is-today");
      if (key === selected) button.classList.add("is-selected");
      if ((draft[key] || []).length) button.classList.add("has-slots");
      button.dataset.date = key;
      if (date < today) {
        button.disabled = true;
        button.classList.add("is-disabled");
      }
      button.addEventListener("click", () => {
        selected = key;
        renderHours();
      });
      grid.append(button);
    }

    const panel = document.createElement("div");
    panel.className = "cal-panel";
    const selectedDate = new Date(`${selected}T00:00:00`);
    const inMonth = selectedDate.getFullYear() === viewYear && selectedDate.getMonth() === viewMonth;
    if (!inMonth || selectedDate < today) {
      const hint = document.createElement("p");
      hint.className = "cal-hint";
      hint.textContent = "Elige un día de este mes, marca las horas y pulsa Guardar.";
      panel.append(hint);
    } else {
      const heading = document.createElement("h3");
      heading.className = "cal-panel-title";
      heading.textContent = new Intl.DateTimeFormat("es-CL", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(selectedDate);
      const reserved = bookedOn(selected);
      const chosen = new Set(draft[selected] || []);
      reserved.forEach((hour) => chosen.add(hour));
      const hoursForDay = SLOTS.concat(reserved.filter((hour) => !SLOTS.includes(hour)));
      const slots = document.createElement("div");
      slots.className = "hour-slots";
      hoursForDay.forEach((hour) => {
        const label = document.createElement("label");
        const input = document.createElement("input");
        input.type = "checkbox";
        input.value = hour;
        input.checked = chosen.has(hour);
        if (reserved.includes(hour)) {
          input.disabled = true;
          input.checked = true;
        }
        input.addEventListener("change", () => {
          writeDraft(selected, [...slots.querySelectorAll("input:checked")].map((item) => item.value));
          const dayButton = root.querySelector(`[data-date="${selected}"]`);
          if (dayButton) dayButton.classList.toggle("has-slots", Boolean((draft[selected] || []).length));
          note.textContent = "Hay cambios sin guardar. Pulsa Guardar para que los días y las horas se vean en el sitio.";
        });
        label.append(
          input,
          document.createTextNode(reserved.includes(hour) ? `${hour} reservada` : `${hour} · Disponibilidad`)
        );
        slots.append(label);
      });
      const actions = document.createElement("div");
      actions.className = "dash-actions";
      const saveDay = document.createElement("button");
      saveDay.type = "button";
      saveDay.className = "inline-flex rounded-full bg-terracotta-deep px-5 py-3 text-sm font-semibold text-white";
      saveDay.textContent = "Guardar";
      saveDay.addEventListener("click", () => {
        schedule.slots = cloneSlots(draft);
        schedule.published = true;
        persist("Cambios guardados. Las horas ya se ven en el calendario del sitio.");
      });
      const copy = document.createElement("button");
      copy.type = "button";
      copy.className = "inline-flex rounded-full border border-line bg-white px-5 py-3 text-sm font-semibold";
      copy.textContent = `Copiar a cada ${WEEK_NAMES[selectedDate.getDay()]} del mes`;
      copy.addEventListener("click", () => {
        const hours = [...slots.querySelectorAll("input:checked")].map((input) => input.value);
        const total = new Date(viewYear, viewMonth + 1, 0).getDate();
        for (let day = 1; day <= total; day += 1) {
          const date = new Date(viewYear, viewMonth, day);
          if (date < today || date.getDay() !== selectedDate.getDay()) continue;
          writeDraft(iso(date), hours);
        }
        renderHours();
        showStatus(`Esas horas quedaron en cada ${WEEK_NAMES[selectedDate.getDay()]} de este mes. Pulsa Guardar para publicarlas.`);
      });
      const clear = document.createElement("button");
      clear.type = "button";
      clear.className = "dash-danger";
      clear.textContent = "Quitar horas de este día";
      clear.addEventListener("click", () => {
        writeDraft(selected, []);
        renderHours();
        showStatus("Este día quedó sin horas. Pulsa Guardar para aplicar el cambio en el sitio.");
      });
      actions.append(saveDay, copy, clear);
      panel.append(heading, slots, actions);
      const dayBookings = KineDom.getReservas().filter((item) => item.fecha === selected);
      if (dayBookings.length) {
        const list = document.createElement("div");
        list.className = "mt-4 space-y-2";
        dayBookings.forEach((item) => {
          const person = KineDom.listUsers().find((user) => user.email === item.email);
          const row = document.createElement("p");
          row.className = "text-sm text-bark";
          row.textContent = `${item.hora} · ${item.modalidad} · ${person ? person.nombre : item.email}`;
          list.append(row);
        });
        panel.append(list);
      }
    }

    const sample = document.createElement("button");
    sample.type = "button";
    sample.className = "mt-4 text-sm font-semibold text-terracotta-deep";
    sample.textContent = "Dejar de publicar las horas en el sitio";
    sample.addEventListener("click", () => {
      schedule.slots = cloneSlots(draft);
      schedule.published = false;
      persist("Las horas dejaron de mostrarse en el sitio.");
    });
    card.append(head, grid, panel, sample);
    root.append(card);
  }

  renderHours();

  const accountForm = document.getElementById("account-form");
  const nameInput = document.getElementById("admin-name");
  nameInput.value = KineDom.currentAdmin().name;
  accountForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const result = await KineDom.updateAdminName(nameInput.value);
    if (!result.ok) {
      showStatus(result.error, true);
      return;
    }
    paintWelcome();
    showStatus(`Nombre actualizado. El acceso dirá: Bienvenido, ${result.name}`);
  });
  }).catch(() => {
    gate.hidden = false;
  });
})();
