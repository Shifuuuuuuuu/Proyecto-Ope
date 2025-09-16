<template>
  <div class="container py-5" style="max-width: 640px;">
    <div class="text-center mb-4">
      <h1 class="h4 mb-1">Verificación de certificado</h1>
      <p class="text-muted mb-0">Escaneado desde el QR del documento</p>
    </div>

    <div v-if="loading" class="d-flex justify-content-center py-5">
      <div class="spinner-border"></div>
    </div>

    <div v-else>
      <div v-if="ok" class="alert alert-success d-flex align-items-center" role="alert">
        <i class="bi bi-check-circle-fill me-2"></i>
        <div>
          <strong>Certificado de mantenimiento verificado y al día.</strong><br />
          Estado: <span class="badge bg-success">Vigente</span> — Aprobado: <span class="badge bg-success">Sí</span>
        </div>
      </div>

      <div v-else class="alert alert-danger d-flex align-items-center" role="alert">
        <i class="bi bi-x-circle-fill me-2"></i>
        <div>
          <strong>Este certificado no es válido o está vencido.</strong><br />
          Estado: <span class="badge bg-danger">{{ estadoLabel }}</span>
        </div>
      </div>

      <div v-if="cert" class="card shadow-sm mt-3">
        <div class="card-body">
          <h6 class="mb-2">Detalle</h6>
          <ul class="list-unstyled mb-0 small">
            <li><strong>ID:</strong> {{ id }}</li>
            <li v-if="cert.equipo"><strong>Equipo:</strong> {{ cert.equipo }}</li>
            <li v-if="cert.codigo"><strong>Código:</strong> {{ cert.codigo }}</li>
            <li><strong>Estado:</strong> {{ cert.estado }}</li>
            <li><strong>Aprobado:</strong> {{ cert.aprobado ? 'Sí' : 'No' }}</li>
            <li v-if="cert.verificar_url"><strong>URL:</strong> {{ cert.verificar_url }}</li>
          </ul>
        </div>
      </div>

      <div class="text-center mt-4">
        <router-link class="btn btn-outline-secondary btn-sm" to="/cargar-certificado">
          Volver a carga de certificados
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue"
import { useRoute } from "vue-router"
import { db } from "@/firebase/config"
import { doc, getDoc } from "firebase/firestore"

const route = useRoute()
const id = route.query.id
const loading = ref(true)
const cert = ref(null)

const ok = computed(() => cert.value && cert.value.estado === "vigente" && !!cert.value.aprobado)
const estadoLabel = computed(() => {
  if (!cert.value) return "No encontrado"
  if (cert.value.estado !== "vigente") return "Vencido"
  if (!cert.value.aprobado) return "No aprobado"
  return "Desconocido"
})

onMounted(async () => {
  if (!id) {
    loading.value = false
    return
  }
  try {
    const snap = await getDoc(doc(db, "certificados", id))
    if (snap.exists()) cert.value = snap.data()
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})
</script>
