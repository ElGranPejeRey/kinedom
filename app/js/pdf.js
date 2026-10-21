var KinePdf = (() => {
  const PDF_WIDTHS = {
    " ": 278, "!": 278, '"': 355, "#": 556, $: 556, "%": 889, "&": 667, "'": 191,
    "(": 333, ")": 333, "*": 389, "+": 584, ",": 278, "-": 333, ".": 278, "/": 278,
    0: 556, 1: 556, 2: 556, 3: 556, 4: 556, 5: 556, 6: 556, 7: 556, 8: 556, 9: 556,
    ":": 278, ";": 278, "?": 556,
    A: 667, B: 667, C: 722, D: 722, E: 667, F: 611, G: 778, H: 722, I: 278, J: 500,
    K: 667, L: 556, M: 833, N: 722, O: 778, P: 667, Q: 778, R: 722, S: 667, T: 611,
    U: 722, V: 667, W: 944, X: 667, Y: 667, Z: 611,
    a: 556, b: 556, c: 500, d: 556, e: 556, f: 278, g: 556, h: 556, i: 222, j: 222,
    k: 500, l: 222, m: 833, n: 556, o: 556, p: 556, q: 556, r: 333, s: 500, t: 278,
    u: 556, v: 500, w: 722, x: 500, y: 500, z: 500,
  };

  function fileName(nombre) {
    const clean = String(nombre || "paciente")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s-]/g, "")
      .trim();
    return `Informe kinesico - ${clean || "paciente"}.pdf`;
  }

  function pdfCharWidth(ch) {
    const base = ch.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return PDF_WIDTHS[base] || PDF_WIDTHS[ch] || 556;
  }

  function pdfTextWidth(text, size) {
    let width = 0;
    for (const ch of text) width += pdfCharWidth(ch);
    return (width / 1000) * size;
  }

  function wrapPdfLine(text, size, maxWidth) {
    const words = String(text).split(/\s+/).filter(Boolean);
    const lines = [];
    let line = "";
    words.forEach((word) => {
      const next = line ? `${line} ${word}` : word;
      if (pdfTextWidth(next, size) <= maxWidth) {
        line = next;
        return;
      }
      if (line) lines.push(line);
      if (pdfTextWidth(word, size) <= maxWidth) {
        line = word;
        return;
      }
      let chunk = "";
      for (const ch of word) {
        const trial = chunk + ch;
        if (pdfTextWidth(trial, size) <= maxWidth) chunk = trial;
        else {
          if (chunk) lines.push(chunk);
          chunk = ch;
        }
      }
      line = chunk;
    });
    if (line) lines.push(line);
    return lines.length ? lines : [""];
  }

  function pdfHex(text) {
    let hex = "";
    for (const ch of text) {
      const code = ch.codePointAt(0);
      let byte = 63;
      if (code >= 32 && code <= 126) byte = code;
      else if (code >= 160 && code <= 255) byte = code;
      else if (code === 0x2013) byte = 0x96;
      else if (code === 0x2014) byte = 0x97;
      else if (code === 0x2018 || code === 0x2019) byte = 0x92;
      else if (code === 0x201c || code === 0x201d) byte = 0x94;
      else if (code === 0x2026) byte = 0x85;
      hex += byte.toString(16).padStart(2, "0");
    }
    return hex;
  }

  function reportPdf(item) {
    const pageW = 595.28;
    const pageH = 841.89;
    const margin = 56;
    const maxW = pageW - margin * 2;
    const ink = "0.141 0.110 0.086";
    const muted = "0.435 0.369 0.322";
    const headings = new Set([
      "Informe kinésico",
      "Motivo de consulta",
      "Antecedentes",
      "Atenciones registradas",
      "Evaluación",
      "Plan",
    ]);
    const blocks = [];
    String(item.texto || "").replace(/\r\n/g, "\n").split("\n").forEach((paragraph) => {
      const clean = paragraph.trim();
      if (!clean) {
        blocks.push({ kind: "gap", h: 8 });
        return;
      }
      if (headings.has(clean)) {
        const size = clean === "Informe kinésico" ? 18 : 13;
        blocks.push({ kind: "text", text: clean, font: "F2", size, leading: size + 8, color: ink });
        return;
      }
      wrapPdfLine(paragraph, 11, maxW).forEach((line) => {
        blocks.push({ kind: "text", text: line, font: "F1", size: 11, leading: 16, color: ink });
      });
    });
    blocks.push({ kind: "gap", h: 22 }, { kind: "rule" }, { kind: "gap", h: 16 });
    wrapPdfLine("Erick Rodrigo Barrios Arias", 16, maxW).forEach((line) => {
      blocks.push({ kind: "text", text: line, font: "F3", size: 16, leading: 22, color: ink });
    });
    ["17.202.257-k", "kinesiólogo", "RSS: 664849"].forEach((line) => {
      blocks.push({ kind: "text", text: line, font: "F1", size: 11, leading: 16, color: muted });
    });

    const pages = [];
    let current = [];
    let y = pageH - margin;
    blocks.forEach((block) => {
      const height = block.kind === "text" ? block.leading : block.kind === "rule" ? 10 : block.h;
      if (y - height < margin && current.length) {
        pages.push(current);
        current = [];
        y = pageH - margin;
      }
      if (!current.length && block.kind === "gap") return;
      current.push({ ...block, y });
      y -= height;
    });
    if (current.length) pages.push(current);

    const streams = pages.map((page) => page.map((block) => {
      if (block.kind === "gap") return "";
      if (block.kind === "rule") {
        const lineY = (block.y - 4).toFixed(2);
        return `0.906 0.851 0.800 RG\n0.8 w\n${margin} ${lineY} m ${(pageW - margin).toFixed(2)} ${lineY} l S`;
      }
      const baseline = (block.y - block.size).toFixed(2);
      return `BT\n/${block.font} ${block.size} Tf\n${block.color} rg\n1 0 0 1 ${margin} ${baseline} Tm\n<${pdfHex(block.text)}> Tj\nET`;
    }).filter(Boolean).join("\n"));

    const objects = [];
    objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
    const pageNums = streams.map((_, index) => 6 + index * 2);
    objects[2] = `<< /Type /Pages /Kids [${pageNums.map((num) => `${num} 0 R`).join(" ")}] /Count ${streams.length} >>`;
    objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
    objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
    objects[5] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>";
    streams.forEach((stream, index) => {
      const pageNum = 6 + index * 2;
      objects[pageNum] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Contents ${pageNum + 1} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> >>`;
      objects[pageNum + 1] = { stream };
    });

    let pdf = "%PDF-1.4\n";
    const offsets = [0];
    const maxObj = 5 + streams.length * 2;
    for (let index = 1; index <= maxObj; index += 1) {
      offsets[index] = pdf.length;
      const obj = objects[index];
      pdf += obj && obj.stream != null
        ? `${index} 0 obj\n<< /Length ${obj.stream.length} >>\nstream\n${obj.stream}\nendstream\nendobj\n`
        : `${index} 0 obj\n${obj}\nendobj\n`;
    }
    const xrefAt = pdf.length;
    let xref = `xref\n0 ${maxObj + 1}\n0000000000 65535 f \n`;
    for (let index = 1; index <= maxObj; index += 1) {
      xref += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
    }
    pdf += `${xref}trailer\n<< /Size ${maxObj + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF`;
    return new TextEncoder().encode(pdf);
  }

  function blobFor(item) {
    return new Blob([reportPdf(item)], { type: "application/pdf" });
  }

  return { fileName, reportPdf, blobFor };
})();
