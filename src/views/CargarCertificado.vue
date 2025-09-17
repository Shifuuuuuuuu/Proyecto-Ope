<template>
  <div class="container py-4">
    <!-- Header + Probar -->
    <div class="d-flex align-items-center justify-content-between mb-3">
      <h2 class="h5 mb-0">Generar certificado con QR</h2>

      <div class="d-flex align-items-center gap-2">
        <router-link v-if="lastId" class="btn btn-outline-secondary btn-sm" :to="`/verificar?id=${lastId}`">
          Probar último certificado
        </router-link>
        <button v-else class="btn btn-outline-secondary btn-sm" disabled title="Primero genera un certificado">
          Probar verificación pública
        </button>
        <button v-if="lastVerifyUrl" type="button" class="btn btn-outline-secondary btn-sm" @click="copiar(lastVerifyUrl)">
          Copiar link
        </button>
      </div>
    </div>

    <!-- Formulario -->
    <div class="card shadow-sm">
      <div class="card-body">
        <form @submit.prevent="batchMode ? procesarBatch() : procesar()">
          <div class="row g-3">
            <div class="col-12 d-flex align-items-center justify-content-between flex-wrap gap-2">
              <div class="form-check">
                <input class="form-check-input" type="checkbox" id="batchMode" v-model="batchMode" />
                <label class="form-check-label" for="batchMode">Generar varios a la vez (múltiples archivos)</label>
              </div>
              <div class="d-flex align-items-center gap-3">
                <div class="form-check">
                  <input class="form-check-input" type="checkbox" id="forceGray" v-model="forceGray" />
                  <label class="form-check-label" for="forceGray">Forzar B/N si no alcanza</label>
                </div>
                <small class="text-muted">Objetivo: <strong>≈800&nbsp;KB base64</strong> por PDF.</small>
              </div>
            </div>

            <div class="col-12">
              <label class="form-label">
                {{ batchMode ? 'Archivos de certificados (PDF o imagen, múltiples)' : 'Archivo del certificado (PDF o imagen)' }}
              </label>
              <input type="file" :multiple="batchMode" accept="application/pdf,image/*" class="form-control" @change="onFile" />
              <div class="form-text">Se incrustará un QR en la primera página (abajo a la derecha). Se guarda en base64.</div>
            </div>

            <!-- Campos base para modo simple -->
            <template v-if="!batchMode">
              <div class="col-md-6">
                <label class="form-label">Categoría</label>
                <select v-model="form.categoria" class="form-select">
                  <option value="" disabled>Selecciona categoría</option>
                  <option v-for="c in categorias" :key="c" :value="c">{{ c }}</option>
                </select>
              </div>
              <div class="col-md-6">
                <label class="form-label">Equipo (opcional)</label>
                <input v-model="form.equipo" @input="toUpper('equipo')" class="form-control" placeholder="MIXER 1234"/>
              </div>
              <div class="col-md-6">
                <label class="form-label">Código interno (opcional)</label>
                <input v-model="form.codigo" @input="toUpper('codigo')" class="form-control" placeholder="XT-0001"/>
              </div>
              <div class="col-md-6">
                <label class="form-label">Aprobado</label>
                <select v-model="form.aprobado" class="form-select">
                  <option :value="true">Sí</option>
                  <option :value="false">No</option>
                </select>
              </div>
            </template>

            <!-- Tabla de metadatos por archivo en lote -->
            <div v-if="batchMode && batchRows.length" class="col-12">
              <div class="table-responsive">
                <table class="table table-sm align-middle">
                  <thead class="table-light">
                    <tr>
                      <th style="width: 40px;">#</th>
                      <th>Archivo</th>
                      <th style="min-width: 200px;">Categoría</th>
                      <th style="min-width: 180px;">Equipo</th>
                      <th style="min-width: 140px;">Código</th>
                      <th style="min-width: 120px;">Aprobado</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(r,i) in batchRows" :key="r.key">
                      <td><span class="badge text-bg-secondary">{{ i+1 }}</span></td>
                      <td>
                        <div class="fw-semibold text-break">{{ r.fileName }}</div>
                        <div class="small text-muted">{{ humanSize(r.sizeBytes) }}</div>
                      </td>
                      <td>
                        <select class="form-select form-select-sm" v-model="r.categoria">
                          <option value="" disabled>— Seleccionar —</option>
                          <option v-for="c in categorias" :key="c" :value="c">{{ c }}</option>
                        </select>
                      </td>
                      <td><input class="form-control form-control-sm" v-model.trim="r.equipo" @input="r.equipo=r.equipo.toUpperCase()" placeholder="MIXER 1234" /></td>
                      <td><input class="form-control form-control-sm" v-model.trim="r.codigo" @input="r.codigo=r.codigo.toUpperCase()" placeholder="XT-0001" /></td>
                      <td>
                        <select class="form-select form-select-sm" v-model="r.aprobado">
                          <option :value="true">Sí</option>
                          <option :value="false">No</option>
                        </select>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <small class="text-muted">Completa categoría (obligatoria) por cada archivo.</small>
            </div>

            <!-- Botones -->
            <div class="col-12 d-flex gap-2 align-items-center">
              <button class="btn btn-primary" :disabled="btnDisabled">
                <span v-if="!loading">{{ batchMode ? 'Generar, comprimir y guardar (lote)' : 'Generar, comprimir, guardar y descargar' }}</span>
                <span v-else class="spinner-border spinner-border-sm"></span>
              </button>
              <button type="button" class="btn btn-outline-secondary" @click="limpiar" :disabled="loading">Limpiar</button>

              <div v-if="batchMode && loading" class="ms-auto small text-muted">
                Procesando {{ batchProgress.current }} / {{ batchProgress.total }}
              </div>
            </div>
          </div>
        </form>

        <hr class="my-4" />

        <!-- Vista previa (modo 1 a 1) -->
        <div v-if="!batchMode && previewUrl" class="mt-3">
          <h6 class="text-muted">Vista previa (primera página):</h6>
          <embed :src="previewUrl" type="application/pdf" class="w-100" style="height: 420px;" />
          <div class="small text-muted mt-2">
            Tamaño final aprox.: <strong>{{ humanSize(bytesFinal) }}</strong>
          </div>
        </div>

        <div v-if="!batchMode && qrDataUrl" class="mt-4">
          <h6 class="text-muted">QR generado:</h6>
          <img :src="qrDataUrl" alt="QR" style="width: 160px; height: 160px" />
          <div class="small text-break mt-2">{{ verificationUrl }}</div>
        </div>

        <!-- Resultado en lote -->
        <div v-if="batchMode && batchResults.length" class="mt-4">
          <h6 class="mb-2">Resultados del lote</h6>
          <div class="table-responsive">
            <table class="table table-sm align-middle">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Archivo</th>
                  <th>Tamaño</th>
                  <th>Estado</th>
                  <th>Verificar</th>
                  <th>Descargar</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(r, idx) in batchResults" :key="r.id">
                  <td>{{ idx + 1 }}</td>
                  <td class="text-break">{{ r.name }}</td>
                  <td>{{ humanSize(r.sizeBytes) }}</td>
                  <td>
                    <span class="badge" :class="r.ok ? 'bg-success' : 'bg-warning text-dark'">
                      {{ r.ok ? 'OK' : 'Comprimido al máximo' }}
                    </span>
                  </td>
                  <td><router-link class="btn btn-success btn-sm" :to="`/verificar?id=${r.id}`">Abrir</router-link></td>
                  <td><button class="btn btn-outline-primary btn-sm" @click="downloadBlob(r.objectUrl, r.downloadName)">Descargar</button></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="d-flex gap-2">
            <button class="btn btn-outline-secondary btn-sm" @click="copiarTodos()">Copiar todos los links</button>
          </div>
        </div>
      </div>
    </div>

    <!-- LISTA DE CERTIFICADOS -->
    <div class="card shadow-sm mt-4">
      <div class="card-body">
        <div class="d-flex align-items-center justify-content-between mb-3">
          <h5 class="h6 mb-0">Certificados</h5>
          <div class="d-flex gap-2">
            <select class="form-select form-select-sm" v-model="filtroCategoria" style="width: 220px;">
              <option value="">Todas las categorías</option>
              <option v-for="c in categorias" :key="c" :value="c">{{ c }}</option>
            </select>
            <button class="btn btn-outline-secondary btn-sm" @click="cargarCertificados" :disabled="loadingList">
              <span v-if="!loadingList">Actualizar</span>
              <span v-else class="spinner-border spinner-border-sm"></span>
            </button>
          </div>
        </div>

        <div class="table-responsive">
          <table class="table table-sm align-middle">
            <thead>
              <tr>
                <th>Archivo</th><th>Categoría</th><th>Equipo</th><th>Código</th>
                <th>Creado</th><th>Vence</th><th>Estado</th><th style="width: 220px;">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in filtrados" :key="row.id">
                <td class="text-break">{{ row.file_name || ('certificado_'+row.id+'.pdf') }}</td>
                <td>{{ row.categoria || '—' }}</td>
                <td>{{ row.equipo || '—' }}</td>
                <td>{{ row.codigo || '—' }}</td>
                <td>{{ fechaLocal(row.creado?.toDate?.() || row.creado) }}</td>
                <td>{{ fechaLocal(row.fecha_vencimiento?.toDate?.() || row.fecha_vencimiento) }}</td>
                <td>
                  <span class="badge" :class="isVigente(row) ? 'bg-success' : 'bg-danger'">{{ isVigente(row) ? 'Vigente' : 'No vigente' }}</span>
                </td>
                <td class="d-flex flex-wrap gap-1">
                  <router-link class="btn btn-success btn-sm me-1" :to="`/verificar?id=${row.id}`">Probar</router-link>
                  <button class="btn btn-outline-primary btn-sm me-1" @click="descargarBase64(row)">Descargar</button>
                  <button class="btn btn-outline-danger btn-sm" @click="eliminar(row)" :disabled="deletingId===row.id">
                    <span v-if="deletingId!==row.id">Eliminar</span>
                    <span v-else class="spinner-border spinner-border-sm"></span>
                  </button>
                </td>
              </tr>
              <tr v-if="filtrados.length===0">
                <td colspan="8" class="text-center text-muted py-3">No hay certificados para mostrar.</td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import QRCode from "qrcode"
import { v4 as uuidv4 } from "uuid"
import { PDFDocument, rgb } from "pdf-lib"
import { ref, reactive, computed, onMounted, watch } from "vue"
import { db } from "@/firebase/config"
import { doc, setDoc, serverTimestamp, getDocs, collection, query, orderBy, limit, deleteDoc } from "firebase/firestore"
import logoSrc from "@/img/Logo XT Servicios Transparente.png"

/* ===== Compresión y PDF.js ===== */
const TARGET_MAX_B64 = 800_000; // ~800 KB base64
const IMG_MAX_WIDTH = 1400;
const IMG_MIN_QUALITY = 0.36;   // un poco más agresivo
const PDFJS_MIN_CDN = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.7.76/pdf.min.js";
const PDFJS_WORKER_CDN = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.7.76/pdf.worker.min.js";

/* ===== Estado ===== */
const batchMode = ref(false)
const files = ref([])
const file = ref(null)
const loading = ref(false)
const previewUrl = ref(null)
const bytesFinal = ref(0)
const qrDataUrl = ref(null)
const verificationUrl = ref("")
const originalFileName = ref("")
const lastId = ref(null)
const lastVerifyUrl = ref("")
const forceGray = ref(false)

const batchRows = ref([]) // [{key, file, fileName, sizeBytes, categoria, equipo, codigo, aprobado}]
const batchResults = ref([])
const batchProgress = ref({ current: 0, total: 0 })

// Categorías y lista
const categorias = ref([])
const filtroCategoria = ref("")
const lista = ref([])
const loadingList = ref(false)
const deletingId = ref(null)

const form = reactive({ categoria: "", equipo: "", codigo: "", aprobado: true })

const btnDisabled = computed(() => {
  if (loading.value) return true
  if (batchMode.value) {
    if (!batchRows.value.length) return true
    return batchRows.value.some(r => !r.categoria)
  }
  return !file.value || !form.categoria
})

watch(batchMode, () => {
  files.value = []
  file.value = null
  previewUrl.value = null
  bytesFinal.value = 0
  qrDataUrl.value = null
  verificationUrl.value = ""
  batchResults.value = []
  batchRows.value = []
})

/* ===== Helpers ===== */
function toUpper(field) { form[field] = (form[field] || "").toUpperCase() }
function fechaLocal(d) { try { const dt = d instanceof Date ? d : new Date(d); return dt.toLocaleDateString() + " " + dt.toLocaleTimeString() } catch { return "—" } }
function addMonths(date, months) { const d = new Date(date); d.setMonth(d.getMonth() + months); return d }
function bytesToBase64(bytes) {
  let binary = ""; const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    const sub = bytes.subarray(i, i + chunk)
    binary += String.fromCharCode.apply(null, sub)
  }
  return btoa(binary)
}
function base64ToBlob(b64, type="application/pdf") {
  const binary = atob(b64); const len = binary.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type })
}
async function copiar(text) { try { await navigator.clipboard.writeText(text); alert("Link copiado al portapapeles.") } catch(e){ console.error(e); alert("No se pudo copiar. Copia manualmente: " + text) } }
function humanSize(n) { if (n===0) return "0 B"; if (!n) return "—"; const u=["B","KB","MB"]; let i=0, x=n; while(x>=1024&&i<u.length-1){x/=1024;i++} return `${x.toFixed(2)} ${u[i]}` }
function downloadBlob(url, filename){ const a=document.createElement("a"); a.href=url; a.download=filename; a.click(); setTimeout(()=>URL.revokeObjectURL(url),10_000) }

/* ===== Categorías / Lista ===== */
async function cargarCategorias(){ try{ const snap=await getDocs(collection(db,"categorias")); categorias.value = snap.docs.map(d => (d.data()?.nombre || "").toString()).filter(Boolean).sort() }catch{ categorias.value=[] } }
async function cargarCertificados(){ loadingList.value=true; try{ const q=query(collection(db,"certificados"), orderBy("creado","desc"), limit(100)); const snap=await getDocs(q); lista.value=snap.docs.map(d=>({id:d.id,...d.data()})) }catch(e){console.error(e)} finally{loadingList.value=false} }
const filtrados = computed(()=> lista.value.filter(r => (filtroCategoria.value ? r.categoria===filtroCategoria.value : true)))

/* ===== Input file ===== */
function onFile(e){
  if (batchMode.value){
    const arr = Array.from(e.target.files || [])
    batchRows.value = arr.map(f => ({
      key: `${Date.now()}_${f.name}_${Math.random().toString(36).slice(2,8)}`,
      file: f, fileName: f.name, sizeBytes: f.size,
      categoria: "", equipo: "", codigo: "", aprobado: true
    }))
  } else {
    file.value = e.target.files?.[0] || null
    originalFileName.value = file.value?.name || ""
  }
  previewUrl.value=null; qrDataUrl.value=null; verificationUrl.value=""; bytesFinal.value=0; batchResults.value=[]
}

/* ===== Flujo simple ===== */
function limpiar(){
  files.value=[]; file.value=null; originalFileName.value="";
  previewUrl.value=null; qrDataUrl.value=null; verificationUrl.value="";
  bytesFinal.value=0; form.categoria=""; form.equipo=""; form.codigo=""; form.aprobado=true;
  batchResults.value=[]; batchRows.value=[]
}

async function procesar(){
  if (!file.value) return
  if (!form.categoria) { alert("Selecciona una categoría."); return }
  loading.value = true
  try{
    const id = uuidv4()
    verificationUrl.value = `${location.origin}/verificar?id=${id}`
    qrDataUrl.value = await QRCode.toDataURL(verificationUrl.value, { margin:1, width:300 })

    const originalBytes = await buildPdfWithQr(file.value, qrDataUrl.value)
    const { bytes, ok } = await ensureUnderTarget(originalBytes, { grayFallback: forceGray.value })
    if (!ok) alert("⚠️ No pude bajar de ~800 KB base64; comprimí al máximo posible.")

    const blob = new Blob([bytes], { type: "application/pdf" })
    const url = URL.createObjectURL(blob)
    previewUrl.value = url
    bytesFinal.value = bytes.byteLength

    const creadoLocal = new Date()
    const venceLocal = addMonths(creadoLocal, 3)

    const b64 = bytesToBase64(new Uint8Array(bytes))
    await setDoc(doc(db,"certificados",id),{
      categoria: form.categoria || null,
      equipo: form.equipo || null,
      codigo: form.codigo || null,
      aprobado: !!form.aprobado,
      verificar_url: verificationUrl.value,
      creado: serverTimestamp(),
      creado_iso: creadoLocal.toISOString(),
      fecha_vencimiento: venceLocal.toISOString(),
      file_name: originalFileName.value || `certificado_${id}.pdf`,
      file_b64: b64,
    })

    downloadBlob(url, originalFileName.value || `certificado_${id}.pdf`)
    lastId.value = id; lastVerifyUrl.value = verificationUrl.value
    await cargarCertificados()
  }catch(err){ console.error(err); alert("Error generando/comprimiendo/guardando el PDF.") }
  finally{ loading.value=false }
}

/* ===== Flujo lote ===== */
async function procesarBatch(){
  if (!batchRows.value.length) return
  if (batchRows.value.some(r => !r.categoria)) { alert("Completa categoría en todas las filas."); return }

  loading.value = true
  batchResults.value = []
  batchProgress.value = { current:0, total: batchRows.value.length }

  try{
    for (let i=0;i<batchRows.value.length;i++){
      const r = batchRows.value[i]
      const id = uuidv4()
      const verifyUrl = `${location.origin}/verificar?id=${id}`
      const qrUrl = await QRCode.toDataURL(verifyUrl, { margin:1, width:300 })

      const basePdf = await buildPdfWithQr(r.file, qrUrl)
      const { bytes, ok } = await ensureUnderTarget(basePdf, { grayFallback: forceGray.value })

      const creadoLocal = new Date(); const venceLocal = addMonths(creadoLocal, 3)
      const b64 = bytesToBase64(new Uint8Array(bytes))

      await setDoc(doc(db,"certificados",id),{
        categoria: r.categoria || null,
        equipo: r.equipo || null,
        codigo: r.codigo || null,
        aprobado: !!r.aprobado,
        verificar_url: verifyUrl,
        creado: serverTimestamp(),
        creado_iso: creadoLocal.toISOString(),
        fecha_vencimiento: venceLocal.toISOString(),
        file_name: r.fileName || `certificado_${id}.pdf`,
        file_b64: b64,
      })

      const blob = new Blob([bytes], { type:"application/pdf" })
      const objectUrl = URL.createObjectURL(blob)
      batchResults.value.push({
        id, name: r.fileName || `certificado_${id}.pdf`,
        downloadName: r.fileName || `certificado_${id}.pdf`,
        objectUrl, sizeBytes: bytes.byteLength, ok
      })

      batchProgress.value.current = i+1
      lastId.value = id; lastVerifyUrl.value = verifyUrl
    }
    await cargarCertificados()
    alert("Listo: certificados generados y guardados.")
  }catch(e){ console.error(e); alert("Error procesando el lote.") }
  finally{ loading.value=false }
}

async function copiarTodos(){ const links = batchResults.value.map(r => `${location.origin}/verificar?id=${r.id}`).join("\n"); await copiar(links) }

/* ===== Construcción PDF + QR ===== */
async function buildPdfWithQr(fileObj, qrPngDataUrl){
  const arrayBuf = await fileObj.arrayBuffer()
  const isPdf = fileObj.type === "application/pdf" || fileObj.name?.toLowerCase().endsWith(".pdf")
  let pdfDoc, pages

  if (isPdf){
    pdfDoc = await PDFDocument.load(arrayBuf)
    pages = pdfDoc.getPages()
  } else {
    pdfDoc = await PDFDocument.create()
    const ext = (fileObj.name || "").toLowerCase()
    const img = ext.endsWith(".png") ? await pdfDoc.embedPng(arrayBuf) : await pdfDoc.embedJpg(arrayBuf)
    const scaled = fitWithin(img.width, img.height, IMG_MAX_WIDTH)
    const page = pdfDoc.addPage([scaled.w, scaled.h])
    page.drawImage(img, { x:0, y:0, width:scaled.w, height:scaled.h })
    pages = pdfDoc.getPages()
  }

  const qrBytes = await (await fetch(qrPngDataUrl)).arrayBuffer()
  const qrImg = await pdfDoc.embedPng(qrBytes)
  const logoBytes = await fetch(logoSrc).then(res => res.arrayBuffer())
  const logoImg = await pdfDoc.embedPng(logoBytes)

  const first = pages[0]
  const qrSize = 120, margin = 24
  const { width } = first.getSize()
  const x = width - qrSize - margin
  const y = margin

  const pad = 12, boxW = qrSize + pad*2, boxH = qrSize + pad*2 + 50
  first.drawRectangle({ x: x - pad, y, width: boxW, height: boxH, color: rgb(1,1,1) })
  first.drawImage(logoImg, { x, y: y + qrSize + pad + 10, width: qrSize, height: qrSize*0.25 })
  first.drawImage(qrImg,   { x, y: y + pad, width: qrSize, height: qrSize })

  return await pdfDoc.save()
}

/* ===== Compresión (adaptativa) ===== */
async function ensureUnderTarget(pdfBytes, opts = { grayFallback:false }){
  let best = pdfBytes
  let bestLen = bytesToBase64(new Uint8Array(pdfBytes)).length
  if (bestLen <= TARGET_MAX_B64) return { bytes: pdfBytes, ok: true }

  let quality = 0.78, scale = 1.0, tries = 0
  while (tries < 12){
    const rebuilt = await rasterizePdfAndRebuild(best, { scaleHint: scale, qualityStart: quality, gray: false })
    const len = bytesToBase64(new Uint8Array(rebuilt)).length
    if (len <= TARGET_MAX_B64) return { bytes: rebuilt, ok: true }
    if (len < bestLen){ best = rebuilt; bestLen = len }

    if (quality > 0.40) quality = Math.max(0.40, quality - 0.08)
    else scale = Math.max(0.40, scale * 0.90)
    tries++
  }

  // último intento: forzar escala/gray si se pidió
  if (opts.grayFallback) {
    const grayBuilt = await rasterizePdfAndRebuild(best, { scaleHint: Math.max(0.4, scale*0.9), qualityStart: Math.max(0.36, quality-0.04), gray: true })
    const lenG = bytesToBase64(new Uint8Array(grayBuilt)).length
    return { bytes: grayBuilt, ok: lenG <= TARGET_MAX_B64 }
  }
  return { bytes: best, ok: bestLen <= TARGET_MAX_B64 }
}

function fitWithin(w,h,maxW){ if (w<=maxW) return {w,h}; const s=maxW/w; return { w:Math.round(w*s), h:Math.round(h*s) } }

/* ===== PDF.js (CDN) ===== */
function loadScript(src){
  return new Promise((resolve, reject) => {
    const s = document.createElement("script")
    s.src = src
    s.async = true
    s.crossOrigin = "anonymous"
    s.onload = () => resolve()
    s.onerror = reject
    document.head.appendChild(s)
  })
}
async function getPdfJs(){
  if (window.pdfjsLib){ window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN; return window.pdfjsLib }
  await loadScript(PDFJS_MIN_CDN)
  const pdfjsLib = window.pdfjsLib
  pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN
  return pdfjsLib
}

async function rasterizePdfAndRebuild(pdfBytes, { scaleHint=1.0, qualityStart=0.8, gray=false } = {}){
  const pdfjsLib = await getPdfJs()
  const loadingTask = pdfjsLib.getDocument({ data: pdfBytes })
  const pdf = await loadingTask.promise
  const pageCount = pdf.numPages

  const canvases = []
  const MAX_LONG_SIDE = Math.floor(1200 * Math.max(0.4, Math.min(1.1, scaleHint))) // más estricto

  for (let i=1;i<=pageCount;i++){
    const page = await pdf.getPage(i)
    const scale = Math.max(0.40, Math.min(1.1, scaleHint))
    const viewport = page.getViewport({ scale })

    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d", { willReadFrequently: gray }) // optimiza si convertiremos a B/N
    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)
    await page.render({ canvasContext: ctx, viewport }).promise

    // downscale adicional por tope de lado largo
    const longSide = Math.max(canvas.width, canvas.height)
    if (longSide > MAX_LONG_SIDE){
      const factor = MAX_LONG_SIDE / longSide
      const w = Math.max(1, Math.floor(canvas.width * factor))
      const h = Math.max(1, Math.floor(canvas.height * factor))
      const tmp = document.createElement("canvas")
      tmp.width = w; tmp.height = h
      const tctx = tmp.getContext("2d")
      tctx.drawImage(canvas, 0, 0, w, h)
      if (gray) toGrayscaleInPlace(tmp)
      canvases.push(tmp)
    } else {
      if (gray) toGrayscaleInPlace(canvas)
      canvases.push(canvas)
    }
  }
  return await buildPdfFromCanvases(canvases, qualityStart)
}

// conversión a escala de grises (simple y rápida)
function toGrayscaleInPlace(canvas){
  const ctx = canvas.getContext("2d")
  const img = ctx.getImageData(0,0,canvas.width, canvas.height)
  const d = img.data
  for (let i=0;i<d.length;i+=4){
    const y = (d[i]*0.2126 + d[i+1]*0.7152 + d[i+2]*0.0722)|0
    d[i]=y; d[i+1]=y; d[i+2]=y
  }
  ctx.putImageData(img,0,0)
}

async function buildPdfFromCanvases(canvases, quality=0.8){
  const pdfDoc = await PDFDocument.create()
  const q = Math.max(IMG_MIN_QUALITY, Math.min(1, quality))
  for (const c of canvases){
    const dataUrl = c.toDataURL("image/jpeg", q)
    const resp = await fetch(dataUrl)
    const jpgBytes = await resp.arrayBuffer()
    const jpg = await pdfDoc.embedJpg(jpgBytes)
    const page = pdfDoc.addPage([c.width, c.height])
    page.drawImage(jpg, { x:0, y:0, width:c.width, height:c.height })
  }
  return await pdfDoc.save({ useObjectStreams:false })
}

/* ===== Acciones lista ===== */
function isVigente(row){ const vence = row.fecha_vencimiento?.toDate?.() || new Date(row.fecha_vencimiento); if(!vence) return false; return new Date() <= vence && !!row.aprobado }
function descargarBase64(row){ if(!row.file_b64){ alert("No hay archivo guardado en base64."); return } const blob=base64ToBlob(row.file_b64,"application/pdf"); const url=URL.createObjectURL(blob); downloadBlob(url, row.file_name || `certificado_${row.id}.pdf`) }
async function eliminar(row){
  if (!confirm(`¿Eliminar certificado ${row.file_name || row.id}?`)) return
  deletingId.value = row.id
  try{ await deleteDoc(doc(db,"certificados",row.id)); lista.value = lista.value.filter(r => r.id !== row.id) }
  catch(e){ console.error(e); alert("No se pudo eliminar.") }
  finally{ deletingId.value=null }
}

onMounted(async () => { await cargarCategorias(); await cargarCertificados() })
</script>

<style scoped>
.table td, .table th { vertical-align: middle; }
</style>
