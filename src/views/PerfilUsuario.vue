<template>
  <div class="container py-4">
    <!-- Header -->
    <div class="d-flex align-items-center justify-content-between mb-3">
      <div class="d-flex align-items-center gap-2">
        <button class="btn btn-outline-dark" @click="volver">
          <i class="bi bi-arrow-left"></i> Volver
        </button>
        <h2 class="mb-0">Mi Perfil</h2>
      </div>
      <span v-if="usuario?.rol" class="badge rounded-pill text-bg-secondary">
        Rol: {{ (usuario.rol || '—') }}
      </span>
    </div>

    <!-- Contenido -->
    <div v-if="usuario" class="card border-0 shadow-sm">
      <!-- Encabezado: avatar + info corta -->
      <div class="card-body p-3 p-md-4">
        <div class="row g-4 align-items-center">
          <div class="col-12 col-md-auto">
            <div
              class="avatar-wrapper"
              @dragover.prevent
              @drop.prevent="onDropAvatar"
            >
              <!-- Imagen -->
              <img
                :src="previewFoto || usuario.fotoBase64 || defaultAvatar"
                class="avatar-img"
                :class="{ 'avatar-blur': subiendoFoto }"
                alt="Foto de perfil"
              />

              <!-- Overlay de carga -->
              <div v-if="subiendoFoto" class="avatar-loading">
                <div class="spinner-border spinner-border-sm mb-2"></div>
                <div class="small fw-semibold">Subiendo… {{ Math.round(progresoFoto) }}%</div>
              </div>

              <!-- Barra de herramientas inferior -->
              <div class="avatar-toolbar">
                <label class="btn btn-light btn-sm mb-0">
                  <i class="bi bi-camera"></i> Cambiar
                  <input type="file" accept="image/*" class="d-none" @change="onPickAvatar" />
                </label>
                <button
                  v-if="usuario.fotoBase64 || previewFoto"
                  class="btn btn-outline-danger btn-sm"
                  :disabled="subiendoFoto"
                  @click="quitarFoto"
                >
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </div>

            <!-- Progreso -->
            <div v-if="subiendoFoto" class="progress mt-2" style="height: 8px;">
              <div class="progress-bar" role="progressbar" :style="{ width: progresoFoto + '%' }">
                {{ Math.round(progresoFoto) }}%
              </div>
            </div>
          </div>

          <div class="col">
            <h4 class="mb-1">{{ usuario.nombre_completo || '—' }}</h4>
            <div class="text-muted">
              <i class="bi bi-envelope"></i> {{ usuario.email || '—' }}
            </div>
            <div class="small text-muted">
              <i class="bi bi-telephone"></i> {{ usuario.telefono || '—' }}
            </div>

            <div class="mt-3 d-flex gap-2">
              <button
                class="btn btn-primary"
                :disabled="guardando || subiendoFoto"
                @click="modoEdicion ? guardarCambios() : activarEdicion()"
              >
                <span v-if="modoEdicion">
                  <i class="bi bi-save"></i>
                  {{ guardando ? 'Guardando…' : 'Guardar cambios' }}
                </span>
                <span v-else>
                  <i class="bi bi-pencil"></i> Editar
                </span>
              </button>

              <button
                v-if="modoEdicion"
                class="btn btn-outline-secondary"
                :disabled="guardando || subiendoFoto"
                @click="cancelarEdicion"
              >
                <i class="bi bi-x-circle"></i> Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>

      <hr class="my-0" />

      <!-- Form -->
      <form @submit.prevent class="card-body p-3 p-md-4">
        <div class="row g-3">
          <div class="col-12">
            <label class="form-label fw-semibold">Nombre completo</label>
            <input v-model="buffer.nombre_completo" class="form-control" :disabled="!modoEdicion" required />
          </div>

          <div class="col-12 col-md-6">
            <label class="form-label fw-semibold">Email</label>
            <input v-model="buffer.email" class="form-control" disabled />
          </div>

          <div class="col-12 col-md-6">
            <label class="form-label fw-semibold">Teléfono</label>
            <input v-model="buffer.telefono" class="form-control" :disabled="!modoEdicion" />
          </div>
        </div>

        <!-- Alertas -->
        <div v-if="mensaje" class="alert alert-success mt-3 mb-0">
          <i class="bi bi-check-circle"></i> {{ mensaje }}
        </div>
        <div v-if="error" class="alert alert-danger mt-3 mb-0">
          <i class="bi bi-exclamation-triangle"></i> {{ error }}
        </div>
      </form>
    </div>

    <div v-else class="text-center text-muted">
      <div class="spinner-border text-danger"></div>
      <p class="mt-3 mb-0">Cargando datos del perfil…</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getAuth } from 'firebase/auth'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '@/firebase/config'

const router = useRouter()
const volver = () => router.back()

// Estado
const usuario = ref(null)
const buffer = ref({})
const modoEdicion = ref(false)
const guardando = ref(false)
const mensaje = ref('')
const error = ref('')

// Avatar (base64)
const subiendoFoto = ref(false)
const progresoFoto = ref(0)
const previewFoto = ref('')

const defaultAvatar =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#f2f2f2"/>
        <stop offset="100%" stop-color="#e6e6e6"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <circle cx="100" cy="80" r="40" fill="#c7c7c7"/>
    <rect x="40" y="130" width="120" height="50" rx="25" fill="#c7c7c7"/>
  </svg>`)

// Cargar perfil (lee fotoBase64)
const cargarPerfil = async () => {
  const auth = getAuth()
  const currentUser = auth.currentUser
  if (!currentUser) return

  const snap = await getDoc(doc(db, 'usuarios', currentUser.uid))
  if (!snap.exists()) {
    error.value = 'No se encontró el usuario en la base de datos.'
    return
  }
  usuario.value = { id: snap.id, ...snap.data() }
  buffer.value = {
    nombre_completo: usuario.value.nombre_completo || '',
    email: usuario.value.email || currentUser.email || '',
    telefono: usuario.value.telefono || '',
    fotoBase64: usuario.value.fotoBase64 || ''
  }
}
onMounted(() => { cargarPerfil() })

// Edición
const activarEdicion = () => { modoEdicion.value = true; mensaje.value = ''; error.value = '' }
const cancelarEdicion = () => {
  buffer.value = {
    nombre_completo: usuario.value.nombre_completo || '',
    email: usuario.value.email || '',
    telefono: usuario.value.telefono || '',
    fotoBase64: usuario.value.fotoBase64 || ''
  }
  previewFoto.value = ''
  modoEdicion.value = false
}
const guardarCambios = async () => {
  guardando.value = true; mensaje.value = ''; error.value = ''
  try {
    await updateDoc(doc(db, 'usuarios', usuario.value.id), {
      nombre_completo: buffer.value.nombre_completo,
      telefono: buffer.value.telefono || '',
      fotoBase64: buffer.value.fotoBase64 || usuario.value.fotoBase64 || ''
    })
    usuario.value = { ...usuario.value, ...buffer.value }
    mensaje.value = 'Datos actualizados correctamente.'
    modoEdicion.value = false
    previewFoto.value = ''
  } catch (e) { error.value = 'Error al guardar: ' + (e?.message || e) }
  finally { guardando.value = false }
}

// ======= Utilidades imagen/base64 =======

// Lee archivo a DataURL con progreso visual (FileReader)
function readFileAsDataURL(file, onProgress) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onprogress = (e) => {
      if (e.lengthComputable && typeof onProgress === 'function') {
        const pct = (e.loaded / e.total) * 70  // hasta 70% durante lectura
        onProgress(Math.max(5, Math.min(70, pct)))
      }
    }
    reader.onload = () => resolve(reader.result)
    reader.onerror = (e) => reject(e)
    reader.readAsDataURL(file)
  })
}

// Redimensiona/comprime usando canvas (máx 600px)
async function downscaleDataURL(dataUrl, maxSize = 600, quality = 0.82) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      let { width, height } = img
      if (width > maxSize || height > maxSize) {
        const scale = Math.min(maxSize / width, maxSize / height)
        width = Math.round(width * scale)
        height = Math.round(height * scale)
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)
      const out = canvas.toDataURL('image/jpeg', quality)
      resolve(out)
    }
    img.onerror = () => resolve(dataUrl) // fallback
    img.src = dataUrl
  })
}

function validarImagen(file) {
  const okType = /^image\/(jpeg|png|webp)$/i.test(file.type || '')
  const okSize = file.size <= 6 * 1024 * 1024 // 6MB bruto (luego se comprime)
  if (!okType) throw new Error('Formato inválido. Usa JPG, PNG o WEBP.')
  if (!okSize) throw new Error('La imagen supera 6 MB.')
}

// Subir avatar: convierte a base64 + comprime + guarda en Firestore
async function subirAvatar(file) {
  try { validarImagen(file) } catch (e) { error.value = e.message; return }

  subiendoFoto.value = true
  progresoFoto.value = 5
  mensaje.value = ''
  error.value = ''

  try {
    // 1) lectura con avance
    const rawDataUrl = await readFileAsDataURL(file, (pct) => { progresoFoto.value = pct })

    // 2) compresión/redimensión (sube al 90% de progreso)
    progresoFoto.value = Math.max(progresoFoto.value, 75)
    const compactDataUrl = await downscaleDataURL(rawDataUrl, 600, 0.82)
    progresoFoto.value = 90

    // 3) guardar en Firestore
    const auth = getAuth()
    const currentUser = auth.currentUser
    if (!currentUser) throw new Error('No autenticado.')

    // preview inmediata
    previewFoto.value = compactDataUrl

    await updateDoc(doc(db, 'usuarios', currentUser.uid), { fotoBase64: compactDataUrl })

    // reflejar estado
    buffer.value.fotoBase64 = compactDataUrl
    usuario.value.fotoBase64 = compactDataUrl

    progresoFoto.value = 100
    mensaje.value = 'Foto de perfil actualizada.'
  } catch (e) {
    console.error(e)
    error.value = 'No se pudo subir la imagen.'
  } finally {
    // ocultar overlay después de un pequeño delay
    setTimeout(() => { subiendoFoto.value = false; previewFoto.value = '' }, 600)
  }
}

// Handlers de input/drag&drop
const onPickAvatar = (evt) => {
  const file = evt.target.files?.[0]
  evt.target.value = ''
  if (file) subirAvatar(file)
}
const onDropAvatar = (e) => {
  const file = e.dataTransfer.files?.[0]
  if (file) subirAvatar(file)
}

// Quitar foto (borra base64)
async function quitarFoto() {
  if (!usuario.value) return
  const auth = getAuth()
  const currentUser = auth.currentUser
  if (!currentUser) return

  try {
    await updateDoc(doc(db, 'usuarios', currentUser.uid), { fotoBase64: '' })
    usuario.value.fotoBase64 = ''
    buffer.value.fotoBase64 = ''
    mensaje.value = 'Foto eliminada.'
  } catch (e) {
    error.value = 'No se pudo eliminar la foto.'
  }
}
</script>

<style scoped>
/* Avatar */
.avatar-wrapper {
  position: relative;
  width: 160px;
  max-width: 60vw;
}
.avatar-img {
  width: 160px;
  height: 160px;
  object-fit: cover;
  border-radius: 50%;
  border: 3px solid #f1f1f1;
  box-shadow: 0 6px 20px rgba(0,0,0,.08);
  background: #fafafa;
  transition: filter .2s ease, opacity .2s ease;
}
.avatar-blur { filter: grayscale(0.2) brightness(0.9); opacity: 0.7; }
.avatar-loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 50%, rgba(255,255,255,.3), rgba(0,0,0,.35));
  color: #fff;
  text-shadow: 0 1px 2px rgba(0,0,0,.4);
}
.avatar-toolbar {
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 8px;
  display: flex;
  gap: .5rem;
  justify-content: center;
  padding: .3rem .4rem;
  background: rgba(255,255,255,.88);
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,.08);
}

/* Form */
.card-body .form-label { margin-bottom: .25rem; }
.progress { background: #e9ecef; }
.progress-bar { font-size: 11px; font-weight: 700; }
</style>
