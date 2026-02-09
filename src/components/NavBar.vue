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
            <router-link class="nav-link xt-link" :class="isActive('/menu')" to="/menu">
              <i class="bi bi-house-door me-2"></i>
              Inicio
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
              class="nav-link xt-link dropdown-toggle"
              href="#"
              role="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <i class="bi bi-shield-lock me-2"></i>
              Admin
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
            </ul>
          </li>
        </ul>

        <!-- Right items -->
        <ul class="navbar-nav ms-auto align-items-lg-center gap-lg-2 mt-3 mt-lg-0">

          <!-- User dropdown -->
          <li class="nav-item dropdown" v-if="estaLogueado">
            <a
              class="nav-link xt-user dropdown-toggle"
              href="#"
              role="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <span class="avatar">{{ avatarInitial }}</span>
              <span class="d-none d-lg-inline">
                <span class="me-2">{{ displayNameComputed }}</span>

              </span>
            </a>

            <ul class="dropdown-menu dropdown-menu-end xt-dropdown p-2">
              <li class="px-2 py-2">
                <div class="d-flex align-items-center gap-2">
                  <span class="avatar avatar-lg">{{ avatarInitial }}</span>
                  <div class="minw-0">
                    <div class="fw-semibold text-truncate">
                      {{ displayNameComputed }}
                      <span class="badge xt-badge ms-2" :class="badgeClass">{{ rolLabel }}</span>
                    </div>
                    <div class="text-muted small text-truncate">{{ userEmail || "—" }}</div>
                  </div>
                </div>
              </li>

              <li><hr class="dropdown-divider my-2" /></li>

              <li>
                <router-link class="dropdown-item" to="/perfil">
                  <i class="bi bi-gear me-2"></i>Perfil
                </router-link>
              </li>

              <li><hr class="dropdown-divider my-2" /></li>

              <li>
                <button class="dropdown-item text-danger" @click="cerrarSesion" :disabled="loadingUser">
                  <i class="bi bi-box-arrow-right me-2"></i>
                  {{ loadingUser ? "Cerrando..." : "Cerrar sesión" }}
                </button>
              </li>
            </ul>
          </li>

          <!-- Login button -->
          <li class="nav-item" v-else>
            <router-link class="btn btn-outline-light xt-btn" to="/login">
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
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { logoutUser } from "../firebase/auth";

const router = useRouter();
const route = useRoute();

const rolUsuario = ref("");
const estaLogueado = ref(false);
const userEmail = ref("");
const displayName = ref("");
const loadingUser = ref(false);

/** Carrusel de logos (mismo porte). */
const logos = [
  new URL("../img/Logo XT Servicios.png", import.meta.url).href,
  new URL("../img/xtreme mining con fondo.jpg", import.meta.url).href,
  new URL("../img/Xtreme Hormigoenes y mortero.png", import.meta.url).href,
];

const currentIndex = ref(0);
let timerId = null;
const INTERVALO_MS = 3200;

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

onMounted(() => {
  const auth = getAuth();

  onAuthStateChanged(auth, async (user) => {
    estaLogueado.value = !!user;
    userEmail.value = user?.email || "";
    rolUsuario.value = "";
    displayName.value = "";

    if (user) {
      await cargarPerfil(user.uid);
    }
  });

  startCarousel();
});

onBeforeUnmount(() => stopCarousel());

const ALLOWED_INGRESO_EMAILS = [
  "sectecentral@xtrememining.cl",
  "pbustos@xtrememining.cl",
  "gcastro@xtrememining.cl",
  "tallercm@xtremeservicios.cl",
  "secteccoya@xtrememining.cl",
];

async function cargarPerfil(uid) {
  loadingUser.value = true;
  try {
    const snap = await getDoc(doc(db, "usuarios", uid));
    if (snap.exists()) {
      const data = snap.data() || {};
      rolUsuario.value = (data.rol || "").toString();

      // Intentos de nombre (ajusta a tu esquema real)
      displayName.value =
        data.nombre ||
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
  // Activo exacto + subrutas
  const p = route.path || "";
  return p === path || p.startsWith(path + "/") ? "active" : "";
}

async function cerrarSesion() {
  try {
    loadingUser.value = true;
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
  box-shadow: 0 10px 18px rgba(0, 0, 0, 0.18);
}

.brand-title {
  font-weight: 800;
  letter-spacing: 0.2px;
  font-size: 0.98rem;
}

.brand-subtitle {
  opacity: 0.9;
  font-size: 0.78rem;
}

/* Carrusel */
.logo-carousel {
  position: relative;
  width: 180px;
  height: 44px;
  overflow: hidden;
}

.carousel-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  opacity: 0;
  transform: scale(0.985);
  transition: opacity 0.45s ease, transform 0.45s ease;
  user-select: none;
  -webkit-user-drag: none;
}

.carousel-img.is-active {
  opacity: 1;
  transform: scale(1);
}

@media (prefers-reduced-motion: reduce) {
  .carousel-img {
    transition: none;
  }
}

/* Links como pill */
.xt-link {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.55rem 0.8rem;
  border-radius: 999px;
  color: rgba(255, 255, 255, 0.95) !important;
  font-weight: 600;
  transition: background 0.15s ease, transform 0.15s ease;
}

.xt-link:hover {
  background: rgba(255, 255, 255, 0.14);
  transform: translateY(-1px);
}

.xt-link.active {
  background: rgba(255, 255, 255, 0.22);
}

/* Dropdown */
.xt-dropdown {
  border: 0;
  border-radius: 16px;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.18);
  min-width: 280px;
}

.dropdown-item {
  border-radius: 12px;
  padding: 0.55rem 0.75rem;
}

.dropdown-item:hover {
  background: rgba(220, 53, 69, 0.1);
}

/* Usuario */
.xt-user {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.35rem 0.6rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
}

.xt-user:hover {
  background: rgba(255, 255, 255, 0.18);
}

.avatar {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  background: rgba(255, 255, 255, 0.92);
  color: rgba(170, 25, 40, 1);
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.18);
}
.avatar-lg {
  width: 42px;
  height: 42px;
}

.xt-badge {
  border-radius: 999px;
  padding: 0.35rem 0.55rem;
  font-weight: 700;
  letter-spacing: 0.2px;
}

.xt-badge.is-admin {
  background: rgba(220, 53, 69, 0.16);
  color: #b21f2d;
  border: 1px solid rgba(220, 53, 69, 0.25);
}

.xt-badge.is-operator {
  background: rgba(13, 110, 253, 0.12);
  color: #0b5ed7;
  border: 1px solid rgba(13, 110, 253, 0.22);
}

.xt-badge.is-viewer {
  background: rgba(25, 135, 84, 0.12);
  color: #146c43;
  border: 1px solid rgba(25, 135, 84, 0.22);
}

.xt-badge.is-default {
  background: rgba(108, 117, 125, 0.12);
  color: #495057;
  border: 1px solid rgba(108, 117, 125, 0.22);
}

/* Status chip */
.xt-status {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.35rem 0.6rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.92);
  font-weight: 700;
}

.xt-status .dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.6);
}

.xt-status.is-on .dot {
  background: #21d07a;
  box-shadow: 0 0 0 4px rgba(33, 208, 122, 0.15);
}
.xt-status.is-off .dot {
  background: #ffd166;
  box-shadow: 0 0 0 4px rgba(255, 209, 102, 0.15);
}

/* Login button */
.xt-btn {
  border-radius: 999px;
  padding: 0.55rem 0.95rem;
  font-weight: 800;
}

/* Mobile spacing */
@media (max-width: 991.98px) {
  .xt-link {
    width: 100%;
    justify-content: flex-start;
  }
  .xt-dropdown {
    min-width: 100%;
  }
}
</style>
