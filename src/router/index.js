// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase/config'

// Importaciones directas (las que ya tenías)
import Home from '../views/Home.vue'
import Login from '../views/Login.vue'
import Register from '../views/Register.vue'
import AdminPanel from '../views/AdminPanel.vue'
import PerfilUsuario from '../views/PerfilUsuario.vue'
import HistorialOperatividad from '../views/HistorialOperatividadView.vue'
import EquiposOperadorView from '../views/EquiposOperadorView.vue'
import IngresoEquiposView from '../views/IngresoEquiposView.vue'
const CargarCertificado = () => import('@/views/CargarCertificado.vue')
const VerificarCertificado = () => import('@/views/VerificarCertificado.vue')

// Nuevas páginas y menú PRINCIPAL (lazy)
const MenuPrincipal = () => import('@/views/MenuPrincipal.vue')
const RegistroArriendos = () => import('@/views/RegistroArriendos.vue')
const ReportesFallas = () => import('@/views/ReportesFallas.vue')
const GestorOT = () => import('@/views/GestorOT.vue')

const ALLOWED_INGRESO_EMAILS = [
  'sectecentral@xtrememining.cl',
  'pbustos@xtrememining.cl',
  'gcastro@xtrememining.cl',
  'tallercm@xtremeservicios.cl',
  'secteccoya@xtrememining.cl'
]

const routes = [
  { path: '/', name: 'Home', component: Home },

  // Menú principal
  { path: '/menu', name: 'MenuPrincipal', component: MenuPrincipal, meta: { requiresAuth: true } },

  // Auth
  { path: '/login', name: 'Login', component: Login },
  { path: '/register', name: 'Register', component: Register, meta: { requiresAuth: true, requiresAdmin: true } },

  // Perfil/Admin
  { path: '/perfil', name: 'PerfilUsuario', component: PerfilUsuario, meta: { requiresAuth: true } },
  { path: '/admin', name: 'AdminPanel', component: AdminPanel, meta: { requiresAuth: true, requiresAdmin: true } },

  // Operatividad / Historial
  { path: '/historial-operatividad', name: 'HistorialOperatividad', component: HistorialOperatividad, meta: { requiresAuth: true } },

  // Vista operador
  { path: '/mis-equipos', name: 'MisEquipos', component: EquiposOperadorView, meta: { requiresAuth: true, onlyRoles: ['operador', 'admin'] } },

  // Ingreso de contratos/equipos
  { path: '/ingreso-contratos', name: 'IngresoContratos', component: IngresoEquiposView, meta: { requiresAuth: true }, alias: ['/ingreso-equipos'] },

  // Historial de ingreso
  { path: '/historial-ingreso', name: 'HistorialIngresoEquipos', component: () => import('../views/HistorialIngresoEquiposView.vue') },

  // Estadísticas por contrato
  { path: '/estadisticas/:contratoId', name: 'ContratoStats', component: () => import('../views/ContratoStats.vue'), props: true },

  // OTs
  {
    path: '/ots/:contratoId?',
    name: 'OTsPage',
    component: () => import('@/views/OTsPage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/admin/ingresos-ots',
    name: 'AdminGestorIngresosOTs',
    component: () => import('@/views/AdminGestorIngresosOTs.vue'),
    meta: { requiresAuth: true, requiresAdmin: true }
  },

  // Registro de Arriendos
  {
    path: '/arriendos',
    name: 'RegistroArriendos',
    component: RegistroArriendos,
    meta: { requiresAuth: true }
  },

  // Reportes de Fallas
  {
    path: '/fallas',
    name: 'ReportesFallas',
    component: ReportesFallas,
    meta: { requiresAuth: true }
  },
  {
    path: '/cargar-certificado',
    name: 'CargarCertificado',
    component: CargarCertificado,
    meta: { requiresAuth: true, onlyRoles: ['admin'] }
  },
  {
    path: '/verificar',
    name: 'VerificarCertificado',
    component: VerificarCertificado
  },

  // ======= RESTRICCION CONTROL OT =======
  {
    path: '/gestor-ot',
    name: 'GestorOT',
    component: GestorOT,
    meta: { requiresAuth: true, onlyRoles: ['admin', 'visualizador'] } // <-- aquí se bloquea Operador
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

let _cachedRole = null
async function getUserRole(user) {
  if (!user) return null
  if (_cachedRole) return _cachedRole
  const snap = await getDoc(doc(db, 'usuarios', user.uid))
  _cachedRole = snap.exists() ? (snap.data().rol || null) : null
  return _cachedRole
}

// Visualizador: páginas permitidas (agrego nuevas vistas)
const ALLOWED_VISUALIZADOR = new Set([
  'Home',
  'HistorialOperatividad',
  'PerfilUsuario',
  'ContratoStats',
  'IngresoContratos',
  'OTsPage',
  'MenuPrincipal',
  'RegistroArriendos',
  'ReportesFallas',
  'GestorOT' // <-- agrega GestorOT para que su propio filtro no lo bloquee
])

router.beforeEach(async (to, from, next) => {
  const auth = getAuth()
  const user = auth.currentUser
  if (user === null) {
    await new Promise(resolve => {
      const unsub = onAuthStateChanged(auth, () => {
        unsub()
        resolve()
      })
    })
  }

  const current = auth.currentUser

  if (to.meta.requiresAuth && !current) {
    return next({ name: 'Login' })
  }

  if (current) {
    const rol = await getUserRole(current) // 'admin' | 'operador' | 'visualizador' | null
    const email = (current.email || '').toLowerCase()
    const isWhitelisted = ALLOWED_INGRESO_EMAILS.includes(email)

    // Admin-only
    if (to.meta.requiresAdmin && rol !== 'admin') {
      return next({ name: 'Home' })
    }

    // Generic role guard
    if (to.meta.onlyRoles && !to.meta.onlyRoles.includes(rol)) {
      return next({ name: 'Home' })
    }

    // Visualizador: solo páginas permitidas
    if (rol === 'visualizador') {
      if (to.name === 'Login') return next({ name: 'Home' })
      if (!ALLOWED_VISUALIZADOR.has(to.name)) {
        return next({ name: 'Home' })
      }
    }

    // Guardia específica para Ingreso-contratos
    const isIngreso =
      to.name === 'IngresoContratos' ||
      to.path === '/ingreso-contratos' ||
      to.path === '/ingreso-equipos'

    if (isIngreso) {
      if (rol === 'admin' || rol === 'visualizador' || (rol === 'operador' && isWhitelisted)) {
        return next()
      } else {
        return next({ name: 'Home' })
      }
    }
  }

  next()
})

export default router
