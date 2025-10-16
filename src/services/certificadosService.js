// src/services/certificadosService.js
import { db } from '@/firebase/config'
import {
  collection, doc, addDoc, setDoc, getDoc, getDocs, deleteDoc,
  query, orderBy, writeBatch, serverTimestamp
} from 'firebase/firestore'

/** Subimos el umbral para permitir PDFs grandes sin recomprimir (se trocean). */
export const BYTES_THRESHOLD = 1_200 * 1024; // ~1.2 MB

/** Cada chunk ~240k chars (seguro para Firestore) */
export const CHUNK_SIZE = 240_000;

/** Máx base64 antes de trocear (~1.6MB base64 aprox). */
const CHARS_THRESHOLD = 1_600_000;

function normalizeBase64(inputBase64, mimeType = 'application/pdf') {
  const prefixMatch = String(inputBase64).match(/^data:(.*?);base64,/)
  const dataPrefix = prefixMatch ? prefixMatch[0] : `data:${mimeType};base64,`
  const raw = String(inputBase64).replace(/^data:.*?;base64,/, '')
  return { dataPrefix, raw }
}
function shouldChunk({ sizeBytes = 0, rawLen = 0, preferirChunks = false }) {
  if (preferirChunks && sizeBytes > 0) return true
  if (sizeBytes > BYTES_THRESHOLD) return true
  return rawLen > CHARS_THRESHOLD
}

export async function crearCertificado(params, meta = {}, onProgress = () => {}) {
  const {
    base64 = '',
    mimeType = 'application/pdf',
    sizeBytes = 0,
    preferirChunks = false,
  } = params || {}

  onProgress({ stage: 'optimizing', pct: 5, detail: 'Optimizando base64…' })

  const { dataPrefix, raw } = normalizeBase64(base64, mimeType)
  const optimizedRaw = raw.replace(/\s+/g, '')
  const savedChars = Math.max(0, raw.length - optimizedRaw.length)
  if (savedChars > 0) {
    onProgress({ stage: 'optimizing', pct: 12, detail: `- ${Math.round(savedChars * (3/4))} bytes aprox.` })
  }

  const mustChunk = shouldChunk({ sizeBytes, rawLen: optimizedRaw.length, preferirChunks })

  const colRef = collection(db, 'certificados')
  const metaDoc = { ...meta, mimeType, dataPrefix, isChunked: mustChunk, chunksCount: 0, creado: serverTimestamp() }

  if (!mustChunk) {
    onProgress({ stage: 'uploading', pct: 70, detail: 'Guardando documento completo…' })
    const saved = await addDoc(colRef, { ...metaDoc, file_b64: `${dataPrefix}${optimizedRaw}` })
    onProgress({ stage: 'done', pct: 100, detail: 'Certificado guardado.' })
    return { id: saved.id }
  }

  const savedMeta = await addDoc(colRef, metaDoc)
  const chunksRef = collection(db, `certificados/${savedMeta.id}/chunks`)

  const total = Math.ceil(optimizedRaw.length / CHUNK_SIZE)
  onProgress({ stage: 'uploading', pct: 15, detail: `Subiendo en ${total} partes…` })

  for (let i = 0; i < total; i++) {
    const part = optimizedRaw.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
    await addDoc(chunksRef, { index: i, data: part })
    const pct = Math.min(99, 15 + Math.round(((i + 1) / total) * 80))
    onProgress({ stage: 'uploading', pct, detail: `Parte ${i + 1} de ${total}…` })
  }
  await setDoc(doc(db, 'certificados', savedMeta.id), { chunksCount: total }, { merge: true })

  onProgress({ stage: 'done', pct: 100, detail: 'Certificado guardado en partes.' })
  return { id: savedMeta.id }
}

export async function obtenerCertificadoDataUrl(id) {
  const ref = doc(db, 'certificados', id)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  const meta = snap.data() || {}

  if (meta.file_b64) return meta.file_b64

  const dataPrefix = meta.dataPrefix || `data:${meta.mimeType || 'application/pdf'};base64,`
  const chunksRef = collection(db, `certificados/${id}/chunks`)
  const q = query(chunksRef, orderBy('index', 'asc'))
  const cr = await getDocs(q)
  if (cr.empty) return null
  const joined = cr.docs.map(d => d.data()?.data || '').join('')
  return `${dataPrefix}${joined}`
}

export async function listarCertificados(limitN = 100) {
  const ref = collection(db, 'certificados')
  const q = query(ref, orderBy('creado', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.slice(0, limitN).map(d => ({ id: d.id, ...d.data() }))
}

export async function eliminarCertificado(id) {
  const ref = doc(db, 'certificados', id)
  const chunksRef = collection(db, `certificados/${id}/chunks`)
  const chunksSnap = await getDocs(chunksRef)

  if (!chunksSnap.empty) {
    let batch = writeBatch(db)
    let ops = 0
    for (const ch of chunksSnap.docs) {
      batch.delete(ch.ref); ops++
      if (ops >= 450) { await batch.commit(); batch = writeBatch(db); ops = 0 }
    }
    if (ops) await batch.commit()
  }
  await deleteDoc(ref)
}

export async function actualizarMetadatos(id, patch = {}) {
  await setDoc(doc(db, 'certificados', id), { ...patch, actualizado: serverTimestamp() }, { merge: true })
}

export async function reemplazarArchivo(
  id,
  { base64, mimeType = 'application/pdf', sizeBytes = 0, preferirChunks = false },
  onProgress = () => {}
) {
  const ref = doc(db, 'certificados', id)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('Certificado no existe')

  await setDoc(ref, { file_b64: null, isChunked: false, chunksCount: 0 }, { merge: true })
  const chunksRef = collection(db, `certificados/${id}/chunks`)
  const chunksSnap = await getDocs(chunksRef)
  if (!chunksSnap.empty) {
    let batch = writeBatch(db)
    let ops = 0
    for (const ch of chunksSnap.docs) {
      batch.delete(ch.ref); ops++
      if (ops >= 450) { await batch.commit(); batch = writeBatch(db); ops = 0 }
    }
    if (ops) await batch.commit()
  }

  const { dataPrefix, raw } = normalizeBase64(base64, mimeType)
  const optimizedRaw = raw.replace(/\s+/g, '')
  const mustChunk = shouldChunk({ sizeBytes, rawLen: optimizedRaw.length, preferirChunks })

  await setDoc(ref, { mimeType, dataPrefix, isChunked: mustChunk, chunksCount: 0 }, { merge: true })

  if (!mustChunk) {
    onProgress({ stage: 'uploading', pct: 70, detail: 'Guardando archivo (reemplazo)…' })
    await setDoc(ref, { file_b64: `${dataPrefix}${optimizedRaw}` }, { merge: true })
    onProgress({ stage: 'done', pct: 100, detail: 'Archivo reemplazado.' })
    return
  }

  const chunksRef2 = collection(db, `certificados/${id}/chunks`)
  const total = Math.ceil(optimizedRaw.length / CHUNK_SIZE)
  onProgress({ stage: 'uploading', pct: 15, detail: `Subiendo en ${total} partes…` })
  for (let i = 0; i < total; i++) {
    const part = optimizedRaw.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
    await addDoc(chunksRef2, { index: i, data: part })
    const pct = Math.min(99, 15 + Math.round(((i + 1) / total) * 80))
    onProgress({ stage: 'uploading', pct, detail: `Parte ${i + 1} de ${total}…` })
  }
  await setDoc(ref, { chunksCount: total }, { merge: true })
  onProgress({ stage: 'done', pct: 100, detail: 'Archivo reemplazado (troceado).' })
}
