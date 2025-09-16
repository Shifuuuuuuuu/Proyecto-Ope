<template>
  <div class="container py-4">
    <div class="d-flex align-items-center justify-content-between mb-3">
      <h2 class="h5 mb-0">Generar certificado con QR</h2>
      <router-link class="btn btn-outline-secondary btn-sm" to="/verificar">
        Probar verificación pública
      </router-link>
    </div>

    <div class="card shadow-sm">
      <div class="card-body">
        <form @submit.prevent="procesar">
          <div class="row g-3">
            <div class="col-12">
              <label class="form-label">Archivo del certificado (PDF o imagen)</label>
              <input type="file" accept="application/pdf,image/*" class="form-control" @change="onFile" />
              <div class="form-text">Se incrustará un QR en la primera página (abajo a la derecha).</div>
            </div>

            <div class="col-md-6">
              <label class="form-label">Equipo (opcional)</label>
              <input v-model="form.equipo" class="form-control" placeholder="Mixer 1234"/>
            </div>

            <div class="col-md-6">
              <label class="form-label">Código interno (opcional)</label>
              <input v-model="form.codigo" class="form-control" placeholder="XT-0001"/>
            </div>

            <div class="col-md-6">
              <label class="form-label">Estado</label>
              <select v-model="form.estado" class="form-select">
                <option value="vigente">Vigente</option>
                <option value="vencido">Vencido</option>
              </select>
            </div>

            <div class="col-md-6">
              <label class="form-label">Aprobado</label>
              <select v-model="form.aprobado" class="form-select">
                <option :value="true">Sí</option>
                <option :value="false">No</option>
              </select>
            </div>

            <div class="col-12 d-flex gap-2">
              <button class="btn btn-primary" :disabled="!file || loading">
                <span v-if="!loading">Generar QR, guardar y descargar PDF</span>
                <span v-else class="spinner-border spinner-border-sm"></span>
              </button>
              <button type="button" class="btn btn-outline-secondary" @click="limpiar" :disabled="loading">Limpiar</button>
            </div>
          </div>
        </form>

        <hr class="my-4" />

        <div v-if="previewUrl" class="mt-3">
          <h6 class="text-muted">Vista previa (primera página):</h6>
          <embed :src="previewUrl" type="application/pdf" class="w-100" style="height: 420px;" />
        </div>

        <div v-if="qrDataUrl" class="mt-4">
          <h6 class="text-muted">QR generado (para stickers si lo necesitas):</h6>
          <img :src="qrDataUrl" alt="QR" style="width: 160px; height: 160px" />
          <div class="small text-break mt-2">{{ verificationUrl }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import QRCode from "qrcode"
import { v4 as uuidv4 } from "uuid"
import { PDFDocument, rgb } from "pdf-lib"            // 👈 sin StandardFonts
import { ref, reactive } from "vue"
import { db } from "@/firebase/config"
import { doc, setDoc, serverTimestamp } from "firebase/firestore"
import logoSrc from "@/img/Logo XT Servicios Transparente.png"

const file = ref(null)
const loading = ref(false)
const previewUrl = ref(null)
const qrDataUrl = ref(null)
const verificationUrl = ref("")

const form = reactive({
  equipo: "",
  codigo: "",
  estado: "vigente",
  aprobado: true,
})

function onFile(e) {
  file.value = e.target.files?.[0] || null
  previewUrl.value = null
  qrDataUrl.value = null
  verificationUrl.value = ""
}

function limpiar() {
  file.value = null
  previewUrl.value = null
  qrDataUrl.value = null
  verificationUrl.value = ""
  form.equipo = ""
  form.codigo = ""
  form.estado = "vigente"
  form.aprobado = true
}

async function procesar() {
  if (!file.value) return
  loading.value = true
  try {
    // 1) ID y URL verificación
    const id = uuidv4()
    verificationUrl.value = `${location.origin}/verificar?id=${id}`

    // 2) QR (PNG dataURL)
    qrDataUrl.value = await QRCode.toDataURL(verificationUrl.value, { margin: 1, width: 300 })

    // 3) PDF con QR + LOGO incrustados
    const resultPdfBytes = await buildPdfWithQr(file.value, qrDataUrl.value)

    // 4) Guardar metadata en Firestore
    await setDoc(doc(db, "certificados", id), {
      equipo: form.equipo || null,
      codigo: form.codigo || null,
      estado: form.estado,         // "vigente" | "vencido"
      aprobado: !!form.aprobado,   // true | false
      verificar_url: verificationUrl.value,
      creado: serverTimestamp(),
    })

    // 5) Descargar PDF
    const blob = new Blob([resultPdfBytes], { type: "application/pdf" })
    const url = URL.createObjectURL(blob)
    downloadBlob(url, `certificado_${id}.pdf`)
    previewUrl.value = url
  } catch (err) {
    console.error(err)
    alert("Ocurrió un error generando el PDF con QR.")
  } finally {
    loading.value = false
  }
}

function downloadBlob(url, filename) {
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

async function buildPdfWithQr(fileObj, qrPngDataUrl) {
  const arrayBuf = await fileObj.arrayBuffer()
  let pdfDoc
  let pages
  const isPdf = fileObj.type === "application/pdf" || fileObj.name?.toLowerCase().endsWith(".pdf")

  if (isPdf) {
    pdfDoc = await PDFDocument.load(arrayBuf)
    pages = pdfDoc.getPages()
  } else {
    pdfDoc = await PDFDocument.create()
    const ext = (fileObj.name || "").toLowerCase()
    let img
    if (ext.endsWith(".png")) img = await pdfDoc.embedPng(arrayBuf)
    else img = await pdfDoc.embedJpg(arrayBuf)
    const page = pdfDoc.addPage([img.width, img.height])
    page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height })
    pages = pdfDoc.getPages()
  }

  // Embedir QR
  const qrBytes = await (await fetch(qrPngDataUrl)).arrayBuffer()
  const qrImg = await pdfDoc.embedPng(qrBytes)

  // Embedir LOGO (arriba del QR)
  const logoBytes = await fetch(logoSrc).then(res => res.arrayBuffer())
  const logoImg = await pdfDoc.embedPng(logoBytes)

  const first = pages[0]
  const qrSize = 120
  const margin = 24
  const { width } = first.getSize()
  const x = width - qrSize - margin
  const y = margin

  // Fondo blanco para QR + logo
  const pad = 12
  const boxW = qrSize + pad * 2
  const boxH = qrSize + pad * 2 + 50 // más alto para dejar espacio al logo
  first.drawRectangle({
    x: x - pad,
    y,
    width: boxW,
    height: boxH,
    color: rgb(1, 1, 1),
  })

  // LOGO arriba
  const logoWidth = qrSize
  const logoHeight = qrSize * 0.25
  const logoX = x
  const logoY = y + qrSize + pad + 10
  first.drawImage(logoImg, {
    x: logoX,
    y: logoY,
    width: logoWidth,
    height: logoHeight,
  })

  // QR
  const qrX = x
  const qrY = y + pad
  first.drawImage(qrImg, { x: qrX, y: qrY, width: qrSize, height: qrSize })

  return await pdfDoc.save()
}
</script>
