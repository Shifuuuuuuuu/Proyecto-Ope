// src/composables/useGestorShared.js
import * as XLSX from "xlsx";
import { ref } from "vue";
import { getDocs, collection } from "firebase/firestore";
import { db } from "@/firebase/config";

/* ===== Constantes ===== */
export const ACEITE_MIN_ATRASO      = 30;
export const OTS_MIN_DIAS          = 8;
export const LEC_MIN_ATRASO        = 30;
export const DIAS_VENCIMIENTO      = 7;
export const LECTURA_INTERVAL_DIAS = 7;
export const FIRE_COL_OTS = "gestor_ot_public";
export const FIRE_COL_LEC = "gestor_lecturas_public";
export const FIRE_COL_ACEITE = "gestor_cambio_aceite_public";

/* ===== Helpers ===== */
export function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
export function todayISO(){ return toISODate(new Date()); }
export function fmtFechaSlash(v) {
  if (!v) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [y, m, d] = v.split("-");
    return `${d}/${m}/${y}`;
  }
  return v;
}
export function parseAceiteFileToRows(wb) {
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { defval: "" });

  function pick(row, ...aliases) {
    const keys = Object.keys(row);
    for (const k of keys) {
      const nk = normStr(k);
      for (const a of aliases) if (nk === normStr(a)) return row[k];
    }
    return "";
  }

  return raw.map(r => {
    const equipo = String(pick(r, "Equipos", "Equipo")).trim();
    const tipo   = String(pick(r, "Tipo", "Tipo equipo", "Categoria")).trim();
    const loc    = String(pick(r, "Localizacion", "Localización", "Locazlizacions", "Ubicacion", "Ubicación")).trim();

    // “Días de atraso” puede venir como texto (ej. "861", "861 d")
    const atrasoRaw = String(pick(r, "Días de atraso", "Dias de atraso", "Atraso", "Dias")).trim();
    const m = atrasoRaw.match(/-?\d+/);
    const atraso_dias = m ? Number(m[0]) : 0;

    return { equipo, tipo, localizacion: loc, atraso_dias };
  });
}

export function normStr(s) {
  return String(s ?? "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\\/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
export function toKey(x) {
  return String(x ?? "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[[\]{}()]/g, "")
    .replace(/\s+/g, "")
    .replace(/_{1,}/g, "-")
    .replace(/-+/g, "-");
}
export function toKeyNoDash(x) { return toKey(x).replace(/-/g, ""); }
export function plateKey(x) {
  return String(x ?? "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}
export function tokens(s) { return normStr(s).replace(/[[\](){}]/g, "").split(" ").filter(Boolean); }
export function jaccard(a, b) {
  const A = new Set(a), B = new Set(b);
  const inter = [...A].filter(x => B.has(x)).length;
  return inter / Math.max(1, A.size + B.size - inter);
}
export function extractBracketCode(text) {
  const s = String(text ?? "");
  const matches = [...s.matchAll(/\[([^\]]{2,})\]/g)];
  if (!matches.length) return "";
  return matches[matches.length - 1][1];
}
export function parseNumLocale(s) {
  if (s == null || s === "") return "";
  const txt = String(s).trim();
  const clean = txt.replace(/\./g, "").replace(/,/g, ".");
  const n = Number(clean);
  return Number.isFinite(n) ? n : txt;
}
export function parseFechaFlexible(v) {
  if (!v && v !== 0) return "";
  const s = String(v).trim();
  if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(s)) {
    const [dd, mm, yyyy] = s.includes("/") ? s.split("/") : s.split("-");
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    return isNaN(d) ? "" : toISODate(d);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const n = Number(s);
  if (Number.isFinite(n) && s.length <= 6) {
    const d = XLSX.SSF.parse_date_code(n);
    if (d) return new Date(Date.UTC(d.y, d.m - 1, d.d)).toISOString().slice(0, 10);
  }
  const d = new Date(s);
  return isNaN(d) ? "" : toISODate(d);
}
export function addDaysISO(iso, days) {
  if (!iso) return "";
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}
export function diffDias(aISO, bISO) {
  if (!aISO || !bISO) return 0;
  const a = new Date(aISO); a.setHours(0,0,0,0);
  const b = new Date(bISO); b.setHours(0,0,0,0);
  return Math.max(0, Math.floor((b - a) / (1000*60*60*24)));
}

/* ===== Índices y catálogos ===== */
export function useCatalogos() {
  const equipos = ref([]);     // {id, equipo_text, patente, contratoId?}
  const contratos = ref([]);   // {id, nombre}
  const idxEqByKey = ref(new Map());

  function indexEqAdd(byKey, key, eq) { if (key && !byKey.has(key)) byKey.set(key, eq); }
  function buildEquipoIndex() {
    const byKey = new Map();
    for (const e of equipos.value) {
      const p = e.patente ? toKey(e.patente) : "";
      if (p) {
        indexEqAdd(byKey, p, e);
        indexEqAdd(byKey, toKeyNoDash(p), e);
        indexEqAdd(byKey, plateKey(e.patente), e);
      }
      const n = toKey(e.equipo_text);
      if (n) {
        indexEqAdd(byKey, n, e);
        indexEqAdd(byKey, toKeyNoDash(n), e);
        const extra = [...n.matchAll(/[A-Z0-9-]{3,}/g)].map(m => m[0]);
        for (const k of extra) {
          indexEqAdd(byKey, k, e);
          indexEqAdd(byKey, toKeyNoDash(k), e);
          indexEqAdd(byKey, plateKey(k), e);
        }
      }
    }
    idxEqByKey.value = byKey;
  }

  async function loadCatalogos() {
    const [snapEq, snapCt] = await Promise.all([
      getDocs(collection(db, "equipos")),
      getDocs(collection(db, "contratos")),
    ]);
    equipos.value = snapEq.docs.map(d => {
      const raw = d.data();
      return {
        id: d.id,
        equipo_text: String(raw.equipo ?? raw.nombre_equipo ?? "").trim(),
        patente: String(raw.patente ?? "").toUpperCase(),
        contratoId: raw.contratoId ?? null,
      };
    });
    contratos.value = snapCt.docs.map(d => ({ id: d.id, ...d.data() }));
    buildEquipoIndex();
  }

  function matchEquipoPorTexto(textoEquipo) {
    const txt = String(textoEquipo ?? "");
    const bracketRaw = extractBracketCode(txt);
    if (bracketRaw) {
      const keys = new Set([toKey(bracketRaw), toKeyNoDash(bracketRaw), plateKey(bracketRaw)]);
      for (const k of keys) if (idxEqByKey.value.has(k)) return idxEqByKey.value.get(k);
    }
    const normAll = toKey(txt);
    const candidates = new Set();
    for (const m of normAll.matchAll(/[A-Z0-9-]{3,}/g)) {
      const k = m[0];
      candidates.add(k);
      candidates.add(toKeyNoDash(k));
      candidates.add(plateKey(k));
    }
    for (const k of candidates) if (idxEqByKey.value.has(k)) return idxEqByKey.value.get(k);

    // Fuzzy por nombre
    let mejor = null, mejorScore = 0;
    const tTok = tokens(txt);
    for (const e of equipos.value) {
      const n = normStr(e.equipo_text);
      if (!n) continue;
      if (n.includes(normStr(txt)) || normStr(txt).includes(n)) {
        const s = Math.min(n.length, normStr(txt).length) / Math.max(n.length, normStr(txt).length);
        if (s > mejorScore) { mejor = e; mejorScore = s; }
        continue;
      }
      const s = jaccard(tTok, tokens(e.equipo_text));
      if (s >= 0.6 && s > mejorScore) { mejor = e; mejorScore = s; }
    }
    return mejor;
  }

  function equipoLabel(eq) { return (eq?.equipo_text || eq?.patente || ""); }
  function equipoTitle(eq) {
    if (!eq) return "";
    const name = eq.equipo_text || "";
    const plate = eq.patente || "";
    return name && plate ? `${name} · ${plate}` : (name || plate);
  }

  return {
    equipos, contratos, idxEqByKey,
    loadCatalogos, matchEquipoPorTexto, equipoLabel, equipoTitle
  };
}

/* ===== Parsers de archivo ===== */
export function parseOTFileToRows(wb) {
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { defval: "" });
  const hasNew = raw[0] && Object.keys(raw[0]).some(k => k.toLowerCase().includes("folio ot"));
  if (hasNew) {
    return raw.map(r => ({
      folio_ot: String(r["Folio OT"] ?? "").trim(),
      del:  parseFechaFlexible(r["Del"]),
      al:   parseFechaFlexible(r["Al"]),
      usuario_genero: String(r["Usuario que generó la OT"] ?? "").trim(),
      duracion_estimada: String(r["Duración estimada"] ?? "").trim(),
      responsable: String(r["Responsable"] ?? "").trim(),
      localizacion: String(r["Localización (al momento de generarse la OT)"] ?? "").trim(),
      estado: String(r["Estado"] ?? "").trim(),
      tipo_ot: String(r["Tipo OT"] ?? "").trim(),
      equipo_inmueble: String(r["Equipo / Inmueble"] ?? "").trim(),
    }));
  } else {
    const hoyISO = todayISO();
    return raw.map(r => {
      const del = parseFechaFlexible(r["Desde"]);
      const al  = parseFechaFlexible(r["Hasta"]);
      const dias = r["Días Abierta"] ? Number(String(r["Días Abierta"]).replace(/\D+/g, "")) : diffDias(del, hoyISO);
      return {
        folio_ot: String(r["OT"] ?? "").trim(),
        del,
        al,
        usuario_genero: String(r["Usuario que generó la OT"] ?? "").trim(),
        duracion_estimada: "",
        responsable: String(r["Responsable"] ?? "").trim(),
        localizacion: String(r["Localización"] ?? "").trim(),
        estado: String(r["Estado"] ?? "").trim(),
        tipo_ot: String(r["Tipo OT"] ?? "").trim(),
        equipo_inmueble: String(r["Equipo"] ?? "").trim(),
        dias_abiertas_origen: isNaN(dias) ? 0 : dias,
      };
    });
  }
}

export function parseLecturasFileToRows(wb) {
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { defval: "" });
  const hoyISO = todayISO();

  function pick(row, ...aliases) {
    const keys = Object.keys(row);
    for (const k of keys) {
      const nk = normStr(k);
      for (const a of aliases) if (nk === normStr(a)) return row[k];
    }
    return "";
  }

  return raw.map(row => {
    const equipoTxt   = pick(row, "Equipo");
    const ultLectRaw  = pick(row, "Última lectura del contador", "Ultima lectura del contador");
    const ultFechaRaw = pick(row, "Última fecha de actualización", "Ultima fecha de actualizacion");
    const proxRaw     = pick(row, "Próxima toma de lectura", "Proxima toma de lectura");
    const atrasoRaw   = pick(row, "Atraso");

    const ultima_fecha  = parseFechaFlexible(ultFechaRaw);
    const proxima_toma0 = parseFechaFlexible(proxRaw);
    const proxima_toma  = proxima_toma0 || (ultima_fecha ? addDaysISO(ultima_fecha, LECTURA_INTERVAL_DIAS) : "");

    let atraso_dias = 0;
    if (String(atrasoRaw || "").trim() !== "") {
      const m = String(atrasoRaw).match(/(\d+)/);
      atraso_dias = m ? Number(m[1]) : 0;
    } else if (proxima_toma) {
      atraso_dias = Math.max(0, diffDias(proxima_toma, hoyISO));
    }

    return {
      equipo: String(equipoTxt).trim(),
      ultima_lectura: parseNumLocale(ultLectRaw),
      ultima_fecha,
      proxima_toma,
      atraso_dias,
    };
  });
}
