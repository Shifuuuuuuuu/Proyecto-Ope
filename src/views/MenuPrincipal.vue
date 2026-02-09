<!-- src/views/MenuPrincipal.vue -->
<template>
  <div class="menu-page">
    <div class="container py-4 py-lg-5">
      <!-- Header / Hero -->
      <div class="card-body position-relative p-4 p-lg-5 d-flex align-items-center justify-content-center">
        <div class="text-center">
          <h1 class="h3 h2-lg fw-black mb-2 title-glow">Centro de Operaciones</h1>
          <p class="text-muted mb-0">Ingresa a los menus.</p>
        </div>
      </div>
      <!-- Grid -->
      <div class="row g-3 g-lg-4 justify-content-center">
        <div v-for="item in filteredMenu" :key="item.key" class="col-12 col-md-6 col-lg-4">
          <div class="card menu-card h-100 border-0 shadow-sm">
            <div class="card-body p-4 d-flex flex-column">
              <div class="d-flex align-items-start justify-content-between gap-2">
                <div class="icon-wrap" :class="item.iconClass">
                  <i :class="item.icon"></i>
                </div>

                <span v-if="item.badge" class="badge top-badge">
                  <i class="bi bi-stars me-1"></i>{{ item.badge }}
                </span>
              </div>

              <h5 class="mt-3 mb-1 fw-bold">{{ item.title }}</h5>
              <p class="text-muted mb-3">{{ item.desc }}</p>

              <div class="mt-auto d-flex gap-2">
                <router-link :to="item.to" class="btn btn-danger w-100 btn-pill">
                  <i class="bi bi-arrow-right-circle me-2"></i>
                  Abrir
                </router-link>

                <button
                  v-if="item.help"
                  type="button"
                  class="btn btn-outline-secondary btn-pill"
                  @click="openHelp(item)"
                  title="Detalles"
                >
                  <i class="bi bi-info-circle"></i>
                </button>
              </div>

              <div class="meta mt-3">
                <span class="meta-chip">
                  <i class="bi bi-tag me-1"></i>{{ item.category }}
                </span>
                <span v-if="item.restricted" class="meta-chip danger">
                  <i class="bi bi-lock me-1"></i> Restringido
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-if="filteredMenu.length === 0" class="col-12">
          <div class="card border-0 shadow-sm">
            <div class="card-body p-4 p-lg-5 text-center">
              <div class="empty-icon mb-2">
                <i class="bi bi-search"></i>
              </div>
              <h5 class="fw-bold mb-1">No encontré módulos con “{{ q }}”</h5>
              <p class="text-muted mb-3">Prueba con: equipos, fallas, OT, disponibilidad…</p>
              <button class="btn btn-outline-secondary btn-pill" @click="q = ''">
                Limpiar búsqueda
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal simple (Bootstrap) -->
    <div class="modal fade" id="menuHelpModal" tabindex="-1" aria-hidden="true" ref="helpModalEl">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow">
          <div class="modal-header">
            <h5 class="modal-title fw-bold">
              <i class="bi bi-info-circle me-2"></i>{{ helpData?.title || "Detalle" }}
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
          </div>
          <div class="modal-body">
            <p class="mb-2 text-muted">{{ helpData?.desc }}</p>
            <ul class="mb-0" v-if="helpData?.bullets?.length">
              <li v-for="(b, i) in helpData.bullets" :key="i">{{ b }}</li>
            </ul>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary btn-pill" data-bs-dismiss="modal">
              Cerrar
            </button>
            <router-link
              v-if="helpData?.to"
              :to="helpData.to"
              class="btn btn-danger btn-pill"
              data-bs-dismiss="modal"
            >
              Ir al módulo
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onBeforeUnmount } from "vue";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "@/firebase/config";
import { doc, getDoc } from "firebase/firestore";

// Modal Bootstrap (opcional)
import * as bootstrap from "bootstrap";

const rol = ref("operador");
const canSeeControlOT = ref(false);

const q = ref("");

const helpModalEl = ref(null);
let helpModal = null;

const helpData = ref(null);

onMounted(() => {
  // Roles
  const auth = getAuth();
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      rol.value = "operador";
      canSeeControlOT.value = false;
      return;
    }
    const snap = await getDoc(doc(db, "usuarios", user.uid));
    const r = (snap.exists() ? snap.data()?.rol : null) || "operador";
    rol.value = r;
    canSeeControlOT.value = r === "admin" || r === "visualizador";
  });

  // Init modal
  if (helpModalEl.value) {
    helpModal = new bootstrap.Modal(helpModalEl.value, { backdrop: true });
  }
});

onBeforeUnmount(() => {
  if (helpModal) helpModal.dispose();
  helpModal = null;
});



const menuItems = computed(() => {
  const base = [
    {
      key: "disp",
      icon: "bi bi-bar-chart-line",
      iconClass: "is-red",
      title: "Registro de Disponibilidad",
      desc: "Registra la disponibilidad operativa de los equipos asignados por contrato.",
      to: { name: "Home" },
      category: "Operación",
      badge: "Frecuente",
      help: true,
      bullets: ["Carga por contrato", "Registro diario", "Resumen por categoría"],
    },
    {
      key: "arriendos",
      icon: "bi bi-truck",
      iconClass: "is-blue",
      title: "Solicitudes de Arriendos de Equipos",
      desc: "Crea y gestiona los arriendos de equipos.",
      to: { name: "RegistroArriendos" },
      category: "Contratos",
      help: true,
      bullets: ["Crear solicitudes", "Seguimiento", "Historial"],
    },
    {
      key: "fallas",
      icon: "bi bi-exclamation-triangle",
      iconClass: "is-amber",
      title: "Reportes de Fallas de Equipos",
      desc: "Registra, edita y gestiona reportes de fallas por contrato.",
      to: { name: "ReportesFallas" },
      category: "Mantenimiento",
      badge: "Importante",
      help: true,
      bullets: ["Registrar falla", "Editar/actualizar", "Trazabilidad"],
    },
    {
      key: "buscar",
      icon: "bi bi-search",
      iconClass: "is-gray",
      title: "Buscar equipos",
      desc: "Busca equipos de todos los contratos en un solo lugar.",
      to: { name: "BuscarEquipos" },
      category: "Consulta",
      help: true,
      bullets: ["Búsqueda global", "Filtros", "Acceso rápido"],
    },
  ];

  // OT solo roles permitidos
  if (canSeeControlOT.value) {
    base.splice(3, 0, {
      key: "ot",
      icon: "bi bi-clipboard-check",
      iconClass: "is-green",
      title: "Control información de Órdenes de Trabajo",
      desc: "Gestiona y monitorea la información de Órdenes de Trabajo (OT).",
      to: { name: "SubMenuOT" },
      category: "OT",
      badge: "Restringido",
      restricted: true,
      help: true,
      bullets: ["Panel de OT", "Estados", "Monitoreo"],
    });
  }

  return base;
});

const filteredMenu = computed(() => {
  const term = (q.value || "").trim().toLowerCase();
  if (!term) return menuItems.value;

  return menuItems.value.filter((it) => {
    const haystack = `${it.title} ${it.desc} ${it.category}`.toLowerCase();
    return haystack.includes(term);
  });
});

function openHelp(item) {
  helpData.value = item;
  if (helpModal) helpModal.show();
}
</script>

<style scoped>
/* Página */
.menu-page {
  min-height: calc(100vh - 56px);
  background:
    radial-gradient(1200px 600px at 15% 10%, rgba(220, 53, 69, 0.12), transparent 60%),
    radial-gradient(900px 500px at 85% 20%, rgba(13, 110, 253, 0.10), transparent 60%),
    linear-gradient(180deg, #ffffff, #fbfbfc);
}

/* Hero */
.hero {
  position: relative;
  border-radius: 22px;
}
.hero-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(220, 53, 69, 0.14), rgba(170, 25, 40, 0.08));
}
.fw-black {
  font-weight: 900;
}
.h2-lg {
  font-size: 2rem;
}
@media (min-width: 992px) {
  .h2-lg {
    font-size: 2.25rem;
  }
}

/* ✅ Solo para que el título centrado se vea más pro */
.title-glow {
  text-shadow: 0 10px 30px rgba(220, 53, 69, 0.18);
}

.hero-badge {
  background: rgba(220, 53, 69, 0.16);
  color: #b21f2d;
  border: 1px solid rgba(220, 53, 69, 0.22);
  border-radius: 999px;
  padding: 0.45rem 0.65rem;
  font-weight: 800;
}

.role-badge {
  border-radius: 999px;
  padding: 0.45rem 0.65rem;
  font-weight: 800;
  border: 1px solid transparent;
}
.role-badge.is-admin {
  background: rgba(220, 53, 69, 0.16);
  color: #b21f2d;
  border-color: rgba(220, 53, 69, 0.22);
}
.role-badge.is-viewer {
  background: rgba(25, 135, 84, 0.14);
  color: #146c43;
  border-color: rgba(25, 135, 84, 0.22);
}
.role-badge.is-operator {
  background: rgba(13, 110, 253, 0.12);
  color: #0b5ed7;
  border-color: rgba(13, 110, 253, 0.20);
}

/* Search */
.search .input-group-text {
  background: #fff;
  border-right: 0;
}
.search .form-control {
  border-left: 0;
}
.search .form-control:focus {
  box-shadow: none;
}

/* Chips */
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.chip {
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(255, 255, 255, 0.85);
  border-radius: 999px;
  padding: 0.45rem 0.7rem;
  font-weight: 800;
  color: #212529;
  transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.12s ease;
}
.chip:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 18px rgba(0, 0, 0, 0.06);
  background: #fff;
}

/* Cards */
.menu-card {
  border-radius: 22px;
  transition: transform 0.14s ease, box-shadow 0.14s ease;
}
.menu-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.10) !important;
}

/* Icon */
.icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.35rem;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.10);
}
.icon-wrap.is-red {
  background: rgba(220, 53, 69, 0.14);
  color: #dc3545;
}
.icon-wrap.is-blue {
  background: rgba(13, 110, 253, 0.12);
  color: #0d6efd;
}
.icon-wrap.is-amber {
  background: rgba(255, 193, 7, 0.16);
  color: #b58100;
}
.icon-wrap.is-green {
  background: rgba(25, 135, 84, 0.14);
  color: #198754;
}
.icon-wrap.is-gray {
  background: rgba(108, 117, 125, 0.12);
  color: #6c757d;
}

.top-badge {
  border-radius: 999px;
  padding: 0.45rem 0.6rem;
  background: rgba(33, 37, 41, 0.06);
  color: #212529;
  border: 1px solid rgba(0, 0, 0, 0.08);
  font-weight: 800;
}

/* Buttons */
.btn-pill {
  border-radius: 999px;
  font-weight: 900;
}

/* Meta */
.meta {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.meta-chip {
  border-radius: 999px;
  padding: 0.35rem 0.55rem;
  font-weight: 800;
  font-size: 0.78rem;
  background: rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.06);
}
.meta-chip.danger {
  background: rgba(220, 53, 69, 0.10);
  border-color: rgba(220, 53, 69, 0.18);
  color: #b21f2d;
}

/* Empty */
.empty-icon {
  width: 58px;
  height: 58px;
  border-radius: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  background: rgba(13, 110, 253, 0.10);
  color: #0b5ed7;
  margin: 0 auto;
}
</style>
