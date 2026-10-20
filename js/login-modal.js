(function () {
  if (document.getElementById("form-login")) return;

  const modal = document.createElement("div");
  modal.id = "login-modal";
  modal.className = "login-modal";
  modal.hidden = true;
  modal.innerHTML = `
    <div class="login-modal-backdrop" data-close-login></div>
    <div class="login-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="login-modal-title">
      <button class="login-modal-close" type="button" data-close-login aria-label="Cerrar">×</button>
      <div id="session-panel" hidden>
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-terracotta-deep">Sesión</p>
        <h2 id="session-title" class="mt-2 pr-10 font-serif text-3xl font-medium"></h2>
        <p id="session-text" class="mt-3 text-sm leading-relaxed text-muted"></p>
        <div class="mt-6 flex flex-wrap gap-3">
          <a href="admin.html" data-admin-link hidden class="inline-flex rounded-full bg-terracotta-deep px-5 py-3 text-sm font-semibold text-white">Ir al panel</a>
          <a href="paciente.html" data-patient-link class="inline-flex rounded-full bg-terracotta-deep px-5 py-3 text-sm font-semibold text-white">Ir a mi panel</a>
          <button id="logout-btn" class="inline-flex rounded-full border border-line px-5 py-3 text-sm font-semibold" type="button">Cerrar sesión</button>
        </div>
        <button id="switch-account" class="mt-5 text-sm font-semibold text-terracotta-deep" type="button">Entrar con otra cuenta</button>
      </div>
      <div id="login-panel">
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-terracotta-deep">Login</p>
        <h2 id="login-modal-title" class="mt-2 pr-10 font-serif text-3xl font-medium">Ingresar</h2>
        <p class="mt-3 text-sm leading-relaxed text-muted">Usa tu cuenta de paciente o el acceso de administrador.</p>
        <div class="role-switch mt-6" role="tablist" aria-label="Tipo de acceso">
          <button type="button" data-role="patient" class="is-active" role="tab" aria-selected="true">Paciente</button>
          <button type="button" data-role="admin" role="tab" aria-selected="false">Administrador</button>
        </div>
        <div id="admin-help" hidden>
          <p class="demo-box">Entra con el correo y la contraseña del administrador.</p>
        </div>
        <p id="login-banner" class="mt-4 rounded-2xl bg-sand px-4 py-3 text-sm text-bark" hidden></p>
        <p id="form-alert" class="form-alert mt-4" hidden></p>
        <form id="form-login" class="mt-6 space-y-4" novalidate>
          <div>
            <label for="login-email" class="mb-1.5 block text-sm font-medium text-bark">Correo electrónico</label>
            <input id="login-email" name="email" class="field" type="email" inputmode="email" autocomplete="username" autocapitalize="none" spellcheck="false" required>
            <p class="field-error" data-error-for="login-email"></p>
          </div>
          <div>
            <label for="login-password" class="mb-1.5 block text-sm font-medium text-bark">Contraseña</label>
            <div class="field-wrap">
              <input id="login-password" name="password" class="field has-toggle" type="password" autocomplete="current-password" required>
              <button class="ghost-btn" type="button" data-toggle-password="login-password" aria-label="Mostrar contraseña">Ver</button>
            </div>
            <p class="field-error" data-error-for="login-password"></p>
          </div>
          <label class="flex items-center gap-2 text-sm text-bark">
            <input id="login-recordarme" name="recordarme" type="checkbox" class="h-4 w-4 accent-[#9C4E24]">
            Recordarme en este equipo
          </label>
          <button class="inline-flex w-full items-center justify-center rounded-full bg-terracotta-deep px-6 py-3 text-sm font-semibold text-white transition hover:bg-ink" type="submit">Entrar</button>
        </form>
        <div class="mt-6 flex flex-col gap-2 text-sm">
          <a class="font-semibold text-terracotta-deep" href="recuperar.html#restablecer">¿Olvidaste tu contraseña?</a>
          <a class="font-semibold text-terracotta-deep" href="recuperar.html#correo">¿No recuerdas tu correo?</a>
        </div>
        <p class="mt-6 text-sm text-muted">¿Aún no tienes cuenta? <a class="font-semibold text-terracotta-deep" href="registro.html">Regístrate</a></p>
      </div>
    </div>
  `;
  document.body.append(modal);

  const dialog = modal.querySelector(".login-modal-dialog");
  let lastFocus = null;

  function openLogin() {
    lastFocus = document.activeElement;
    modal.hidden = false;
    document.body.classList.add("overflow-hidden");
    const sessionPanel = document.getElementById("session-panel");
      const focusTarget = sessionPanel && !sessionPanel.hidden
      ? sessionPanel.querySelector("button, a")
      : document.getElementById("login-email") || document.getElementById("email");
    focusTarget?.focus();
  }

  function closeLogin() {
    modal.hidden = true;
    const menu = document.getElementById("mobile-menu");
    if (!menu || menu.classList.contains("hidden")) {
      document.body.classList.remove("overflow-hidden");
    }
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
  }

  function isLoginLink(anchor) {
    try {
      const url = new URL(anchor.getAttribute("href"), window.location.href);
      return /(^|\/)login\.html$/.test(url.pathname);
    } catch (error) {
      return false;
    }
  }

  document.addEventListener("click", (event) => {
    const closer = event.target.closest("[data-close-login]");
    if (closer && modal.contains(closer)) {
      event.preventDefault();
      closeLogin();
      return;
    }
    const link = event.target.closest("a");
    if (!link || !isLoginLink(link)) return;
    event.preventDefault();
    openLogin();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) closeLogin();
  });

  dialog.addEventListener("keydown", (event) => {
    if (event.key !== "Tab" || modal.hidden) return;
    const items = [...dialog.querySelectorAll("a, button, input, select, textarea, summary")].filter(
      (item) => !item.closest("[hidden]") && !item.disabled
    );
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
})();
