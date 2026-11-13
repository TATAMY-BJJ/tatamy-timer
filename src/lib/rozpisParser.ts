// Parser rozpisu turnaje (PDF / Excel) -> rozhodčí + žíněnky s časoměřiči
export interface TextItem { x: number; y: number; text: string }
export interface ImportRozhodci { cislo_id: number; jmeno: string; prijmeni: string }
export interface ImportZinenka { cislo: number; nazev: string; casomeric: string }
export interface RozpisResult { rozhodci: ImportRozhodci[]; zinenky: ImportZinenka[] }

const fixSpaces = (s: string) =>
  s.replace(/\b([A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]) (?=[a-záčďéěíňóřšťúůýž])/g, "$1").replace(/\s+/g, " ").trim();

const splitName = (full: string) => {
  const parts = full.split(" ").filter(Boolean);
  if (parts.length <= 1) return { jmeno: full, prijmeni: "" };
  return { jmeno: parts.slice(0, -1).join(" "), prijmeni: parts[parts.length - 1] };
};

const KEYWORDS = /ČASOMÍRA|ROZHODČÍ|MAT\s*\d|po skončení|úklid|TATAMY|SEZNAM|STŘÍDÁNÍ|KOORDINÁ|ŠKOLENÍ|VÝPLAT|ZDRAVOTN|\d{1,2}:\d{2}|ADCC|IBJJF|ID:/i;
const looksLikeName = (s: string) => /^[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ][\p{L}.'-]+( [\p{L}.'-]+){1,3}$/u.test(s) && !KEYWORDS.test(s);

/** Seskupí položky do řádků (dle y) seřazených shora dolů, uvnitř zleva doprava. */
const toLines = (items: TextItem[], tol: number) => {
  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
  const lines: TextItem[][] = [];
  for (const it of sorted) {
    const last = lines[lines.length - 1];
    if (last && Math.abs(last[0].y - it.y) <= tol) last.push(it);
    else lines.push([it]);
  }
  return lines.map((l) => l.sort((a, b) => a.x - b.x));
};

export function parseRozpis(rawItems: TextItem[], tol = 3): RozpisResult {
  const items = rawItems.map((i) => ({ ...i, text: fixSpaces(i.text) })).filter((i) => i.text);
  const lines = toLines(items, tol);
  const rozhodci = new Map<number, ImportRozhodci>();
  const addRef = (id: number, name: string) => {
    if (id < 0 || id > 99 || !name) return;
    rozhodci.set(id, { cislo_id: id, ...splitName(name) });
  };

  // Hlavní rozhodčí: "Jméno Příjmení (poznámka) (00)"
  for (const it of items) {
    const m = it.text.match(/^(.+?)\s*(?:\([^)]*\)\s*)*\((\d{2})\)$/);
    if (m) addRef(parseInt(m[2]), fixSpaces(m[1].replace(/\(.*$/, "")));
  }

  // Bloky "ČASOMÍRA ... MAT N"
  type Block = { section: "KIDS" | "ADULTS"; mat: number; matX: number; start: number; end: number };
  const blocks: Block[] = [];
  let section: "KIDS" | "ADULTS" = "KIDS";
  lines.forEach((line, idx) => {
    const joined = line.map((i) => i.text).join(" ");
    if (/TATAMY.*\bKIDS\b/i.test(joined)) section = "KIDS";
    if (/TATAMY.*\bADULTS\b/i.test(joined)) section = "ADULTS";
    if (blocks.length && line.some((i) => i.x < blocks[blocks.length - 1].matX && /^(SEZNAM|STŘÍDÁNÍ ČASOMÍRA)/.test(i.text))) blocks[blocks.length - 1].end = Math.min(blocks[blocks.length - 1].end, idx);
    if (line.some((i) => /^ČASOMÍRA$/i.test(i.text) || /^ČASOMÍRA\b/i.test(i.text))) {
      const matItem = line.find((i) => /MAT\s*(\d+)/i.test(i.text));
      if (!matItem) return;
      const mat = parseInt(matItem.text.match(/MAT\s*(\d+)/i)![1]);
      if (blocks.length) blocks[blocks.length - 1].end = Math.min(blocks[blocks.length - 1].end, idx);
      blocks.push({ section, mat, matX: matItem.x, start: idx, end: lines.length });
    }
    if (/TATAMY.*\b(KIDS|ADULTS)\b/i.test(joined) && blocks.length) blocks[blocks.length - 1].end = Math.min(blocks[blocks.length - 1].end, idx);
  });

  const kidsMax = Math.max(0, ...blocks.filter((b) => b.section === "KIDS").map((b) => b.mat));
  const zinenky: ImportZinenka[] = [];
  for (const b of blocks) {
    let casomeric = "";
    for (let i = b.start + 1; i < b.end; i++) {
      const line = lines[i];
      line.forEach((it, k) => {
        const idm = it.text.match(/ID:\s*(\d{1,2})\s*$/i);
        const inline = it.text.match(/^(.+?)\s+(?:ADCC|IBJJF)?\s*ID:\s*(\d{1,2})$/i);
        if (inline && looksLikeName(fixSpaces(inline[1].replace(/\b(ADCC|IBJJF)\b/g, "")))) {
          addRef(parseInt(inline[2]), fixSpaces(inline[1].replace(/\b(ADCC|IBJJF)\b/g, "")));
        } else if (idm) {
          for (let j = k - 1; j >= 0; j--) {
            if (/^(ADCC|IBJJF)$/i.test(line[j].text)) continue;
            if (looksLikeName(line[j].text)) addRef(parseInt(idm[1]), line[j].text);
            break;
          }
        }
        if (!casomeric && it.x < b.matX && looksLikeName(it.text)) casomeric = it.text;
      });
    }
    const cislo = b.section === "KIDS" ? b.mat : kidsMax + b.mat;
    zinenky.push({ cislo, nazev: `MAT ${b.mat} ${b.section}`, casomeric });
  }

  return {
    rozhodci: [...rozhodci.values()].sort((a, b) => a.cislo_id - b.cislo_id),
    zinenky: zinenky.sort((a, b) => a.cislo - b.cislo),
  };
}

export async function extractItemsFromPdf(file: File): Promise<TextItem[]> {
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const out: TextItem[] = [];
  let offset = 0;
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const vp = page.getViewport({ scale: 1 });
    const tc = await page.getTextContent();
    for (const it of tc.items as any[]) {
      if (!it.str?.trim()) continue;
      out.push({ x: it.transform[4], y: offset + (vp.height - it.transform[5]), text: it.str });
    }
    offset += vp.height;
  }
  // sloučit fragmenty na stejném řádku těsně vedle sebe (např. "ROZHOD" + "Č" + "ÍCH")
  return out;
}

export async function extractItemsFromExcel(file: File): Promise<TextItem[]> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(await file.arrayBuffer());
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: true, defval: "" });
  const out: TextItem[] = [];
  rows.forEach((row, r) => row.forEach((cell, c) => {
    const t = String(cell ?? "").trim();
    if (t) out.push({ x: c * 100, y: r * 10, text: t });
  }));
  return out;
}
