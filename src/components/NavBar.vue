<!-- src/components/AppNavbar.vue -->
<template>
  <nav class="navbar navbar-expand-lg navbar-dark xt-navbar shadow-sm sticky-top">
    <div class="container-fluid px-3 px-lg-4">
      <!-- Brand -->
      <router-link class="navbar-brand d-flex align-items-center gap-3" to="/menu" title="Ir al menú">
        <div class="brand-logo">
          <div class="logo-carousel">
            <img
              v-for="(src, i) in logos"
              :key="i"
              :src="src"
              :alt="`Logo ${i + 1}`"
              class="carousel-img"
              :class="{ 'is-active': currentIndex === i }"
              draggable="false"
            />
          </div>
        </div>
      </router-link>

      <!-- Toggler -->
      <button
        class="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#appNavbar"
        aria-controls="appNavbar"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <span class="navbar-toggler-icon"></span>
      </button>

      <!-- Collapsible content -->
      <div class="collapse navbar-collapse" id="appNavbar">
        <!-- Left items -->
        <ul class="navbar-nav me-auto mt-3 mt-lg-0 gap-lg-1">
          <li class="nav-item">
            <router-link class="nav-link xt-link inicio-alert-link" :class="isActive('/menu')" to="/menu">
              <i class="bi bi-house-door me-2"></i>
              <span>Inicio</span>

              <span v-if="esAdmin && tieneArriendosPendientes" class="inicio-badge inicio-badge-blue bounce-badge" :title="`${arriendosSolicitados} arriendo(s) solicitado(s)`">
                {{ arriendosSolicitados > 99 ? "99+" : arriendosSolicitados }}
              </span>

              <span v-if="esAdmin && tieneFallasPendientes" class="inicio-badge inicio-badge-yellow bounce-badge" :title="`${fallasReportadas} falla(s) reportada(s)`">
                {{ fallasReportadas > 99 ? "99+" : fallasReportadas }}
              </span>
            </router-link>
          </li>

          <!-- Ingreso de Equipos -->
          <li class="nav-item" v-if="puedeVerIngresoContratos">
            <router-link class="nav-link xt-link" :class="isActive('/ingreso-contratos')" to="/ingreso-contratos">
              <i class="bi bi-truck-front me-2"></i>
              Ingreso de Equipos
            </router-link>
          </li>

          <!-- Admin dropdown -->
          <li class="nav-item dropdown" v-if="esAdmin">
            <a
              class="nav-link xt-link dropdown-toggle admin-alert-link"
              href="#"
              role="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <i class="bi bi-shield-lock me-2"></i>
              <span>Admin</span>

              <span
                v-if="tieneSolicitudesPendientes"
                class="admin-alert-badge bounce-badge"
                :title="`${solicitudesPendientes} solicitud(es) pendiente(s)`"
                aria-label="Solicitudes pendientes"
              >
                {{ solicitudesPendientes > 99 ? "99+" : solicitudesPendientes }}
              </span>
            </a>

            <ul class="dropdown-menu dropdown-menu-end xt-dropdown">
              <li>
                <router-link class="dropdown-item" to="/admin">
                  <i class="bi bi-speedometer2 me-2"></i> Panel Admin
                </router-link>
              </li>

              <li>
                <router-link class="dropdown-item" to="/cargar-certificado">
                  <i class="bi bi-file-earmark-arrow-up me-2"></i> Cargar Certificado
                </router-link>
              </li>

              <li>
                <router-link class="dropdown-item" to="/actividad-contratos">
                  <i class="bi bi-menu-button me-2"></i> Actividad de Contratos
                </router-link>
              </li>

              <li>
                <router-link
                  class="dropdown-item d-flex align-items-center justify-content-between gap-2"
                  to="/aprobar-solicitudes-operatividad"
                >
                  <span>
                    <i class="bi bi-card-checklist me-2"></i> Solicitudes de Cambios
                  </span>

                  <span
                    v-if="tieneSolicitudesPendientes"
                    class="dropdown-alert-pill"
                  >
                    {{ solicitudesPendientes > 99 ? "99+" : solicitudesPendientes }}
                  </span>
                </router-link>
              </li>

              <li>
                <router-link
                  class="dropdown-item d-flex align-items-center justify-content-between gap-2"
                  to="/arriendos"
                >
                  <span>
                    <i class="bi bi-truck me-2"></i> Solicitudes de Arriendo
                  </span>

                  <span
                    v-if="tieneArriendosPendientes"
                    class="dropdown-alert-pill dropdown-alert-pill-blue"
                  >
                    {{ arriendosSolicitados > 99 ? "99+" : arriendosSolicitados }}
                  </span>
                </router-link>
              </li>

              <li>
                <router-link
                  class="dropdown-item d-flex align-items-center justify-content-between gap-2"
                  to="/reportes-fallas"
                >
                  <span>
                    <i class="bi bi-exclamation-triangle me-2"></i> Reportes de Fallas
                  </span>

                  <span
                    v-if="tieneFallasPendientes"
                    class="dropdown-alert-pill dropdown-alert-pill-yellow"
                  >
                    {{ fallasReportadas > 99 ? "99+" : fallasReportadas }}
                  </span>
                </router-link>
              </li>
            </ul>
          </li>
        </ul>

        <!-- Right items -->
        <ul class="navbar-nav ms-auto align-items-lg-center gap-lg-2 mt-3 mt-lg-0">
          <!-- User dropdown -->
          <li class="nav-item dropdown" v-if="estaLogueado">
            <a
              class="nav-link dropdown-toggle xt-user-toggle"
              href="#"
              role="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <span class="avatar-circle">{{ avatarInitial }}</span>

              <span class="user-meta d-none d-md-inline-flex">
                <span class="user-name">{{ displayNameComputed }}</span>
                <span class="role-pill" :class="badgeClass">{{ rolLabel }}</span>
              </span>
            </a>

            <ul class="dropdown-menu dropdown-menu-end xt-dropdown user-menu">
              <li class="px-3 py-2 user-summary">
                <div class="fw-semibold text-truncate">{{ displayNameComputed }}</div>
                <div class="small text-muted text-truncate">{{ userEmail || "Sin correo" }}</div>
              </li>

              <li><hr class="dropdown-divider" /></li>

              <li>
                <router-link class="dropdown-item" to="/perfil">
                  <i class="bi bi-person-circle me-2"></i> Mi perfil
                </router-link>
              </li>

              <li>
                <button class="dropdown-item text-danger" @click="cerrarSesion" :disabled="loadingUser">
                  <i class="bi bi-box-arrow-right me-2"></i>
                  {{ loadingUser ? "Cerrando..." : "Cerrar sesión" }}
                </button>
              </li>
            </ul>
          </li>

          <!-- Login -->
          <li class="nav-item" v-else>
            <router-link class="btn btn-light btn-sm xt-login-btn" to="/login">
              <i class="bi bi-box-arrow-in-right me-2"></i>
              Iniciar sesión
            </router-link>
          </li>
        </ul>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useRouter, useRoute } from "vue-router";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { logoutUser } from "../firebase/auth";

/**
 * Logos del carrusel
 */
const logos = [
  new URL("../img/Logo XT Servicios.png", import.meta.url).href,
  new URL("../img/xtreme mining con fondo.jpg", import.meta.url).href,
  new URL("../img/Xtreme Hormigoenes y mortero.png", import.meta.url).href,
];

const router = useRouter();
const route = useRoute();

const estaLogueado = ref(false);
const userEmail = ref("");
const rolUsuario = ref("");
const displayName = ref("");
const loadingUser = ref(false);

const solicitudesPendientes = ref(0);
const arriendosSolicitados = ref(0);
const fallasReportadas = ref(0);

const currentIndex = ref(0);
let timerId = null;
let unsubscribeSolicitudes = null;
let unsubscribeArriendos = null;
let unsubscribeFallas = null;
let unsubscribeAuth = null;

const INTERVALO_MS = 3200;

const ALLOWED_INGRESO_EMAILS = [
  "sectecentral@xtrememining.cl",
  "pbustos@xtrememining.cl",
  "gcastro@xtrememining.cl",
  "tallercm@xtremeservicios.cl",
  "secteccoya@xtrememining.cl",
];

function startCarousel() {
  stopCarousel();
  timerId = setInterval(() => {
    currentIndex.value = (currentIndex.value + 1) % logos.length;
  }, INTERVALO_MS);
}

function stopCarousel() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
}

function detenerListenerSolicitudes() {
  if (typeof unsubscribeSolicitudes === "function") {
    unsubscribeSolicitudes();
    unsubscribeSolicitudes = null;
  }
  solicitudesPendientes.value = 0;
}

function iniciarListenerSolicitudes() {
  detenerListenerSolicitudes();

  const q = query(
    collection(db, "solicitudes_edicion_operatividad"),
    where("estado", "==", "pendiente")
  );

  unsubscribeSolicitudes = onSnapshot(
    q,
    (snapshot) => {
      solicitudesPendientes.value = snapshot.size || 0;
    },
    (error) => {
      console.error("[Navbar] Error escuchando solicitudes pendientes:", error);
      solicitudesPendientes.value = 0;
    }
  );
}

function detenerListenerArriendos() {
  if (typeof unsubscribeArriendos === "function") {
    unsubscribeArriendos();
    unsubscribeArriendos = null;
  }
  arriendosSolicitados.value = 0;
}

function iniciarListenerArriendos() {
  detenerListenerArriendos();

  const q = query(
    collection(db, "arriendos"),
    where("estatus", "==", "Solicitado")
  );

  unsubscribeArriendos = onSnapshot(
    q,
    (snapshot) => {
      arriendosSolicitados.value = snapshot.size || 0;
    },
    (error) => {
      console.error("[Navbar] Error escuchando arriendos solicitados:", error);
      arriendosSolicitados.value = 0;
    }
  );
}

function detenerListenerFallas() {
  if (typeof unsubscribeFallas === "function") {
    unsubscribeFallas();
    unsubscribeFallas = null;
  }
  fallasReportadas.value = 0;
}

function iniciarListenerFallas() {
  detenerListenerFallas();

  const q = query(
    collection(db, "reportes_fallas"),
    where("estatus", "==", "Reportado")
  );

  unsubscribeFallas = onSnapshot(
    q,
    (snapshot) => {
      fallasReportadas.value = snapshot.size || 0;
    },
    (error) => {
      console.error("[Navbar] Error escuchando reportes de fallas:", error);
      fallasReportadas.value = 0;
    }
  );
}

function detenerTodosLosListenersAlertas() {
  detenerListenerSolicitudes();
  detenerListenerArriendos();
  detenerListenerFallas();
}

function iniciarTodosLosListenersAlertas() {
  iniciarListenerSolicitudes();
  iniciarListenerArriendos();
  iniciarListenerFallas();
}

async function cargarPerfil(uid) {
  loadingUser.value = true;
  try {
    const snap = await getDoc(doc(db, "usuarios", uid));
    if (snap.exists()) {
      const data = snap.data() || {};
      rolUsuario.value = (data.rol || "").toString();

      displayName.value =
        data.nombre ||
        data.nombre_completo ||
        data.Nombre_completo ||
        data.displayName ||
        data.name ||
        "";
    }
  } catch (e) {
    console.error("[Navbar] Error cargando perfil:", e);
  } finally {
    loadingUser.value = false;
  }
}

const esAdmin = computed(() => (rolUsuario.value || "").toLowerCase() === "admin");

const puedeVerIngresoContratos = computed(() => {
  if (!estaLogueado.value) return false;

  const r = (rolUsuario.value || "").toLowerCase();
  const mail = (userEmail.value || "").toLowerCase();

  if (r === "admin" || r === "visualizador") return true;
  if (r === "operador" && ALLOWED_INGRESO_EMAILS.includes(mail)) return true;

  return false;
});

const tieneSolicitudesPendientes = computed(() => solicitudesPendientes.value > 0);
const tieneArriendosPendientes = computed(() => arriendosSolicitados.value > 0);
const tieneFallasPendientes = computed(() => fallasReportadas.value > 0);

const displayNameComputed = computed(() => {
  if (displayName.value?.trim()) return displayName.value.trim();
  if (userEmail.value) return userEmail.value.split("@")[0];
  return "Usuario";
});

const avatarInitial = computed(() => {
  const base = displayNameComputed.value || "";
  return base.trim().charAt(0).toUpperCase() || "U";
});

const rolLabel = computed(() => {
  const r = (rolUsuario.value || "").toLowerCase();
  if (!r) return "Sin rol";
  if (r === "admin") return "Admin";
  if (r === "operador") return "Operador";
  if (r === "visualizador") return "Visualizador";
  return rolUsuario.value;
});

const badgeClass = computed(() => {
  const r = (rolUsuario.value || "").toLowerCase();
  if (r === "admin") return "is-admin";
  if (r === "operador") return "is-operator";
  if (r === "visualizador") return "is-viewer";
  return "is-default";
});

function isActive(path) {
  const p = route.path || "";
  return p === path || p.startsWith(path + "/") ? "active" : "";
}

async function cerrarSesion() {
  try {
    loadingUser.value = true;
    detenerTodosLosListenersAlertas();
    await logoutUser();
    rolUsuario.value = "";
    estaLogueado.value = false;
    userEmail.value = "";
    displayName.value = "";
    router.push("/login");
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
  } finally {
    loadingUser.value = false;
  }
}

onMounted(() => {
  const auth = getAuth();

  unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
    estaLogueado.value = !!user;
    userEmail.value = user?.email || "";
    rolUsuario.value = "";
    displayName.value = "";
    detenerTodosLosListenersAlertas();

    if (user) {
      await cargarPerfil(user.uid);

      if ((rolUsuario.value || "").toLowerCase() === "admin") {
        iniciarTodosLosListenersAlertas();
      }
    }
  });

  startCarousel();
});

onBeforeUnmount(() => {
  stopCarousel();
  detenerTodosLosListenersAlertas();

  if (typeof unsubscribeAuth === "function") {
    unsubscribeAuth();
    unsubscribeAuth = null;
  }
});
</script>

<style scoped>
/* ===== Navbar base ===== */
.xt-navbar {
  background: linear-gradient(90deg, rgba(220, 53, 69, 1), rgba(170, 25, 40, 1));
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(8px);
}

/* Brand */
.navbar-brand {
  padding: 0;
  min-width: 220px;
}

.brand-logo {
  background: rgba(255, 255, 255, 0.95);
  padding: 6px 10px;
  border-radius: 14px;
  box-shadow: 0 10px 18px rgba(0, 0, 0, 0.12);
}

.logo-carousel {
  position: relative;
  width: 180px;
  height: 42px;
  overflow: hidden;
}

.carousel-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  opacity: 0;
  transform: scale(0.98);
  transition: opacity 0.5s ease, transform 0.5s ease;
}

.carousel-img.is-active {
  opacity: 1;
  transform: scale(1);
}

/* Links */
.xt-link {
  color: rgba(255, 255, 255, 0.92) !important;
  font-weight: 600;
  border-radius: 12px;
  padding: 0.72rem 0.95rem !important;
  transition: all 0.22s ease;
}

.xt-link:hover,
.xt-link.active {
  color: #fff !important;
  background: rgba(255, 255, 255, 0.14);
}

/* Inicio alert */
.inicio-alert-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: nowrap;
}

.inicio-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 800;
  line-height: 1;
  margin-left: 0.15rem;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.18);
}

.inicio-badge-blue {
  background: #0d6efd;
  color: #fff;
}

.inicio-badge-yellow {
  background: #ffc107;
  color: #212529;
}

/* Admin alert */
.admin-alert-link {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.admin-alert-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 999px;
  background: #ffc107;
  color: #212529;
  font-size: 0.72rem;
  font-weight: 800;
  line-height: 1;
  box-shadow: 0 0 0 2px rgba(255, 193, 7, 0.18);
}

.dropdown-alert-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 7px;
  border-radius: 999px;
  font-size: 0.74rem;
  font-weight: 800;
  line-height: 1;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.12);
}

.dropdown-alert-pill-blue {
  background: #0d6efd;
  color: #fff;
}

.dropdown-alert-pill-yellow {
  background: #ffc107;
  color: #212529;
}

.dropdown-alert-pill:not(.dropdown-alert-pill-blue):not(.dropdown-alert-pill-yellow) {
  background: #ffc107;
  color: #212529;
}

.bounce-badge {
  animation: badgeBounce 1.2s infinite;
  transform-origin: center;
}

@keyframes badgeBounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0) scale(1);
  }
  40% {
    transform: translateY(-4px) scale(1.08);
  }
  60% {
    transform: translateY(-2px) scale(1.03);
  }
}

@media (prefers-reduced-motion: reduce) {
  .bounce-badge {
    animation: none;
  }
}

/* User dropdown */
.xt-user-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  color: #fff !important;
  text-decoration: none;
  padding: 0.3rem 0.2rem !important;
}

.avatar-circle {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  color: #c62839;
  font-weight: 800;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.15);
}

.user-meta {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
}

.user-name {
  font-weight: 700;
  color: #fff;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.role-pill {
  font-size: 0.72rem;
  font-weight: 800;
  padding: 0.18rem 0.55rem;
  border-radius: 999px;
  letter-spacing: 0.2px;
  border: 1px solid transparent;
}

.role-pill.is-admin {
  background: rgba(255, 193, 7, 0.18);
  color: #fff3cd;
  border-color: rgba(255, 193, 7, 0.25);
}

.role-pill.is-operator {
  background: rgba(13, 202, 240, 0.18);
  color: #d1f7ff;
  border-color: rgba(13, 202, 240, 0.25);
}

.role-pill.is-viewer {
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.2);
}

.role-pill.is-default {
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.2);
}

/* Dropdown */
.xt-dropdown {
  border: none;
  border-radius: 16px;
  padding: 0.55rem;
  min-width: 265px;
  box-shadow: 0 18px 42px rgba(0, 0, 0, 0.16);
}

.xt-dropdown .dropdown-item {
  border-radius: 12px;
  padding: 0.72rem 0.85rem;
  font-weight: 600;
  transition: all 0.2s ease;
}

.xt-dropdown .dropdown-item:hover {
  background: rgba(220, 53, 69, 0.08);
  color: #b71c2b;
}

.user-summary {
  max-width: 260px;
}

/* Login button */
.xt-login-btn {
  border-radius: 12px;
  font-weight: 700;
  padding: 0.6rem 0.95rem;
}

/* Responsive */
@media (max-width: 991.98px) {
  .xt-link {
    padding-inline: 0.8rem !important;
  }

  .xt-user-toggle {
    padding-top: 0.65rem !important;
    padding-bottom: 0.35rem !important;
  }

  .user-meta {
    display: inline-flex !important;
  }

  .user-name {
    max-width: 150px;
  }
}

@media (max-width: 575.98px) {
  .navbar-brand {
    min-width: auto;
  }

  .logo-carousel {
    width: 150px;
    height: 38px;
  }

  .user-name {
    max-width: 110px;
  }

  .xt-dropdown {
    min-width: 100%;
  }

  .inicio-badge {
    min-width: 20px;
    height: 20px;
    font-size: 0.68rem;
    padding: 0 5px;
  }
}
</style>