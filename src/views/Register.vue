<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="d-flex justify-content-center align-items-center vh-100 bg-light" style="overflow: hidden;">
    <div class="card p-4 shadow" style="width: 100%; max-width: 400px; margin-top: -40px;">
      <h2 class="text-center mb-4">Registro de Usuario</h2>

      <form @submit.prevent="registrar">
        <div class="mb-3">
          <label class="form-label">Nombre completo</label>
          <input
            v-model="nombreCompleto"
            type="text"
            class="form-control"
            placeholder="Juan Pérez"
            required
          />
        </div>

        <div class="mb-3">
          <label class="form-label">Email</label>
          <input
            v-model="email"
            type="email"
            class="form-control"
            placeholder="correo@ejemplo.com"
            required
          />
        </div>

        <div class="mb-3">
          <label class="form-label">Contraseña</label>
          <input
            v-model="password"
            type="password"
            class="form-control"
            placeholder="Mínimo 6 caracteres"
            required
            minlength="6"
          />
        </div>

        <div class="mb-3">
          <label class="form-label">Rol</label>
          <select v-model="rol" class="form-select" required>
            <option value="operador">Operador</option>
            <option value="admin">Administrador</option>
          </select>
        </div>

        <button :disabled="loading" type="submit" class="btn btn-primary w-100">
          {{ loading ? 'Registrando...' : 'Registrarse' }}
        </button>

        <p v-if="error" class="text-danger text-center mt-3">{{ error }}</p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { registerUser } from '../firebase/auth'

const email = ref('')
const password = ref('')
const nombreCompleto = ref('')
const rol = ref('operador')
const error = ref('')
const loading = ref(false)

const router = useRouter()

const registrar = async () => {
  error.value = ''
  loading.value = true

  try {
    await registerUser(email.value, password.value, nombreCompleto.value, rol.value)
    router.push('/')
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  overflow: hidden;
}
</style>
