<!-- src/views/SubMenuOT.vue -->
<template>
  <div class="container py-5">
    <h2 class="mb-4 text-center">Menú · Control OT & Lecturas</h2>
    <div class="d-flex flex-wrap justify-content-start gap-2 mb-4">
    <button class="btn btn-outline-secondary"
            @click="$router.back()"
            title="Volver a la página anterior">
        <i class="bi bi-arrow-left-circle me-1"></i> Volver al menú
    </button>
    </div>

    <div class="row g-4 justify-content-center">
      <!-- Ver SOLO OTs -->
      <div class="col-12 col-md-6 col-lg-4">
        <div class="card menu-card h-100">
          <div class="card-body d-flex flex-column align-items-center text-center">
            <i class="bi bi-clipboard-check fs-1 mb-3"></i>
            <h5 class="card-title">Órdenes de Trabajo</h5>
            <p class="card-text text-muted">
              Visualiza y gestiona OTs con filtros de vencimiento.
            </p>
            <router-link
              :to="{ name: 'GestorOT_Ordenes', query: { view: 'ots' } }"
              class="btn btn-danger mt-auto w-100"
            >
              Abrir OTs
            </router-link>
          </div>
        </div>
      </div>

      <!-- Ver SOLO Lecturas -->
      <div class="col-12 col-md-6 col-lg-4">
        <div class="card menu-card h-100">
          <div class="card-body d-flex flex-column align-items-center text-center">
            <i class="bi bi-speedometer2 fs-1 mb-3"></i>
            <h5 class="card-title">Lecturas de Equipos</h5>
            <p class="card-text text-muted">
              Revisa atrasos y próximas tomas de lectura por contrato.
            </p>
            <router-link
              :to="{ name: 'GestorOT_Lecturas', query: { view: 'lecturas' } }"
              class="btn btn-danger mt-auto w-100"
            >
              Abrir Lecturas
            </router-link>
          </div>
        </div>
      </div>

      <!-- Ver TODO (OTs + Lecturas) -->
      <div class="col-12 col-md-6 col-lg-4">
        <div class="card menu-card h-100">
          <div class="card-body d-flex flex-column align-items-center text-center">
            <i class="bi bi-wrench-adjustable-circle fs-1 mb-3"></i>
            <h5 class="card-title">Cambio aceite motor</h5>
            <p class="card-text text-muted">
              Verifica qué equipo requiere cambio de aceite de motor.
            </p>
            <router-link
              :to="{ name: 'CambioAceiteMotor', query: { view: 'Motor' } }"
              class="btn btn-danger mt-auto w-100"
            >
              Abrir Cambio de Aceite
            </router-link>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>

</script>

<style scoped>
.menu-card {
  border-radius: 16px;
  border: 1px solid #e9ecef;
  transition: transform .12s ease, box-shadow .12s ease;
}
.menu-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0,0,0,.06);
}
.card-title { font-weight: 700; }
</style>
