// src/services/otsService.js
import { db } from '@/firebase/config'
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  getDoc,
  doc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore'

/** @typedef {{stage:'reading'|'optimizing'|'uploading'|'done', pct:number, detail?:string}} ProgressEvt */

/**
 * Crea una OT.
 * - Optimiza base64 (quita espacios).
 * - Si supera umbral, guarda en subcolección /chunks (troceada).
 * - Reporta progreso con onProgress({stage,pct,detail}).
 *
 * @param {object} ot
 * @param {(e: ProgressEvt) => void} [onProgress]
 */
// eslint-disable-next-line no-unused-vars
export async function crearOT(ot, onProgress = (_e) => {}) {
  const {
    base64 = '',
    mimeType = 'application/pdf',
    sizeBytes = 0,
    ...meta
  } = ot || {}

  onProgress({ stage: 'optimizing', pct: 95, detail: 'Optimizando base64…' })

  const prefixMatch = String(base64).match(/^data:(.*?);base64,/)
  const dataPrefix = prefixMatch ? prefixMatch[0] : `data:${mimeType};base64,`
  const raw = String(base64).replace(/^data:.*?;base64,/, '')

  const optimizedRaw = raw.replace(/\s+/g, '')
  const savedChars = Math.max(0, raw.length - optimizedRaw.length)
  const savedBytesApprox = Math.round(savedChars * (3 / 4))
  if (savedBytesApprox > 0) {
    onProgress({
      stage: 'optimizing',
      pct: 97,
      detail: `Optimización ligera: -${savedBytesApprox} bytes aprox.`
    })
  }

  const BYTES_THRESHOLD = 800 * 1024         // 800 KB
  const CHARS_THRESHOLD = 900_000            // margen seguro
  const mustChunk = sizeBytes > BYTES_THRESHOLD || optimizedRaw.length > CHARS_THRESHOLD

  const otsRef = collection(db, 'ots')
  const otDoc = {
    ...meta,
    mimeType,
    createdAt: serverTimestamp(),
    createdBy: meta.createdBy || 'desconocido',
    createdByName: meta.createdByName || '',
    dataPrefix,
    isChunked: mustChunk,
  }

  if (!mustChunk) {
    onProgress({ stage: 'uploading', pct: 98, detail: 'Guardando documento…' })
    const saved = await addDoc(otsRef, { ...otDoc, base64: `${dataPrefix}${optimizedRaw}`, chunksCount: 0 })
    onProgress({ stage: 'done', pct: 100, detail: 'OT guardada.' })
    return saved
  }

  const savedMeta = await addDoc(otsRef, { ...otDoc, chunksCount: 0 })
  const chunksRef = collection(db, `ots/${savedMeta.id}/chunks`)

  const CHUNK_SIZE = 240_000
  const total = Math.ceil(optimizedRaw.length / CHUNK_SIZE)
  onProgress({ stage: 'uploading', pct: 0, detail: `Subiendo en ${total} partes…` })

  for (let i = 0; i < total; i++) {
    const part = optimizedRaw.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
    await addDoc(chunksRef, { index: i, data: part })
    const pct = Math.min(99, Math.round(((i + 1) / total) * 100))
    onProgress({ stage: 'uploading', pct, detail: `Parte ${i + 1} de ${total}…` })
  }

  onProgress({ stage: 'done', pct: 100, detail: 'OT guardada en partes.' })
  return savedMeta
}

/** Lista metadatos de OTs de un equipo (no descarga chunks). */
export async function listarOTsPorEquipo(equipoId) {
  const ref = collection(db, 'ots')
  const q = query(ref, where('equipoId', '==', equipoId), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

/** Reconstruye el DataURL si la OT está troceada. */
export async function obtenerOTDataUrl(otId) {
  const docRef = doc(db, 'ots', otId)
  const metaSnap = await getDoc(docRef)
  if (!metaSnap.exists()) return null
  const meta = metaSnap.data() || {}

  if (meta.base64) return meta.base64
  const dataPrefix = meta.dataPrefix || 'data:application/pdf;base64,'

  const chunksRef = collection(db, `ots/${otId}/chunks`)
  const q = query(chunksRef, orderBy('index', 'asc'))
  const snap = await getDocs(q)
  if (snap.empty) return null

  const joined = snap.docs.map(d => d.data()?.data || '').join('')
  return `${dataPrefix}${joined}`
}

/** Elimina una OT por id (incluye todos sus chunks si existen). */
export async function eliminarOT(otId) {
  const otRef = doc(db, 'ots', otId)
  const chunksRef = collection(db, `ots/${otId}/chunks`)
  const chunksSnap = await getDocs(chunksRef)

  if (!chunksSnap.empty) {
    let batch = writeBatch(db)
    let ops = 0
    for (const chunk of chunksSnap.docs) {
      batch.delete(chunk.ref)
      ops++
      if (ops >= 450) {
        await batch.commit()
        batch = writeBatch(db)
        ops = 0
      }
    }
    if (ops) await batch.commit()
  }

  await deleteDoc(otRef)
}
