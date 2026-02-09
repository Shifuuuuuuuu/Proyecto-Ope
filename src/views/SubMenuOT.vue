<!-- src/views/SubMenuOT.vue -->
<template>
  <div class="submenu-ot-page">
    <div class="container py-4 py-lg-5">
      <!-- ===== Hero Header ===== -->
      <div class="hero card border-0 shadow-sm overflow-hidden mb-4">
        <div class="hero-bg"></div>

        <div class="card-body position-relative p-4 p-lg-5">
          <div class="d-flex flex-column flex-lg-row align-items-lg-end justify-content-between gap-3">
            <div class="minw-0">
              <div class="d-flex flex-wrap align-items-center gap-2 mb-2">
                <span class="badge hero-badge">
                  <i class="bi bi-clipboard-check me-1"></i> Control OT
                </span>
                <span class="badge hero-badge-alt">
                  <i class="bi bi-speedometer2 me-1"></i> Lecturas
                </span>
              </div>

              <h1 class="h3 fw-black mb-1">Menú · Control OT & Lecturas</h1>
              <p class="text-muted mb-0">
                Accesos directos a módulos de Órdenes de Trabajo, Lecturas y mantenimiento preventivo.
              </p>
            </div>

            <div class="d-flex gap-2 flex-wrap justify-content-lg-end">
              <button
                class="btn btn-outline-secondary btn-pill"
                @click="$router.back()"
                title="Volver a la página anterior"
              >
                <i class="bi bi-arrow-left-circle me-1"></i> Volver al menú
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ===== Cards ===== -->
      <div class="row g-3 g-lg-4 justify-content-center">
        <!-- OTs -->
        <div class="col-12 col-md-6 col-lg-4">
          <div class="card menu-card h-100 border-0 shadow-sm">
            <div class="card-body p-4 d-flex flex-column">
              <div class="d-flex align-items-start justify-content-between gap-2">
                <div class="icon-wrap is-red">
                  <i class="bi bi-clipboard-check"></i>
                </div>
                <span class="badge top-badge">
                  <i class="bi bi-stars me-1"></i> Principal
                </span>
              </div>

              <h5 class="mt-3 mb-1 fw-bold">Órdenes de Trabajo</h5>
              <p class="text-muted mb-3">
                Visualiza y gestiona OTs con filtros de vencimiento.
              </p>

              <div class="mt-auto d-grid gap-2">
                <router-link
                  :to="{ name: 'GestorOT_Ordenes', query: { view: 'ots' } }"
                  class="btn btn-danger btn-pill"
                >
                  <i class="bi bi-arrow-right-circle me-2"></i> Abrir OTs
                </router-link>

                <div class="meta">
                  <span class="meta-chip">
                    <i class="bi bi-funnel me-1"></i> Filtros
                  </span>
                  <span class="meta-chip">
                    <i class="bi bi-calendar2-week me-1"></i> Vencimientos
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Lecturas -->
        <div class="col-12 col-md-6 col-lg-4">
          <div class="card menu-card h-100 border-0 shadow-sm">
            <div class="card-body p-4 d-flex flex-column">
              <div class="d-flex align-items-start justify-content-between gap-2">
                <div class="icon-wrap is-blue">
                  <i class="bi bi-speedometer2"></i>
                </div>
                <span class="badge top-badge">
                  <i class="bi bi-graph-up me-1"></i> Seguimiento
                </span>
              </div>

              <h5 class="mt-3 mb-1 fw-bold">Lecturas de Equipos</h5>
              <p class="text-muted mb-3">
                Revisa atrasos y próximas tomas de lectura por contrato.
              </p>

              <div class="mt-auto d-grid gap-2">
                <router-link
                  :to="{ name: 'GestorOT_Lecturas', query: { view: 'lecturas' } }"
                  class="btn btn-danger btn-pill"
                >
                  <i class="bi bi-arrow-right-circle me-2"></i> Abrir Lecturas
                </router-link>

                <div class="meta">
                  <span class="meta-chip">
                    <i class="bi bi-exclamation-circle me-1"></i> Atrasos
                  </span>
                  <span class="meta-chip">
                    <i class="bi bi-clock-history me-1"></i> Próximas
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Cambio Aceite -->
        <div class="col-12 col-md-6 col-lg-4">
          <div class="card menu-card h-100 border-0 shadow-sm">
            <div class="card-body p-4 d-flex flex-column">
              <div class="d-flex align-items-start justify-content-between gap-2">
                <div class="icon-wrap is-amber">
                  <i class="bi bi-wrench-adjustable-circle"></i>
                </div>
                <span class="badge top-badge">
                  <i class="bi bi-shield-check me-1"></i> Preventivo
                </span>
              </div>

              <h5 class="mt-3 mb-1 fw-bold">Cambio aceite motor</h5>
              <p class="text-muted mb-3">
                Verifica qué equipo requiere cambio de aceite de motor.
              </p>

              <div class="mt-auto d-grid gap-2">
                <router-link
                  :to="{ name: 'CambioAceiteMotor', query: { view: 'Motor' } }"
                  class="btn btn-danger btn-pill"
                >
                  <i class="bi bi-arrow-right-circle me-2"></i> Abrir Cambio de Aceite
                </router-link>

                <div class="meta">
                  <span class="meta-chip">
                    <i class="bi bi-wrench me-1"></i> Mantención
                  </span>
                  <span class="meta-chip">
                    <i class="bi bi-list-check me-1"></i> Revisión
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty spacer (si quieres agregar más módulos después) -->
      </div>

      <div class="text-center text-muted small mt-4">
        <i class="bi bi-shield-check me-1"></i>
        Acceso y funcionalidades según rol (admin/visualizador).
      </div>
    </div>
  </div>
</template>

<script setup>
</script>

<style scoped>
/* ===== Page background ===== */
.submenu-ot-page {
  min-height: calc(100vh - 56px);
  background:
    radial-gradient(1200px 650px at 15% 10%, rgba(220, 53, 69, 0.12), transparent 60%),
    radial-gradient(900px 550px at 85% 20%, rgba(13, 110, 253, 0.10), transparent 60%),
    linear-gradient(180deg, #ffffff, #fbfbfc);
}

/* ===== Hero ===== */
.hero {
  position: relative;
  border-radius: 22px;
}
.hero-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(220, 53, 69, 0.14), rgba(170, 25, 40, 0.08));
}
.fw-black { font-weight: 900; }

.hero-badge {
  background: rgba(220, 53, 69, 0.16);
  color: #b21f2d;
  border: 1px solid rgba(220, 53, 69, 0.22);
  border-radius: 999px;
  padding: 0.45rem 0.65rem;
  font-weight: 900;
}
.hero-badge-alt {
  background: rgba(13, 110, 253, 0.12);
  color: #0b5ed7;
  border: 1px solid rgba(13, 110, 253, 0.20);
  border-radius: 999px;
  padding: 0.45rem 0.65rem;
  font-weight: 900;
}

/* ===== Chips ===== */
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
  font-weight: 900;
  color: #212529;
  transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.12s ease;
}
.chip:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 18px rgba(0, 0, 0, 0.06);
  background: #fff;
}

/* ===== Buttons ===== */
.btn-pill { border-radius: 999px; font-weight: 900; }

/* ===== Cards ===== */
.menu-card {
  border-radius: 22px;
  transition: transform 0.14s ease, box-shadow 0.14s ease;
}
.menu-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.10) !important;
}

/* Icon blocks */
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

.top-badge {
  border-radius: 999px;
  padding: 0.45rem 0.6rem;
  background: rgba(33, 37, 41, 0.06);
  color: #212529;
  border: 1px solid rgba(0, 0, 0, 0.08);
  font-weight: 900;
}

/* Meta chips */
.meta {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
}
.meta-chip {
  border-radius: 999px;
  padding: 0.35rem 0.55rem;
  font-weight: 900;
  font-size: 0.78rem;
  background: rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.06);
}
</style>
