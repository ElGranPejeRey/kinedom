(function () {
  if (!window.KineDom) return;

  document.querySelectorAll("[data-toggle-password]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.getAttribute("data-toggle-password");
      const scope = button.closest("form") || document;
      const input = scope.querySelector(`[id="${id}"]`);
      if (!input) return;
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      button.setAttribute("aria-label", show ? "Ocultar contraseña" : "Mostrar contraseña");
      const open = button.querySelector("[data-eye-open]");
      const shut = button.querySelector("[data-eye-shut]");
      if (open && shut) {
        open.hidden = !show;
        shut.hidden = show;
      } else {
        button.textContent = show ? "Ocultar" : "Ver";
      }
    });
  });

  document.querySelectorAll("[data-open-date]").forEach((button) => {
    button.addEventListener("click", () => {
      const input = document.getElementById(button.getAttribute("data-open-date"));
      if (!input) return;
      input.focus();
      if (typeof input.showPicker === "function") {
        try {
          input.showPicker();
        } catch (error) {
          input.focus();
        }
      }
    });
  });

  document.querySelectorAll("[data-digits]").forEach((input) => {
    input.addEventListener("input", () => {
      input.value = input.value.replace(/\D/g, "").slice(0, 12);
    });
  });

  function setControlError(input, message) {
    if (!input) return !message;
    input.setAttribute("aria-invalid", message ? "true" : "false");
    const slot = input.form?.querySelector(`[data-error-for="${input.id}"]`);
    if (slot) slot.textContent = message || "";
    return !message;
  }

  function setFieldError(id, message, root) {
    const scope = root || document;
    const input = scope.querySelector(`[id="${id}"]`);
    const slot = scope.querySelector(`[data-error-for="${id}"]`);
    if (input) input.setAttribute("aria-invalid", message ? "true" : "false");
    if (slot) slot.textContent = message || "";
    return !message;
  }

  function clearErrors(ids) {
    ids.forEach((id) => setFieldError(id, ""));
  }

  function params() {
    return new URLSearchParams(window.location.search);
  }

  function parseDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return null;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }
    return date;
  }

  function bookingFromQuery() {
    const query = params();
    const fecha = query.get("fecha");
    const hora = query.get("hora");
    const modalidad = query.get("modalidad") === "Telemedicina" ? "Telemedicina" : "Domicilio";
    if (!parseDate(fecha) || !/^\d{2}:\d{2}$/.test(hora || "")) return null;
    return { fecha, hora, modalidad };
  }

  function formatBooking(booking) {
    const date = parseDate(booking.fecha);
    const label = new Intl.DateTimeFormat("es-CL", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(date);
    return `${label} a las ${booking.hora}, modalidad ${booking.modalidad}`;
  }

  function validPassword(value) {
    return typeof value === "string" && value.length >= 8;
  }

  function birthIso(value) {
    const match = String(value || "").trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return "";
    const iso = `${match[3]}-${match[2]}-${match[1]}`;
    return parseDate(iso) ? iso : "";
  }

  function ageFromBirth(value) {
    const raw = String(value || "").trim();
    const iso = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? (parseDate(raw) ? raw : "") : birthIso(raw);
    const date = parseDate(iso);
    if (!date) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date > today) return null;
    let age = today.getFullYear() - date.getFullYear();
    const month = today.getMonth() - date.getMonth();
    if (month < 0 || (month === 0 && today.getDate() < date.getDate())) age -= 1;
    if (age < 0 || age > 120) return null;
    return age;
  }

  function composeDireccion(parts) {
    const calle = parts.calle.replace(/\s+/g, " ").trim();
    const numero = parts.numero.replace(/\s+/g, " ").trim();
    const comuna = parts.comuna.replace(/\s+/g, " ").trim();
    const torre = parts.torre.replace(/\s+/g, " ").trim();
    if (parts.tipo === "departamento") {
      return [calle, numero ? `depto ${numero}` : "", torre, comuna].filter(Boolean).join(", ");
    }
    return [calle && numero ? `${calle} ${numero}` : calle || numero, comuna].filter(Boolean).join(", ");
  }

  const registerForm = document.getElementById("form-registro");
  if (registerForm) {
    const banner = document.getElementById("reserva-banner");
    const booking = bookingFromQuery();
    if (banner && booking) {
      banner.hidden = false;
      banner.textContent = `Estás apartando el ${formatBooking(booking)}. Crea tu cuenta para guardarla.`;
    }
    const loginLink = document.getElementById("link-login");
    if (loginLink && booking) {
      loginLink.href = `login.html?${params().toString()}`;
    }

    const sessionNote = document.getElementById("sesion-nota");
    function paintRegisterSession() {
      const session = KineDom.getSession();
      if (!sessionNote) return;
      sessionNote.hidden = !session;
      if (session) {
        sessionNote.textContent = `Hay una sesión abierta como ${session.name}. Si creas otra cuenta, entrarás con la nueva.`;
      }
    }
    document.addEventListener("kinedom-session", paintRegisterSession);
    KineDom.ready.then(paintRegisterSession);

    const vivienda = document.getElementById("tipo-vivienda");
    const torreWrap = document.getElementById("torre-wrap");
    const numeroLabel = document.getElementById("numero-label");
    const numeroInput = document.getElementById("numero");
    const torreInput = document.getElementById("torre");
    const nacimiento = document.getElementById("nacimiento");
    const edadNote = document.getElementById("edad-calculada");

    function syncVivienda() {
      const depto = !vivienda || vivienda.value !== "casa";
      if (torreWrap) torreWrap.hidden = !depto;
      if (numeroLabel) numeroLabel.textContent = depto ? "Número de departamento" : "Número de casa";
      if (numeroInput) numeroInput.placeholder = depto ? "Ej: 101" : "Ej: 1234";
      if (torreInput) {
        torreInput.required = depto;
        if (!depto) {
          torreInput.value = "";
          setFieldError("torre", "");
        }
      }
    }

    function paintAge() {
      if (!edadNote || !nacimiento) return;
      const age = ageFromBirth(nacimiento.value);
      edadNote.hidden = age == null;
      edadNote.textContent = age == null ? "" : `Edad calculada: ${age} ${age === 1 ? "año" : "años"}.`;
    }

    if (nacimiento) {
      const picker = document.getElementById("nacimiento-picker");
      const today = new Date();
      const min = new Date(today.getFullYear() - 120, today.getMonth(), today.getDate());
      const iso = (date) => {
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${date.getFullYear()}-${month}-${day}`;
      };
      if (picker) {
        picker.max = iso(today);
        picker.min = iso(min);
        picker.addEventListener("change", () => {
          if (!parseDate(picker.value)) return;
          const [year, month, day] = picker.value.split("-");
          nacimiento.value = `${day}/${month}/${year}`;
          paintAge();
        });
      }
      nacimiento.addEventListener("input", () => {
        const digits = nacimiento.value.replace(/\D/g, "").slice(0, 8);
        if (digits.length > 4) nacimiento.value = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
        else if (digits.length > 2) nacimiento.value = `${digits.slice(0, 2)}/${digits.slice(2)}`;
        else nacimiento.value = digits;
        paintAge();
      });
    }
    if (vivienda) vivienda.addEventListener("change", syncVivienda);
    syncVivienda();

    registerForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const alert = document.getElementById("form-alert");
      alert.hidden = true;
      const ids = ["nombre", "nacimiento", "tipo-vivienda", "direccion", "numero", "comuna", "torre", "codigo", "celular", "email", "password"];
      clearErrors(ids);

      const nombre = registerForm.nombre.value.trim().replace(/\s+/g, " ");
      const fechaNacimiento = birthIso(nacimiento ? nacimiento.value : "");
      const born = parseDate(fechaNacimiento);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const edad = ageFromBirth(nacimiento ? nacimiento.value : "");
      const tipoVivienda = vivienda && vivienda.value === "casa" ? "casa" : "departamento";
      const calle = registerForm.direccion.value.trim().replace(/\s+/g, " ");
      const numero = registerForm.numero.value.trim().replace(/\s+/g, " ");
      const comuna = registerForm.comuna.value.trim().replace(/\s+/g, " ");
      const torre = tipoVivienda === "departamento" ? registerForm.torre.value.trim().replace(/\s+/g, " ") : "";
      const codigo = registerForm.codigo.value;
      const celular = registerForm.celular.value.replace(/\D/g, "");
      const email = registerForm.email.value.trim();
      const password = registerForm.password.value;
      const direccion = composeDireccion({ tipo: tipoVivienda, calle, numero, comuna, torre });
      let valid = true;

      if (!/^[\p{L}\s'.-]{3,80}$/u.test(nombre)) {
        valid = setFieldError("nombre", "Escribe tu nombre completo.") && valid;
      }
      if (!born) {
        valid = setFieldError("nacimiento", "Indica tu fecha de nacimiento.") && valid;
      } else if (born > today) {
        valid = setFieldError("nacimiento", "La fecha de nacimiento no puede ser futura.") && valid;
      } else if (edad == null) {
        valid = setFieldError("nacimiento", "Revisa la fecha de nacimiento.") && valid;
      }
      if (calle.length < 3) {
        valid = setFieldError("direccion", "Escribe la calle o avenida.") && valid;
      }
      if (!/^[\p{L}\d\s./-]{1,20}$/u.test(numero)) {
        valid = setFieldError("numero", tipoVivienda === "casa" ? "Escribe el número de la casa." : "Escribe el número de departamento.") && valid;
      }
      if (!/^[\p{L}\s'.-]{2,60}$/u.test(comuna)) {
        valid = setFieldError("comuna", "Escribe la comuna.") && valid;
      }
      if (tipoVivienda === "departamento" && !/^[\p{L}\d\s./-]{1,40}$/u.test(torre)) {
        valid = setFieldError("torre", "Escribe la torre.") && valid;
      }
      if (!codigo) valid = setFieldError("codigo", "Elige el código de área.") && valid;
      if (!/^\d{8,12}$/.test(celular)) {
        valid = setFieldError("celular", "Escribe un celular de 8 a 12 números.") && valid;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email)) {
        valid = setFieldError("email", "Escribe un correo válido.") && valid;
      }
      if (!validPassword(password)) {
        valid = setFieldError("password", "La contraseña debe tener al menos 8 caracteres.") && valid;
      }
      if (!valid) return;

      const result = await KineDom.register({
        nombre,
        edad,
        fechaNacimiento,
        tipoVivienda,
        direccion,
        calle,
        numero,
        comuna,
        torre,
        codigo,
        celular,
        email,
        password,
      });
      if (!result.ok) {
        alert.hidden = false;
        alert.className = "form-alert is-error";
        alert.textContent = result.error;
        return;
      }

      let reservaText = "";
      if (booking) {
        const reserva = await KineDom.addReserva({ ...booking, email: result.user.email, nombre, edad, direccion });
        reservaText = reserva.ok
          ? ` También apartamos el ${formatBooking(booking)}.`
          : ` La cuenta quedó creada, pero esa hora ya no está libre.`;
      }

      registerForm.hidden = true;
      if (banner) banner.hidden = true;
      const success = document.getElementById("registro-ok");
      success.hidden = false;
      document.getElementById("registro-ok-text").textContent =
        `Listo, ${result.user.nombre.split(" ")[0]}. Tu cuenta quedó guardada y ya puedes entrar a tu panel.${reservaText}`;
    });
  }

  const loginForm = document.getElementById("form-login");
  if (loginForm) {
    const sessionPanel = document.getElementById("session-panel");
    const loginPanel = document.getElementById("login-panel");
    let role = "patient";

    function notifySession() {
      document.dispatchEvent(new Event("kinedom-session"));
    }

    function showSession(session) {
      loginPanel.hidden = true;
      sessionPanel.hidden = false;
      const isAdmin = session.role === "admin";
      document.getElementById("session-title").textContent = `Bienvenido, ${session.name}`;
      document.getElementById("session-text").textContent = isAdmin
        ? "Puedes gestionar el contenido, las horas y las personas registradas desde tu panel."
        : "Puedes agendar una hora o solicitar un informe kinésico desde tu panel.";
      document.querySelectorAll("[data-admin-link]").forEach((link) => {
        link.hidden = !isAdmin;
      });
      document.querySelectorAll("[data-patient-link]").forEach((link) => {
        link.hidden = isAdmin;
      });
      notifySession();
    }

    KineDom.ready.then(() => {
      const open = KineDom.getSession();
      if (open) showSession(open);
    });

    const loginScope = loginForm.closest("#login-panel") || document;

    document.querySelectorAll("[data-role]").forEach((button) => {
      button.addEventListener("click", () => {
        role = button.dataset.role;
        document.querySelectorAll("[data-role]").forEach((item) => {
          const active = item === button;
          item.classList.toggle("is-active", active);
          item.setAttribute("aria-selected", active ? "true" : "false");
        });
        const help = loginScope.querySelector("#admin-help");
        if (help) help.hidden = role !== "admin";
        if (loginForm.email) loginForm.email.autocomplete = role === "admin" ? "username" : "email";
      });
    });

    document.getElementById("logout-btn")?.addEventListener("click", async () => {
      await KineDom.logout();
      sessionPanel.hidden = true;
      loginPanel.hidden = false;
      notifySession();
    });
    document.getElementById("switch-account")?.addEventListener("click", async () => {
      await KineDom.logout();
      sessionPanel.hidden = true;
      loginPanel.hidden = false;
      notifySession();
    });

    const booking = bookingFromQuery();
    const loginBanner = document.getElementById("login-banner");
    if (loginBanner && booking) {
      loginBanner.hidden = false;
      loginBanner.textContent = `Después de entrar guardaremos el ${formatBooking(booking)}.`;
    }

    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const alert = loginScope.querySelector("#form-alert");
      alert.hidden = true;
      const email = loginForm.email.value.trim();
      const password = loginForm.password.value;
      let valid = true;
      valid = setControlError(loginForm.email, /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email) ? "" : "Escribe un correo válido.") && valid;
      valid = setControlError(loginForm.password, password ? "" : "Escribe tu contraseña.") && valid;
      if (!valid) return;

      const result = await KineDom.login(email, password, role, loginForm.recordarme.checked);
      if (!result.ok) {
        alert.hidden = false;
        alert.className = "form-alert is-error";
        alert.textContent = result.error;
        return;
      }

      if (booking && result.session.role === "patient") {
        const reserva = await KineDom.addReserva({ ...booking, email: result.session.email });
        const note = document.getElementById("session-text");
        showSession(result.session);
        note.textContent = reserva.ok
          ? `Guardamos el ${formatBooking(booking)}.`
          : "Entraste correctamente. Esa hora ya no está libre.";
        return;
      }
      showSession(result.session);
    });
  }

  const resetForm = document.getElementById("form-restablecer");
  if (resetForm) {
    const stepTwo = document.getElementById("reset-step-two");
    resetForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const alert = document.getElementById("reset-alert");
      alert.hidden = true;
      setFieldError("reset-email", "");
      const email = resetForm.email.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email)) {
        setFieldError("reset-email", "Escribe un correo válido.");
        return;
      }
      const submit = document.getElementById("reset-submit");
      submit.disabled = true;
      const result = await KineDom.requestPasswordReset(email);
      submit.disabled = false;
      if (!result.ok) {
        alert.hidden = false;
        alert.className = "form-alert is-error";
        alert.textContent = result.error;
        return;
      }
      resetForm.hidden = true;
      if (stepTwo) stepTwo.hidden = true;
      const done = document.getElementById("reset-ok");
      done.hidden = false;
    });
  }

  const newPasswordForm = document.getElementById("form-nueva-clave");
  if (newPasswordForm) {
    const alert = document.getElementById("nueva-alert");
    KineDom.ready.then(() => {
      if (!KineDom.getSession()) {
        alert.hidden = false;
        alert.className = "form-alert is-error";
        alert.textContent = "El enlace no es válido o ya venció. Pide otro desde recuperar acceso.";
        newPasswordForm.hidden = true;
      }
    });
    newPasswordForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      alert.hidden = true;
      setFieldError("nueva-password", "");
      setFieldError("nueva-password2", "");
      const password = newPasswordForm.password.value;
      const password2 = newPasswordForm.password2.value;
      let valid = true;
      if (!validPassword(password)) {
        valid = setFieldError("nueva-password", "La contraseña debe tener al menos 8 caracteres.") && valid;
      }
      if (password !== password2) {
        valid = setFieldError("nueva-password2", "Las contraseñas no coinciden.") && valid;
      }
      if (!valid) return;
      const result = await KineDom.updatePassword(password);
      if (!result.ok) {
        alert.hidden = false;
        alert.className = "form-alert is-error";
        alert.textContent = result.error;
        return;
      }
      newPasswordForm.hidden = true;
      document.getElementById("nueva-ok").hidden = false;
    });
  }

  const emailForm = document.getElementById("form-correo");
  if (emailForm) {
    emailForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      ["correo-nombre", "correo-codigo", "correo-celular"].forEach((id) => setFieldError(id, ""));
      const resultBox = document.getElementById("correo-result");
      resultBox.hidden = true;
      resultBox.replaceChildren();
      const nombre = emailForm.nombre.value.trim();
      const codigo = emailForm.codigo.value;
      const celular = emailForm.celular.value.replace(/\D/g, "");
      let valid = true;
      if (nombre.length < 3) valid = setFieldError("correo-nombre", "Escribe el nombre de la cuenta.") && valid;
      if (!codigo) valid = setFieldError("correo-codigo", "Elige el código de área.") && valid;
      if (!/^\d{8,12}$/.test(celular)) {
        valid = setFieldError("correo-celular", "Escribe el celular con el que te registraste.") && valid;
      }
      if (!valid) return;
      const emails = await KineDom.findEmails(nombre, codigo, celular);
      resultBox.hidden = false;
      if (!emails.length) {
        resultBox.className = "form-alert is-error";
        resultBox.textContent =
          "No encontramos una cuenta con esos datos. El nombre tiene que coincidir con el del registro.";
        return;
      }
      resultBox.className = "form-alert is-ok";
      const text = document.createElement("p");
      text.textContent =
        emails.length === 1
          ? `Encontramos este correo: ${KineDom.maskEmail(emails[0])}`
          : `Encontramos estos correos: ${emails.map((item) => KineDom.maskEmail(item)).join(", ")}`;
      const link = document.createElement("a");
      link.href = "login.html";
      link.className = "text-link";
      link.textContent = "Ir al login";
      resultBox.append(text, link);
    });
  }
})();
