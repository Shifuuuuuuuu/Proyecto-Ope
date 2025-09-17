<template>
  <div class="container py-5" style="max-width: 860px;">
    <div class="text-center mb-4">
      <!-- <img src="@/assets/logoXT.png" alt="Xtreme Servicios" class="mb-2" style="height: 48px"> -->
      <h1 class="h4 mb-1">Verificación de Certificado</h1>
      <p class="text-muted mb-0">Escaneado desde el QR del documento</p>
    </div>

    <div v-if="loading" class="d-flex justify-content-center py-5">
      <div class="spinner-border"></div>
    </div>

    <div v-else>
      <!-- Banner estado -->
      <div
        class="status-banner rounded-3 p-3 d-flex align-items-center gap-3 mb-3"
        :class="ok ? 'bg-success-subtle border border-success-subtle' : 'bg-danger-subtle border border-danger-subtle'"
      >
        <div
          class="rounded-circle d-flex align-items-center justify-content-center"
          :class="ok ? 'bg-success text-white' : 'bg-danger text-white'"
          style="width: 44px; height: 44px;"
        >
          <i :class="ok ? 'bi bi-check-lg fs-4' : 'bi bi-x-lg fs-4'"></i>
        </div>
        <div class="flex-grow-1">
          <div class="fw-semibold">
            <template v-if="ok">
              Certificado de mantenimiento <span class="text-success">verificado y al día</span>.
            </template>
            <template v-else>
              Este certificado <span class="text-danger">no es válido o está vencido</span>.
            </template>
          </div>
          <div class="small text-muted">
            Vigente hasta:
            <span class="badge" :class="ok ? 'bg-success' : 'bg-danger'">
              {{ venceHuman || '—' }}
            </span>
            &nbsp;|&nbsp; Aprobado:
            <span class="badge" :class="cert?.aprobado ? 'bg-success' : 'bg-danger'">
              {{ cert?.aprobado ? 'Sí' : 'No' }}
            </span>
          </div>
        </div>

        <div v-if="ok" class="verify-stamp d-none d-md-flex">
          <span>VERIFICADO</span>
          <small>AL DÍA</small>
        </div>
      </div>

      <!-- Detalle -->
      <div class="card shadow-sm mb-3">
        <div class="card-body">
          <h6 class="mb-3 d-flex align-items-center gap-2">
            <i class="bi bi-file-earmark-text"></i> Detalle del certificado
          </h6>
          <ul class="list-unstyled small mb-0">
            <li v-if="cert?.categoria"><strong>Categoría:</strong> {{ cert.categoria }}</li>
            <li v-if="cert?.equipo"><strong>Equipo:</strong> {{ cert.equipo }}</li>
            <li v-if="cert?.codigo"><strong>Código interno:</strong> {{ cert.codigo }}</li>
            <li><strong>Vence:</strong> {{ venceHuman || '—' }}</li>
            <li><strong>Última verificación:</strong> {{ nowHuman }}</li>
          </ul>
        </div>
      </div>

      <!-- Acceso al documento (solo si verificado y al día) -->
      <div v-if="ok && hasFile" class="card shadow-sm">
        <div class="card-body">
          <h6 class="mb-3 d-flex align-items-center gap-2">
            <i class="bi bi-filetype-pdf"></i> Documento verificado
          </h6>

          <div class="d-flex flex-wrap gap-2">
            <!-- Abre en nueva pestaña (URL temporal a partir de base64) -->
            <a
              v-if="pdfBlobUrl"
              class="btn btn-primary btn-sm"
              :href="pdfBlobUrl"
              target="_blank"
              rel="noopener"
              :download="(cert?.file_name || 'certificado.pdf')"
            >
              <i class="bi bi-box-arrow-up-right me-1"></i> Ver documento
            </a>

            <a
              v-if="pdfBlobUrl"
              class="btn btn-outline-primary btn-sm"
              :href="pdfBlobUrl"
              :download="(cert?.file_name || 'certificado.pdf')"
            >
              <i class="bi bi-download me-1"></i> Descargar copia
            </a>
          </div>

          <p class="small text-muted mt-3 mb-0">
            * “Ver documento” abre el PDF original en otra pestaña usando un enlace temporal.
          </p>
        </div>
      </div>

      <!-- Aviso si no se encontró -->
      <div v-if="!cert" class="alert alert-warning mt-3">
        <i class="bi bi-info-circle me-1"></i> No se encontraron datos para este código.
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onBeforeUnmount } from "vue"
import { useRoute } from "vue-router"
import { db } from "@/firebase/config"
import { doc, getDoc } from "firebase/firestore"

const route = useRoute()
const id = route.query.id // llega desde el QR
const loading = ref(true)
const cert = ref(null)

const ok = computed(() => {
  if (!cert.value) return false
  const vence = parseDate(cert.value.fecha_vencimiento)
  const hoy = new Date()
  const vigente = vence && hoy <= vence
  return vigente && !!cert.value.aprobado
})

const venceHuman = computed(() => {
  const d = parseDate(cert.value?.fecha_vencimiento)
  return d ? d.toLocaleDateString() : null
})
const nowHuman = new Date().toLocaleString()

function parseDate(v) {
  if (!v) return null
  if (v?.toDate) return v.toDate()
  try { return new Date(v) } catch { return null }
}

/* --- Construcción de Blob URL desde base64 para abrir/descargar --- */
const pdfBlobUrl = ref("")
let revokeTimer = null

const hasFile = computed(() => !!cert.value?.file_b64)

function base64ToBlob(b64, type = "application/pdf") {
  const binary = atob(b64)
  const len = binary.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type })
}

onMounted(async () => {
  try {
    if (id) {
      const snap = await getDoc(doc(db, "certificados", id))
      if (snap.exists()) {
        cert.value = snap.data()
        if (cert.value?.file_b64) {
          const blob = base64ToBlob(cert.value.file_b64)
          const url = URL.createObjectURL(blob)
          pdfBlobUrl.value = url
          // liberar enlace temporal después de 5 minutos
          revokeTimer = setTimeout(() => {
            URL.revokeObjectURL(url)
            pdfBlobUrl.value = ""
          }, 5 * 60 * 1000)
        }
      }
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(() => {
  if (pdfBlobUrl.value) URL.revokeObjectURL(pdfBlobUrl.value)
  if (revokeTimer) clearTimeout(revokeTimer)
})
</script>

<style scoped>
.bg-success-subtle { background: #eaf7ef; }
.bg-danger-subtle { background: #fdeaea; }
.border-success-subtle { border-color: #cce9d5 !important; }
.border-danger-subtle { border-color: #f5c2c7 !important; }

.verify-stamp {
  border: 2px solid #198754;
  color: #198754;
  border-radius: 999px;
  padding: 10px 16px;
  text-align: center;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  line-height: 1;
  font-weight: 700;
  min-width: 128px;
}
.verify-stamp span { font-size: 14px; letter-spacing: 1.2px; }
.verify-stamp small { font-size: 10px; letter-spacing: 2px; }
</style>
