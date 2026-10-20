(function () {
  document.querySelectorAll("[data-year]").forEach((node) => {
    node.textContent = String(new Date().getFullYear());
  });

  const header = document.querySelector("[data-header]");
  const onScroll = () => {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 8);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const toggle = document.getElementById("menu-toggle");
  const menu = document.getElementById("mobile-menu");

  function setMenu(open) {
    if (!menu || !toggle) return;
    menu.classList.toggle("hidden", !open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
    document.body.classList.toggle("overflow-hidden", open);
    toggle.querySelector(".icon-open")?.classList.toggle("hidden", open);
    toggle.querySelector(".icon-close")?.classList.toggle("hidden", !open);
    if (open) menu.querySelector("a:not([hidden])")?.focus();
  }

  toggle?.addEventListener("click", () => {
    setMenu(toggle.getAttribute("aria-expanded") !== "true");
  });
  menu?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setMenu(false));
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setMenu(false);
  });
  window.addEventListener("resize", () => {
    if (window.innerWidth >= 1024) setMenu(false);
  });

  const slides = document.querySelectorAll(".hero-slide");
  const dots = document.querySelectorAll(".hero-dot");
  const caption = document.getElementById("hero-caption");
  const hero = document.getElementById("inicio");
  if (slides.length) {
    let index = 0;
    let timer = 0;
    let fadeToken = 0;
    let started = false;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function show(nextIndex) {
      index = (nextIndex + slides.length) % slides.length;
      slides.forEach((slide, position) => {
        slide.classList.toggle("is-active", position === index);
      });
      dots.forEach((dot, position) => {
        const active = position === index;
        dot.classList.toggle("is-active", active);
        if (active) dot.setAttribute("aria-current", "true");
        else dot.removeAttribute("aria-current");
      });
      if (!caption) return;
      const nextCaption = slides[index].dataset.caption || "";
      if (!started || caption.textContent === nextCaption) {
        started = true;
        caption.textContent = nextCaption;
        return;
      }
      const token = ++fadeToken;
      caption.classList.add("is-fading");
      window.setTimeout(() => {
        if (token !== fadeToken) return;
        caption.textContent = nextCaption;
        caption.classList.remove("is-fading");
      }, reduce ? 0 : 180);
    }

    function play() {
      stop();
      if (reduce) return;
      timer = window.setInterval(() => show(index + 1), 6500);
    }

    function stop() {
      window.clearInterval(timer);
    }

    document.getElementById("hero-next")?.addEventListener("click", () => {
      show(index + 1);
      play();
    });
    document.getElementById("hero-prev")?.addEventListener("click", () => {
      show(index - 1);
      play();
    });
    dots.forEach((dot, position) => {
      dot.addEventListener("click", () => {
        show(position);
        play();
      });
    });
    hero?.addEventListener("mouseenter", stop);
    hero?.addEventListener("mouseleave", play);
    hero?.addEventListener("focusin", stop);
    hero?.addEventListener("focusout", play);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stop();
      else play();
    });
    show(0);
    play();
  }

  const reveals = document.querySelectorAll(".reveal");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion || !("IntersectionObserver" in window)) {
    reveals.forEach((item) => item.classList.add("is-visible"));
  } else {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.16 }
    );
    reveals.forEach((item) => observer.observe(item));
  }

  const sections = ["inicio", "sobre-mi", "servicios", "horas"]
    .map((id) => document.getElementById(id))
    .filter(Boolean);
  if (sections.length && "IntersectionObserver" in window) {
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          document.querySelectorAll("[data-nav]").forEach((link) => {
            link.classList.toggle("is-active", link.dataset.nav === entry.target.id);
          });
        });
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );
    sections.forEach((section) => spy.observe(section));
  }

  function paintSession() {
    if (!window.KineDom) return;
    const session = KineDom.getSession();
    document.querySelectorAll(".session-chip").forEach((chip) => {
      if (!session) {
        chip.hidden = true;
        return;
      }
      chip.textContent = session.role === "admin" ? "Panel" : "Mi panel";
      chip.href = session.role === "admin" ? "admin.html" : "paciente.html";
      chip.hidden = false;
    });
  }

  document.addEventListener("kinedom-session", paintSession);
  if (window.KineDom && KineDom.ready) KineDom.ready.then(paintSession);
  else paintSession();
})();
