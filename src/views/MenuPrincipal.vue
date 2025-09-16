<!-- src/views/MenuPrincipal.vue -->
<template>
  <div class="container py-5">
    <h2 class="mb-4 text-center">Menú Principal</h2>

    <div class="row g-4 justify-content-center">
      <!-- Registro de Disponibilidad -->
      <div class="col-12 col-md-6 col-lg-4">
        <div class="card menu-card h-100">
          <div class="card-body d-flex flex-column align-items-center text-center">
            <i class="bi bi-bar-chart-line fs-1 mb-3"></i>
            <h5 class="card-title">Registro de Disponibilidad</h5>
            <p class="card-text text-muted">
              Registra la disponibilidad operativa de los equipos asignados por contrato.
            </p>
            <router-link
              :to="{ name: 'Home' }"
              class="btn btn-danger mt-auto w-100"
            >
              Abrir
            </router-link>
          </div>
        </div>
      </div>

      <!-- Registro de Arriendos de Equipos -->
      <div class="col-12 col-md-6 col-lg-4">
        <div class="card menu-card h-100">
          <div class="card-body d-flex flex-column align-items-center text-center">
            <i class="bi bi-truck fs-1 mb-3"></i>
            <h5 class="card-title">Solicitudes de Arriendos de Equipos</h5>
            <p class="card-text text-muted">
              Crea y gestiona los arriendos de equipos.
            </p>
            <router-link
              :to="{ name: 'RegistroArriendos' }"
              class="btn btn-danger mt-auto w-100"
            >
              Abrir
            </router-link>
          </div>
        </div>
      </div>

      <!-- Reportes de Fallas de Equipos -->
      <div class="col-12 col-md-6 col-lg-4">
        <div class="card menu-card h-100">
          <div class="card-body d-flex flex-column align-items-center text-center">
            <i class="bi bi-exclamation-triangle fs-1 mb-3"></i>
            <h5 class="card-title">Reportes de Fallas de Equipos</h5>
            <p class="card-text text-muted">
              Registra, edita y gestiona los reportes de fallas en los equipos por contrato.
            </p>
            <router-link
              :to="{ name: 'ReportesFallas' }"
              class="btn btn-danger mt-auto w-100"
            >
              Abrir
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// sin lógica por ahora; es un menú “landing”
</script>

<style scoped>
.menu-card {
  border-radius: 16px;
  border: 1px solid #e9ecef;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}
.menu-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06);
}
.card-title {
  font-weight: 700;
}
</style>
