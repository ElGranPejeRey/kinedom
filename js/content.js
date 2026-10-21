var KineDomContent = (() => {
  const defaults = {
    seo: {
      title: "Kinesiología a domicilio y telemedicina | KineDom",
      description:
        "Kinesiología a domicilio y por telemedicina en Chile con Erick Barrios. Agenda rehabilitación, dolor y movilidad. Horas en línea en KineDom.",
    },
    hero: {
      eyebrow: "Erick Barrios, kinesiólogo",
      title: "Kinesiología a domicilio y telemedicina",
      lead: "Recupera tu movimiento en casa o en línea, con un plan claro y horarios que puedes revisar desde aquí.",
      ctaHours: "Ver horas disponibles",
      ctaServices: "Mis servicios",
      chip1: "Domicilio",
      chip2: "Telemedicina",
      chip3: "Lunes a sábado",
      caption1: "Sesiones en un espacio tranquilo, pensadas para tu recuperación.",
      alt1: "Sesión de kinesiología en una sala de atención cálida",
      image1: "",
      caption2: "Terapia manual para recuperar movilidad con calma y precisión.",
      alt2: "Terapia manual durante una sesión de rehabilitación",
      image2: "",
      caption3: "Telemedicina para seguir tu plan cuando no puedes trasladarte.",
      alt3: "Computador listo para una atención de salud a distancia",
      image3: "",
    },
    about: {
      caption: "Evaluación cervical en sesión.",
      alt: "Evaluación cervical durante una sesión de kinesiología",
      image: "",
      eyebrow: "Sobre mí",
      title: "Kinesiología con tiempo y claridad",
      p1: "Soy Erick Barrios, kinesiólogo, y en KineDom acompaño tu recuperación con sesiones pensadas para tu rutina, tu espacio y tu ritmo.",
      p2: "Puedes atenderte en domicilio o por telemedicina. En ambos casos empezamos con una evaluación, definimos objetivos concretos y ajustamos el plan según cómo respondes.",
      p3: "Entre una sesión y la siguiente sabes qué trabajar, cómo hacerlo y qué señal conviene observar.",
      point1Title: "En tu domicilio",
      point1Text: "La evaluación y el tratamiento ocurren en tu casa.",
      point2Title: "Por videollamada",
      point2Text: "Revisamos ejercicios, dolor y avances sin que tengas que trasladarte.",
      point3Title: "Con continuidad",
      point3Text: "Cada hora retoma lo anterior y deja una tarea clara.",
    },
    services: {
      eyebrow: "Mis servicios",
      title: "Una atención, dos formas de encontrarnos",
      intro:
        "El plan se arma según tu lesión, tu energía y lo que necesitas volver a hacer. Puedes combinar visitas en casa con sesiones en línea.",
      step1Title: "Escuchamos",
      step1Text: "Partimos por tu motivo de consulta y tu día a día.",
      step2Title: "Evaluamos",
      step2Text: "Miramos movimiento, dolor y el objetivo que quieres lograr.",
      step3Title: "Tratamos",
      step3Text: "La sesión puede ser en tu domicilio o por telemedicina.",
      step4Title: "Ajustamos",
      step4Text: "Cada encuentro revisa el avance y actualiza el plan.",
      card1Title: "Atención domiciliaria",
      card1Text: "Evaluación y tratamiento en tu hogar, con el tiempo y el entorno que tu recuperación necesita.",
      card2Title: "Telemedicina",
      card2Text: "Sesiones por videollamada para revisar ejercicios, dolor y avances cuando no puedes trasladarte.",
      card3Title: "Rehabilitación",
      card3Text: "Acompañamiento en lesiones, dolor musculoesquelético y procesos después de una cirugía.",
      card4Title: "Kinesiología respiratoria",
      card4Text: "Técnicas para ventilar mejor, mover secreciones y recuperar tolerancia al esfuerzo.",
      card5Title: "Reintegro deportivo",
      card5Text: "Trabajo progresivo para volver a entrenar con más control y menos riesgo de recaída.",
      card6Title: "Movilidad y adulto mayor",
      card6Text: "Equilibrio, marcha y fuerza para las actividades que sostienen tu autonomía.",
    },
    agenda: {
      eyebrow: "Agenda",
      title: "Reserva tu atención",
      intro: "Selecciona fecha, modalidad y horario.",
      asideTitle: "Cómo reservar",
      step1: "Toca un día amarillo. Ese día tiene una hora libre.",
      step2: "Elige a domicilio o videoconsulta, y después la hora.",
      step3: "Revisa el resumen y continúa con la reserva.",
      note: "La hora amarilla es la que vas a solicitar. Queda pendiente hasta que se confirme.",
      cta: "Crear cuenta",
    },
    nav: {
      inicio: "Inicio",
      about: "Sobre mí",
      services: "Mis servicios",
      hours: "Horas disponibles",
    },
    footer: {
      blurb: "Kinesiología a domicilio y por telemedicina, con horarios claros y un trato cercano.",
      email: "erickbarriosarias30@gmail.com",
      phone: "+569-41303571",
      whatsapp: "+56 9 4130 3571",
      hours1: "18:00 · Disponibilidad",
      hours2: "19:00 · Disponibilidad",
      credit: "Fotografías de Pexels y Unsplash.",
    },
    faq: {
      eyebrow: "Ayuda",
      title: "Preguntas frecuentes",
      q1: "¿Cómo agendo una hora de kinesiología?",
      a1: "En Reserva tu atención elige un día amarillo, la modalidad a domicilio o videoconsulta y una hora libre. Si aún no tienes cuenta, regístrate. La solicitud queda pendiente hasta que el kinesiólogo la confirme o la rechace.",
      q2: "¿La atención es en mi casa o por telemedicina?",
      a2: "Puedes elegir las dos. La atención domiciliaria se hace en tu casa. La telemedicina es una videollamada para revisar ejercicios, dolor y avances sin que tengas que trasladarte.",
      q3: "¿Qué horarios se pueden reservar?",
      a3: "Cada día publicado puede ofrecer dos horas: 18:00 y 19:00. En el calendario esos días se ven en amarillo.",
      q4: "¿Cómo contacto a KineDom?",
      a4: "Puedes escribir por WhatsApp al +56 9 4130 3571 o al correo erickbarriosarias30@gmail.com.",
    },
  };

  const groups = [
    {
      id: "seo",
      title: "Título del sitio",
      fields: [
        { key: "seo.title", label: "Título de la pestaña" },
        { key: "seo.description", label: "Descripción", type: "textarea" },
      ],
    },
    {
      id: "faq",
      title: "Preguntas frecuentes",
      fields: [
        { key: "faq.eyebrow", label: "Etiqueta superior" },
        { key: "faq.title", label: "Título" },
        { key: "faq.q1", label: "Pregunta 1" },
        { key: "faq.a1", label: "Respuesta 1", type: "textarea" },
        { key: "faq.q2", label: "Pregunta 2" },
        { key: "faq.a2", label: "Respuesta 2", type: "textarea" },
        { key: "faq.q3", label: "Pregunta 3" },
        { key: "faq.a3", label: "Respuesta 3", type: "textarea" },
        { key: "faq.q4", label: "Pregunta 4" },
        { key: "faq.a4", label: "Respuesta 4", type: "textarea" },
      ],
    },
    {
      id: "hero",
      title: "Inicio",
      fields: [
        { key: "hero.eyebrow", label: "Etiqueta superior" },
        { key: "hero.title", label: "Título principal", type: "textarea" },
        { key: "hero.lead", label: "Texto de apoyo", type: "textarea" },
        { key: "hero.ctaHours", label: "Botón de horas" },
        { key: "hero.ctaServices", label: "Botón de servicios" },
        { key: "hero.chip1", label: "Etiqueta 1" },
        { key: "hero.chip2", label: "Etiqueta 2" },
        { key: "hero.chip3", label: "Etiqueta 3" },
        { key: "hero.caption1", label: "Pie de la imagen 1", type: "textarea" },
        { key: "hero.alt1", label: "Descripción de la imagen 1" },
        { key: "hero.image1", label: "Reemplazar imagen 1", type: "image" },
        { key: "hero.caption2", label: "Pie de la imagen 2", type: "textarea" },
        { key: "hero.alt2", label: "Descripción de la imagen 2" },
        { key: "hero.image2", label: "Reemplazar imagen 2", type: "image" },
        { key: "hero.caption3", label: "Pie de la imagen 3", type: "textarea" },
        { key: "hero.alt3", label: "Descripción de la imagen 3" },
        { key: "hero.image3", label: "Reemplazar imagen 3", type: "image" },
      ],
    },
    {
      id: "about",
      title: "Sobre mí",
      fields: [
        { key: "about.eyebrow", label: "Etiqueta" },
        { key: "about.title", label: "Título", type: "textarea" },
        { key: "about.p1", label: "Párrafo 1", type: "textarea" },
        { key: "about.p2", label: "Párrafo 2", type: "textarea" },
        { key: "about.p3", label: "Párrafo 3", type: "textarea" },
        { key: "about.point1Title", label: "Punto 1, título" },
        { key: "about.point1Text", label: "Punto 1, texto", type: "textarea" },
        { key: "about.point2Title", label: "Punto 2, título" },
        { key: "about.point2Text", label: "Punto 2, texto", type: "textarea" },
        { key: "about.point3Title", label: "Punto 3, título" },
        { key: "about.point3Text", label: "Punto 3, texto", type: "textarea" },
        { key: "about.caption", label: "Pie de la foto" },
        { key: "about.alt", label: "Descripción de la foto" },
        { key: "about.image", label: "Reemplazar foto", type: "image" },
      ],
    },
    {
      id: "services",
      title: "Mis servicios",
      fields: [
        { key: "services.eyebrow", label: "Etiqueta" },
        { key: "services.title", label: "Título", type: "textarea" },
        { key: "services.intro", label: "Introducción", type: "textarea" },
        { key: "services.step1Title", label: "Paso 1, título" },
        { key: "services.step1Text", label: "Paso 1, texto", type: "textarea" },
        { key: "services.step2Title", label: "Paso 2, título" },
        { key: "services.step2Text", label: "Paso 2, texto", type: "textarea" },
        { key: "services.step3Title", label: "Paso 3, título" },
        { key: "services.step3Text", label: "Paso 3, texto", type: "textarea" },
        { key: "services.step4Title", label: "Paso 4, título" },
        { key: "services.step4Text", label: "Paso 4, texto", type: "textarea" },
        { key: "services.card1Title", label: "Servicio 1, título" },
        { key: "services.card1Text", label: "Servicio 1, texto", type: "textarea" },
        { key: "services.card2Title", label: "Servicio 2, título" },
        { key: "services.card2Text", label: "Servicio 2, texto", type: "textarea" },
        { key: "services.card3Title", label: "Servicio 3, título" },
        { key: "services.card3Text", label: "Servicio 3, texto", type: "textarea" },
        { key: "services.card4Title", label: "Servicio 4, título" },
        { key: "services.card4Text", label: "Servicio 4, texto", type: "textarea" },
        { key: "services.card5Title", label: "Servicio 5, título" },
        { key: "services.card5Text", label: "Servicio 5, texto", type: "textarea" },
        { key: "services.card6Title", label: "Servicio 6, título" },
        { key: "services.card6Text", label: "Servicio 6, texto", type: "textarea" },
      ],
    },
    {
      id: "agenda",
      title: "Horas disponibles",
      fields: [
        { key: "agenda.eyebrow", label: "Etiqueta" },
        { key: "agenda.title", label: "Título" },
        { key: "agenda.intro", label: "Texto", type: "textarea" },
        { key: "agenda.asideTitle", label: "Título del recuadro" },
        { key: "agenda.step1", label: "Paso 1" },
        { key: "agenda.step2", label: "Paso 2" },
        { key: "agenda.step3", label: "Paso 3" },
        { key: "agenda.note", label: "Nota", type: "textarea" },
        { key: "agenda.cta", label: "Botón" },
      ],
    },
    {
      id: "nav",
      title: "Menú",
      fields: [
        { key: "nav.inicio", label: "Inicio" },
        { key: "nav.about", label: "Sobre mí" },
        { key: "nav.services", label: "Mis servicios" },
        { key: "nav.hours", label: "Horas disponibles" },
      ],
    },
    {
      id: "footer",
      title: "Pie de página",
      fields: [
        { key: "footer.blurb", label: "Descripción", type: "textarea" },
        { key: "footer.email", label: "Correo" },
        { key: "footer.phone", label: "Teléfono" },
        { key: "footer.whatsapp", label: "WhatsApp para agendar e informes" },
        { key: "footer.hours1", label: "Horario 1" },
        { key: "footer.hours2", label: "Horario 2" },
        { key: "footer.credit", label: "Crédito de fotos" },
      ],
    },
  ];

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function merge(base, extra) {
    if (Array.isArray(base)) return Array.isArray(extra) ? extra.slice() : base.slice();
    if (base && typeof base === "object") {
      const out = {};
      Object.keys(base).forEach((key) => {
        out[key] = extra && Object.prototype.hasOwnProperty.call(extra, key) ? merge(base[key], extra[key]) : clone(base[key]);
      });
      return out;
    }
    return extra === undefined || extra === null ? base : extra;
  }

  let stored = {};
  let settled = false;
  let resolveReady;
  const ready = new Promise((resolve) => {
    resolveReady = resolve;
  });

  function finishReady() {
    if (!settled) {
      settled = true;
      resolveReady();
    }
  }

  function db() {
    return window.KineDomDB && KineDomDB.client;
  }

  async function uploadImage(dataUrl, path) {
    const match = String(dataUrl).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!match) return dataUrl;
    const bytes = Uint8Array.from(atob(match[2]), (char) => char.charCodeAt(0));
    const ext = match[1].split("/")[1].replace("jpeg", "jpg").replace("+xml", "");
    const filePath = `${path}-${Date.now()}.${ext}`;
    const { error } = await db().storage.from("site-images").upload(filePath, bytes, {
      contentType: match[1],
      upsert: true,
    });
    if (error) throw new Error("No se pudo guardar la imagen en Supabase.");
    return db().storage.from("site-images").getPublicUrl(filePath).data.publicUrl;
  }

  async function storeImages(value, path) {
    if (typeof value === "string" && value.startsWith("data:image/")) return uploadImage(value, path);
    if (Array.isArray(value)) {
      const next = [];
      for (let index = 0; index < value.length; index += 1) {
        next.push(await storeImages(value[index], `${path}-${index}`));
      }
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

  async function load() {
    const database = db();
    if (!database) {
      stored = {};
      finishReady();
      return get();
    }
    const { data, error } = await database.from("site_content").select("data").eq("id", 1).maybeSingle();
    stored = !error && data && data.data && typeof data.data === "object" ? data.data : {};
    if (stored.footer) {
      if (stored.footer.whatsapp === "+56 9 0000 0000") stored.footer.whatsapp = defaults.footer.whatsapp;
      if (stored.footer.phone === "+56 9 0000 0000") stored.footer.phone = defaults.footer.phone;
      if (stored.footer.email === "contacto@kinedom.cl") stored.footer.email = defaults.footer.email;
    }
    if (stored.agenda) {
      if (stored.agenda.title === "Horas disponibles") stored.agenda.title = defaults.agenda.title;
      if (
        stored.agenda.intro ===
        "Elige el día y si prefieres domicilio o telemedicina. Cada día puede tener dos horas, 18:00 y 19:00, marcadas como disponibilidad."
      ) {
        stored.agenda.intro = defaults.agenda.intro;
      }
      if (stored.agenda.step1 === "Elige un día marcado en amarillo, con la palabra disponibilidad.") {
        stored.agenda.step1 = defaults.agenda.step1;
      }
      if (stored.agenda.step2 === "Selecciona domicilio o telemedicina y una hora libre.") {
        stored.agenda.step2 = defaults.agenda.step2;
      }
      if (stored.agenda.step3 === "Crea tu cuenta o entra si ya estás registrado.") {
        stored.agenda.step3 = defaults.agenda.step3;
      }
      if (stored.agenda.note === "Las horas en amarillo son las que el kinesiólogo publicó. Al agendar, la cita queda guardada en la base de datos.") {
        stored.agenda.note = defaults.agenda.note;
      }
    }
    if (stored.faq) {
      if (
        stored.faq.a1 ===
        "En Horas disponibles elige un día marcado como disponibilidad, la modalidad de domicilio o telemedicina y una hora libre. Si aún no tienes cuenta, regístrate. La solicitud queda pendiente hasta que el kinesiólogo la confirme o la rechace."
      ) {
        stored.faq.a1 = defaults.faq.a1;
      }
      if (
        stored.faq.a3 ===
        "Cada día publicado puede ofrecer dos horas: 18:00 y 19:00. En el calendario aparecen en amarillo, con la palabra disponibilidad."
      ) {
        stored.faq.a3 = defaults.faq.a3;
      }
    }
    finishReady();
    return get();
  }

  function get() {
    return merge(defaults, stored);
  }

  function pick(data, path) {
    return path.split(".").reduce((node, key) => (node == null ? undefined : node[key]), data);
  }

  function put(data, path, value) {
    const keys = path.split(".");
    let node = data;
    keys.slice(0, -1).forEach((key) => {
      if (!node[key] || typeof node[key] !== "object") node[key] = {};
      node = node[key];
    });
    node[keys[keys.length - 1]] = value;
  }

  async function save(data) {
    const database = db();
    if (!database) return { ok: false, error: "La base de datos de Supabase todavía no está conectada." };
    try {
      const payload = await storeImages(data, "contenido");
      const { error } = await database.from("site_content").upsert({
        id: 1,
        data: payload,
        updated_at: new Date().toISOString(),
      });
      if (error) return { ok: false, error: "No se pudo guardar el contenido." };
      stored = payload;
      apply();
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message || "No se pudo guardar el contenido." };
    }
  }

  async function restore() {
    stored = {};
    const result = await save(get());
    return result.ok ? get() : result;
  }

  function syncStructuredData(content) {
    const node = document.getElementById("seo-jsonld");
    if (!node || !content.seo) return;
    let data;
    try {
      data = JSON.parse(node.textContent);
    } catch (error) {
      return;
    }
    const graph = Array.isArray(data["@graph"]) ? data["@graph"] : [];
    graph.forEach((item) => {
      if (item["@type"] === "WebSite" || item["@type"] === "MedicalBusiness") {
        item.description = content.seo.description;
      }
      if (item["@type"] === "FAQPage" && content.faq) {
        item.mainEntity = [1, 2, 3, 4]
          .map((index) => ({
            "@type": "Question",
            name: content.faq[`q${index}`],
            acceptedAnswer: { "@type": "Answer", text: content.faq[`a${index}`] },
          }))
          .filter((question) => question.name && question.acceptedAnswer.text);
      }
    });
    node.textContent = JSON.stringify(data);
  }

  function apply(data) {
    const content = data || get();
    document.querySelectorAll("[data-edit]").forEach((node) => {
      const value = pick(content, node.dataset.edit);
      if (typeof value === "string") node.textContent = value;
    });
    document.querySelectorAll("[data-edit-caption]").forEach((node) => {
      const value = pick(content, node.dataset.editCaption);
      if (typeof value === "string") node.dataset.caption = value;
    });
    document.querySelectorAll("[data-edit-alt]").forEach((node) => {
      const value = pick(content, node.dataset.editAlt);
      if (typeof value === "string") node.alt = value;
    });
    document.querySelectorAll("[data-edit-src]").forEach((node) => {
      const value = pick(content, node.dataset.editSrc);
      if (typeof value === "string" && value) node.src = value;
    });
    document.querySelectorAll("[data-edit-mailto]").forEach((node) => {
      const value = pick(content, node.dataset.editMailto);
      if (typeof value === "string" && value) node.href = `mailto:${value.trim()}`;
    });
    document.querySelectorAll("[data-edit-tel]").forEach((node) => {
      const value = pick(content, node.dataset.editTel);
      const digits = String(value || "").replace(/\D/g, "");
      if (digits) node.href = `tel:+${digits}`;
    });
    if (content.seo) {
      if (content.seo.title) document.title = content.seo.title;
      const description = document.querySelector('meta[name="description"]');
      if (description && content.seo.description) description.setAttribute("content", content.seo.description);
      ["og:title", "twitter:title"].forEach((name) => {
        const node = document.querySelector(`meta[property="${name}"], meta[name="${name}"]`);
        if (node && content.seo.title) node.setAttribute("content", content.seo.title);
      });
      ["og:description", "twitter:description"].forEach((name) => {
        const node = document.querySelector(`meta[property="${name}"], meta[name="${name}"]`);
        if (node && content.seo.description) node.setAttribute("content", content.seo.description);
      });
      syncStructuredData(content);
    }
    const caption = document.getElementById("hero-caption");
    const active = document.querySelector(".hero-slide.is-active");
    if (caption && active && active.dataset.caption) caption.textContent = active.dataset.caption;
  }

  load().then(() => {
    if (document.querySelector("[data-edit], [data-edit-caption], [data-edit-src]")) apply();
  });

  document.addEventListener("kinedom-sync", () => {
    if (document.querySelector("[data-edit]")) apply();
  });

  return { defaults, groups, get, pick, put, save, restore, apply, load, ready };
})();
