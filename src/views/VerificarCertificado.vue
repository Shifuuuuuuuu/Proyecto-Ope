<template>
  <div class="container py-5" style="max-width: 860px;">
    <!-- Header -->
    <div class="text-center mb-4">
      <!-- Logo opcional: coloca tu archivo en /src/assets/logoXT.png y descomenta la línea -->
      <!-- <img src="@/assets/logoXT.png" alt="Xtreme Servicios" class="mb-2" style="height: 48px"> -->
      <h1 class="h4 mb-1">Verificación de Certificado</h1>
      <p class="text-muted mb-0">Escaneado desde el QR del documento</p>
    </div>

    <!-- Loader -->
    <div v-if="loading" class="d-flex justify-content-center py-5">
      <div class="spinner-border"></div>
    </div>

    <div v-else>
      <!-- Estado -->
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
            Estado:
            <span class="badge me-1" :class="ok ? 'bg-success' : 'bg-danger'">{{ estadoText }}</span>
            Aprobado:
            <span class="badge" :class="cert?.aprobado ? 'bg-success' : 'bg-danger'">
              {{ cert?.aprobado ? 'Sí' : 'No' }}
            </span>
          </div>
        </div>

        <!-- Sello “VERIFICADO Y AL DÍA” -->
        <div v-if="ok" class="verify-stamp d-none d-md-flex">
          <span>VERIFICADO</span>
          <small>AL DÍA</small>
        </div>
      </div>

      <!-- Contenido principal -->
      <div class="row g-3">
        <!-- Tarjeta detalle -->
        <div class="col-12 col-lg-7">
          <div class="card shadow-sm h-100">
            <div class="card-body">
              <h6 class="mb-3 d-flex align-items-center gap-2">
                <i class="bi bi-file-earmark-text"></i> Detalle del certificado
              </h6>
              <ul class="list-unstyled small mb-0">
                <li><strong>ID:</strong> {{ id || '—' }}</li>
                <li v-if="cert?.equipo"><strong>Equipo:</strong> {{ cert.equipo }}</li>
                <li v-if="cert?.codigo"><strong>Código interno:</strong> {{ cert.codigo }}</li>
                <li><strong>Estado:</strong> {{ cert?.estado || '—' }}</li>
                <li><strong>Aprobado:</strong> {{ cert?.aprobado ? 'Sí' : 'No' }}</li>
                <li v-if="cert?.verificar_url" class="text-break">
                  <strong>URL verificación:</strong> {{ cert.verificar_url }}
                </li>
                <li>
                  <strong>Última verificación:</strong> {{ nowHuman }}
                </li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Tarjeta QR + acciones -->
        <div class="col-12 col-lg-5">
          <div class="card shadow-sm h-100">
            <div class="card-body d-flex flex-column">
              <h6 class="mb-3 d-flex align-items-center gap-2">
                <i class="bi bi-qr-code-scan"></i> QR de verificación
              </h6>

              <div class="qr-box mx-auto mb-2">
                <img v-if="qrDataUrl" :src="qrDataUrl" alt="QR" class="qr-img" />
                <div v-if="ok" class="qr-badge">
                  <i class="bi bi-check-circle-fill me-1"></i> Verificado y al día
                </div>
                <div v-else class="qr-badge qr-badge-danger">
                  <i class="bi bi-exclamation-triangle-fill me-1"></i> No válido
                </div>
              </div>

              <p class="small text-muted text-center mb-3">
                Escanea para comprobar estado en tiempo real.
              </p>

              <div class="mt-auto d-flex flex-wrap gap-2 justify-content-center">
                <button type="button" class="btn btn-outline-secondary btn-sm" @click="imprimir">
                  <i class="bi bi-printer me-1"></i> Imprimir constancia
                </button>
                <button type="button" class="btn btn-outline-primary btn-sm" @click="compartir" :disabled="!canShare">
                  <i class="bi bi-share me-1"></i> Compartir
                </button>
                <router-link class="btn btn-light btn-sm" to="/cargar-certificado">
                  Volver
                </router-link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Aviso si no se encontró -->
      <div v-if="!cert" class="alert alert-warning mt-3">
        <i class="bi bi-info-circle me-1"></i> No se encontraron datos para este ID.
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue"
import { useRoute } from "vue-router"
import QRCode from "qrcode"
import { db } from "@/firebase/config"
import { doc, getDoc } from "firebase/firestore"

const route = useRoute()
const id = route.query.id
const loading = ref(true)
const cert = ref(null)
const qrDataUrl = ref("")

// Estado OK = vigente + aprobado
const ok = computed(() => cert.value && cert.value.estado === "vigente" && !!cert.value.aprobado)
const estadoText = computed(() => (cert.value?.estado === "vigente" ? "Vigente" : cert.value?.estado || "Desconocido"))

// Info “humana” de la verificación (hora actual local)
const nowHuman = new Date().toLocaleString()

const canShare = !!navigator.share

onMounted(async () => {
  try {
    if (id) {
      const snap = await getDoc(doc(db, "certificados", id))
      if (snap.exists()) cert.value = snap.data()
    }
    // Generar QR de la URL actual de verificación (sirve como constancia)
    const url = `${location.origin}/verificar?id=${id || ""}`
    qrDataUrl.value = await QRCode.toDataURL(url, { margin: 1, width: 380 })
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})

function imprimir() {
  window.print()
}

async function compartir() {
  try {
    const url = `${location.origin}/verificar?id=${id || ""}`
    if (navigator.share) {
      await navigator.share({
        title: "Verificación de certificado",
        text: ok.value
          ? "Certificado de mantenimiento verificado y al día."
          : "El certificado no es válido o está vencido.",
        url
      })
    }
  } catch (e) {
    // usuario canceló o no disponible
  }
}
</script>

<style scoped>
/* Banner de estado */
.bg-success-subtle { background: #eaf7ef; }
.bg-danger-subtle { background: #fdeaea; }
.border-success-subtle { border-color: #cce9d5 !important; }
.border-danger-subtle { border-color: #f5c2c7 !important; }

/* Sello “VERIFICADO Y AL DÍA” */
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
.verify-stamp span {
  font-size: 14px;
  letter-spacing: 1.2px;
}
.verify-stamp small {
  font-size: 10px;
  letter-spacing: 2px;
}

/* Caja del QR con badge */
.qr-box {
  position: relative;
  display: inline-block;
  padding: 14px;
  border-radius: 16px;
  border: 1px solid #e6e6e6;
  background: #fff;
}
.qr-img {
  width: 260px;
  height: 260px;
  display: block;
}
.qr-badge {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  bottom: -14px;
  background: #198754;
  color: #fff;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  border: 2px solid #fff;
  box-shadow: 0 4px 16px rgba(0,0,0,.08);
  white-space: nowrap;
}
.qr-badge-danger {
  background: #dc3545;
}
@media print {
  .btn, .status-banner .verify-stamp { display: none !important; }
  .qr-box { border: 0; padding: 0; }
  .qr-badge { position: static; transform: none; border: 0; box-shadow: none; margin-top: 8px; }
}
</style>
