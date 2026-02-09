// index.js (API para Power BI + seguridad simple por API KEY + CORS controlado)
// ✅ Compatible con deploy (Cloud Run / Render / Railway) sin guardar serviceAccountKey.json
// ✅ También funciona local con serviceAccountKey.json si existe
// ✅ Power BI puede consumir con header: x-api-key: TU_KEY

const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");

const app = express();
const PORT = process.env.PORT || 3000;

// =========================
// 1) CORS (controlado)
// =========================
// - Para Power BI normalmente no es crítico, pero para usar desde web sí.
// - Define CORS_ORIGINS en env (separado por comas) o deja "*" si no lo necesitas.
const CORS_ORIGINS = (process.env.CORS_ORIGINS || "*")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // Sin origin (Power BI / server-to-server) -> permitir
      if (!origin) return cb(null, true);

      if (CORS_ORIGINS.includes("*")) return cb(null, true);
      if (CORS_ORIGINS.includes(origin)) return cb(null, true);

      return cb(new Error(`CORS bloqueado para: ${origin}`), false);
    },
    methods: ["GET", "OPTIONS"],
    allowedHeaders: ["Content-Type", "x-api-key", "Authorization"],
  })
);

// =========================
// 2) API KEY (simple y efectiva para Power BI)
// =========================
// - Configura API_KEY en tu hosting (Cloud Run/Render/Railway) o en tu .env local.
// - Power BI la enviará como header x-api-key
function requireApiKey(req, res, next) {
  const expected = process.env.API_KEY;

  // Si no configuraste API_KEY, NO bloqueamos para no dejarte fuera en desarrollo,
  // pero te avisamos (recomendación: SIEMPRE setearla si es pública).
  if (!expected) {
    console.warn("⚠️  API_KEY no configurada. La API está sin protección.");
    return next();
  }

  const provided = req.get("x-api-key");
  if (!provided || provided !== expected) {
    return res.status(401).json({ error: "Unauthorized (missing/invalid x-api-key)" });
  }
  next();
}

// =========================
// 3) Inicialización Firebase Admin
// =========================
// - En Cloud Run: usa admin.initializeApp() (sin JSON) y asignas un Service Account al servicio.
// - En local: si existe ./serviceAccountKey.json, lo usa.
function initFirebaseAdmin() {
  try {
    // Si ya está inicializado, no repetir.
    if (admin.apps.length) return;

    let serviceAccount = null;
    try {
      // Intentar usar JSON local (solo si existe)
      serviceAccount = require("./serviceAccountKey.json");
    } catch (_) {
      serviceAccount = null;
    }

    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log("✅ Firebase Admin inicializado con serviceAccountKey.json (local).");
    } else {
      admin.initializeApp();
      console.log("✅ Firebase Admin inicializado con credenciales del entorno (cloud).");
    }
  } catch (e) {
    console.error("❌ Error inicializando Firebase Admin:", e);
    throw e;
  }
}

initFirebaseAdmin();
const db = admin.firestore();

// =========================
// 4) Helpers
// =========================
function mapSnapshot(snapshot) {
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function getAll(collectionName) {
  const snapshot = await db.collection(collectionName).get();
  return mapSnapshot(snapshot);
}

// =========================
// 5) Rutas
// =========================

// Health check
app.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "api-rest-firestore",
    time: new Date().toISOString(),
  });
});

// ✅ Endpoints REST (protegidos por API KEY)
app.get("/api/operatividad", requireApiKey, async (req, res) => {
  try {
    const datos = await getAll("operatividad");
    res.json(datos);
  } catch (err) {
    console.error("❌ Error al obtener operatividad:", err);
    res.status(500).json({ error: "Error al obtener operatividad" });
  }
});

app.get("/api/usuarios", requireApiKey, async (req, res) => {
  try {
    // ⚠️ Recomendación: en producción no expongas usuarios completos.
    // Aquí lo dejamos igual que tu versión para mantener compatibilidad.
    const datos = await getAll("usuarios");
    res.json(datos);
  } catch (err) {
    console.error("❌ Error al obtener usuarios:", err);
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
});

app.get("/api/equipos", requireApiKey, async (req, res) => {
  try {
    const datos = await getAll("equipos");
    res.json(datos);
  } catch (err) {
    console.error("❌ Error al obtener equipos:", err);
    res.status(500).json({ error: "Error al obtener equipos" });
  }
});

app.get("/api/contratos", requireApiKey, async (req, res) => {
  try {
    const datos = await getAll("contratos");
    res.json(datos);
  } catch (err) {
    console.error("❌ Error al obtener contratos:", err);
    res.status(500).json({ error: "Error al obtener contratos" });
  }
});

app.get("/api/historial_operatividad", requireApiKey, async (req, res) => {
  try {
    const datos = await getAll("historial_operatividad");
    res.json(datos);
  } catch (err) {
    console.error("❌ Error al obtener historial_operatividad:", err);
    res.status(500).json({ error: "Error al obtener historial_operatividad" });
  }
});

app.get("/api/categorias", requireApiKey, async (req, res) => {
  try {
    const datos = await getAll("categorias");
    res.json(datos);
  } catch (err) {
    console.error("❌ Error al obtener categorias:", err);
    res.status(500).json({ error: "Error al obtener categorias" });
  }
});

// =========================
// 6) Listen
// =========================
app.listen(PORT, "0.0.0.0", () => {
  // OJO: 0.0.0.0 es para bindear, no para navegar
  console.log(`✅ API escuchando en http://localhost:${PORT}`);
  console.log(`   Ej: http://localhost:${PORT}/api/categorias`);
});
