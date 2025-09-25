<template>
  <div class="verify-wrap container py-5">
    <div class="mx-auto verify-card shadow-lg">
      <!-- Hero -->
      <div class="verify-hero" :class="ok ? 'ok' : 'fail'">
        <div class="verify-hero-content">
          <i :class="ok ? 'bi bi-shield-check' : 'bi bi-shield-x'"></i>
          <div>
            <h1 class="title mb-1">{{ ok ? 'Certificado verificado' : 'Certificado no válido' }}</h1>
            <p class="subtitle mb-0">Escaneado desde el QR del documento</p>
          </div>
        </div>
        <div class="status-chip" :class="ok ? 'chip-ok' : 'chip-fail'">
          <i :class="ok ? 'bi bi-check-circle-fill' : 'bi bi-x-circle-fill'"></i>
          <span>{{ ok ? 'Vigente' : estadoLabel }}</span>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="loading-zone">
        <div class="spinner-border" role="status" aria-label="Cargando"></div>
        <div class="small text-muted mt-2">Consultando certificado…</div>
      </div>

      <!-- Body -->
      <div v-else class="verify-body">
        <!-- Alert -->
        <div v-if="ok" class="alert alert-success d-flex align-items-center mb-4" role="alert">
          <i class="bi bi-check-circle-fill me-2"></i>
          <div>
            <strong>Certificado de mantenimiento.</strong>
            <span class="mx-2">•</span>
            <span class="badge rounded-pill text-bg-success px-3">Vigente</span>
          </div>
        </div>
        <div v-else class="alert alert-danger d-flex align-items-center mb-4" role="alert">
          <i class="bi bi-x-circle-fill me-2"></i>
          <div>
            <strong>Este certificado no es válido o está vencido.</strong>
            <span class="mx-2">•</span>
            <span class="badge rounded-pill text-bg-danger px-3">{{ estadoLabel }}</span>
          </div>
        </div>

        <!-- Detail -->
        <div v-if="cert" class="detail-grid">

          <div v-if="cert.categoria" class="detail-item">
            <div class="label"><i class="bi bi-collection me-1"></i>Categoría</div>
            <div class="value">{{ cert.categoria }}</div>
          </div>

          <div v-if="cert.equipo" class="detail-item">
            <div class="label"><i class="bi bi-truck me-1"></i>Equipo</div>
            <div class="value fw-semibold">{{ cert.equipo }}</div>
          </div>

          <div v-if="cert.codigo" class="detail-item">
            <div class="label"><i class="bi bi-upc-scan me-1"></i>Código</div>
            <div class="value">{{ cert.codigo }}</div>
          </div>

          <div class="detail-item">
            <div class="label"><i class="bi bi-patch-check me-1"></i>Aprobado</div>
            <div class="value">
              <span :class="['badge','rounded-pill','px-3', cert.aprobado ? 'text-bg-success' : 'text-bg-secondary']">
                {{ cert.aprobado ? 'Sí' : 'No' }}
              </span>
            </div>
          </div>

          <div v-if="cert.creado_iso || cert.creado" class="detail-item">
            <div class="label"><i class="bi bi-calendar-plus me-1"></i>Creado</div>
            <div class="value">{{ fmtDate(cert.creado_iso || cert.creado) }}</div>
          </div>

          <div v-if="cert.fecha_vencimiento" class="detail-item">
            <div class="label"><i class="bi bi-calendar-x me-1"></i>Vence</div>
            <div class="value">{{ fmtDate(cert.fecha_vencimiento) }}</div>
          </div>

          <div v-if="cert.verificar_url" class="detail-item col-span-2">
            <div class="label"><i class="bi bi-link-45deg me-1"></i>URL de verificación</div>
            <div class="value d-flex align-items-center flex-wrap gap-2">
              <span class="text-break">{{ cert.verificar_url }}</span>
              <button type="button" class="btn btn-sm btn-outline-secondary" @click="copiar(cert.verificar_url)">
                <i class="bi bi-clipboard-check me-1"></i> Copiar
              </button>
            </div>
          </div>
        </div>

        <!-- Sin ID o no encontrado -->
        <div v-else class="alert alert-warning" role="alert">
          No se encontró el certificado para el ID indicado.
          Verifica que la URL sea correcta o vuelve a generar el QR.
        </div>

        <!-- Actions -->
        <div class="actions mt-4">
          <button class="btn btn-primary" :disabled="downloading || !cert" @click="descargarCertificado">
            <span v-if="!downloading"><i class="bi bi-download me-1"></i> Descargar PDF</span>
            <span v-else class="spinner-border spinner-border-sm"></span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue"
import { useRoute } from "vue-router"
import { db } from "@/firebase/config"
import {
  doc, getDoc, collection, query as q, where, limit, getDocs
} from "firebase/firestore"
import { obtenerCertificadoDataUrl } from "@/services/certificadosService"

const route = useRoute()
const idParam = computed(() => {
  const raw = Array.isArray(route.query.id) ? route.query.id[0] : route.query.id
  return (raw || "").toString().trim()
})

const loading = ref(true)
const downloading = ref(false)
const cert = ref(null)

/* === Estado (vigencia por fecha + aprobado) === */
const ok = computed(() => {
  if (!cert.value) return false
  const venc = cert.value.fecha_vencimiento
  const vence = venc?.toDate?.() || (venc ? new Date(venc) : null)
  const vigentePorFecha = !!vence && new Date() <= vence
  const aprobado = !!cert.value.aprobado
  const estadoStr = (cert.value.estado || '').toString().toLowerCase()
  const vigentePorEstado = estadoStr === 'vigente'
  return (vigentePorFecha && aprobado) || (!vence && vigentePorEstado && aprobado)
})

const estadoLabel = computed(() => {
  if (!cert.value) return "No encontrado"
  const aprobado = !!cert.value.aprobado
  const venc = cert.value.fecha_vencimiento
  const vence = venc?.toDate?.() || (venc ? new Date(venc) : null)
  const hoy = new Date()
  if (!aprobado) return "No aprobado"
  if (vence && hoy > vence) return "Vencido"
  if (!vence && cert.value.estado) return (cert.value.estado || '').toString()
  return "Vigente"
})

/* === Helpers === */
function copiar(text) { return navigator.clipboard.writeText(text) }
function base64ToBlob(b64, type = "application/pdf") {
  const binary = atob(b64)
  const len = binary.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type })
}
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
/** Acepta Firestore Timestamp, Date o ISO; devuelve dd/mm/yyyy */
function fmtDate(v) {
  const d = v?.toDate?.() || (v ? new Date(v) : null)
  if (!d || isNaN(d)) return "—"
  const dd = String(d.getDate()).padStart(2, "0")
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

/* === Descargar PDF (sin abrir nueva pestaña) === */
async function descargarCertificado() {
  if (!cert.value) return
  try {
    downloading.value = true
    const dataUrl = await obtenerCertificadoDataUrl(activeDocId.value || idParam.value)
    if (!dataUrl) { alert("No se encontró el archivo del certificado."); return }
    const b64 = dataUrl.replace(/^data:.*?;base64,/, "")
    const blob = base64ToBlob(b64, "application/pdf")
    const name = cert.value?.file_name ||
      (cert.value?.equipo ? `certificado_${cert.value.equipo}.pdf` : `certificado_${idParam.value}.pdf`)
    downloadBlob(blob, name)
  } catch (e) {
    console.error(e)
    alert("No se pudo descargar el certificado.")
  } finally {
    downloading.value = false
  }
}

/* === Carga robusta por ID o por URL === */
const activeDocId = ref(null)

async function loadByIdOrUrl() {
  const theId = idParam.value
  if (!theId) return false

  // 1) Intento directo por ID
  try {
    const snap = await getDoc(doc(db, "certificados", theId))
    if (snap.exists()) {
      cert.value = snap.data()
      activeDocId.value = theId
      return true
    }
  } catch (e) {
    console.warn("Fallo getDoc por ID:", e)
  }

  // 2) Fallback: buscar por verificar_url (caso: doc creado con otro ID)
  const candidates = [
    `${location.origin}/verificar?id=${theId}`,
    // tu dominio principal usado al crear:
    `https://xtreme-equipos.web.app/verificar?id=${theId}`,
    // dominio alternativo de Firebase (por si acaso):
    `https://xtreme-equipos.firebaseapp.com/verificar?id=${theId}`
  ]

  for (const url of candidates) {
    try {
      const qq = q(
        collection(db, "certificados"),
        where("verificar_url", "==", url),
        limit(1)
      )
      const res = await getDocs(qq)
      if (!res.empty) {
        const d = res.docs[0]
        cert.value = d.data()
        activeDocId.value = d.id // guardamos el ID real del doc
        return true
      }
    } catch (e) {
      console.warn("Fallo búsqueda por verificar_url:", e)
    }
  }

  return false
}

onMounted(async () => {
  loading.value = true
  try {
    const ok = await loadByIdOrUrl()
    if (!ok) {
      cert.value = null
      activeDocId.value = null
    }
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.verify-wrap { max-width: 760px; }
.verify-card { border-radius: 18px; overflow: hidden; background: #fff; }
.verify-hero { position: relative; padding: 22px 24px; color: #fff; }
.verify-hero.ok { background: linear-gradient(135deg, #1bb56e 0%, #0a8754 100%); }
.verify-hero.fail { background: linear-gradient(135deg, #e55353 0%, #c92a2a 100%); }
.verify-hero-content { display: flex; gap: 14px; align-items: center; }
.verify-hero .bi { font-size: 36px; opacity: .95; }
.title { font-size: 1.25rem; font-weight: 700; letter-spacing: .2px; }
.subtitle { opacity: .95; }
.status-chip {
  position: absolute; right: 16px; top: 16px;
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 10px; border-radius: 999px; font-weight: 600; font-size: .85rem;
  backdrop-filter: blur(2px); border: 1px solid rgba(255,255,255,.35); color: #fff;
}
.status-chip .bi { font-size: 1rem; }
.chip-ok { background: rgba(255,255,255,.22); }
.chip-fail { background: rgba(255,255,255,.22); }

.verify-body { padding: 20px 22px 24px; }
.loading-zone { padding: 42px 24px; display: flex; flex-direction: column; align-items: center; }

.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 18px; }
@media (max-width: 576px) { .detail-grid { grid-template-columns: 1fr; } }
.detail-item { background: #fafafa; border: 1px solid #eee; border-radius: 12px; padding: 12px 14px; }
.detail-item .label {
  font-size: .8rem; color: #6b7280; display: flex; align-items: center;
  text-transform: uppercase; letter-spacing: .4px;
}
.detail-item .value { margin-top: 4px; }
.col-span-2 { grid-column: span 2; }
@media (max-width: 576px) { .col-span-2 { grid-column: span 1; } }

.actions { display: flex; gap: 10px; flex-wrap: wrap; }
.alert { border-radius: 12px; }
.badge { font-weight: 600; letter-spacing: .2px; }
</style>
