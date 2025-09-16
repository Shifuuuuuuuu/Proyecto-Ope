<template>
  <div class="container py-5" style="max-width: 520px;">
    <div class="card shadow-sm">
      <div class="card-body">
        <h4 class="mb-4">Cambiar contraseña</h4>

        <form @submit.prevent="onSubmit">
          <div class="mb-3">
            <label class="form-label" for="current">Contraseña actual</label>
            <input
              :type="showCurrent ? 'text' : 'password'"
              id="current"
              class="form-control"
              v-model="currentPassword"
              required
            />
            <button type="button" class="btn btn-sm btn-outline-secondary mt-2" @click="showCurrent = !showCurrent">
              {{ showCurrent ? 'Ocultar' : 'Mostrar' }}
            </button>
          </div>

          <div class="mb-3">
            <label class="form-label" for="new">Nueva contraseña</label>
            <input
              :type="showNew ? 'text' : 'password'"
              id="new"
              class="form-control"
              v-model="newPassword"
              minlength="6"
              required
            />
            <small class="text-muted">Mínimo 6 caracteres.</small>
            <div>
              <button type="button" class="btn btn-sm btn-outline-secondary mt-2" @click="showNew = !showNew">
                {{ showNew ? 'Ocultar' : 'Mostrar' }}
              </button>
            </div>
          </div>

          <div class="mb-3">
            <label class="form-label" for="confirm">Confirmar nueva contraseña</label>
            <input
              :type="showConfirm ? 'text' : 'password'"
              id="confirm"
              class="form-control"
              v-model="confirmPassword"
              minlength="6"
              required
            />
            <button type="button" class="btn btn-sm btn-outline-secondary mt-2" @click="showConfirm = !showConfirm">
              {{ showConfirm ? 'Ocultar' : 'Mostrar' }}
            </button>
          </div>

          <button class="btn btn-primary w-100" type="submit" :disabled="loading">
            {{ loading ? 'Guardando...' : 'Actualizar contraseña' }}
          </button>
        </form>

        <div class="text-danger mt-3" v-if="error">{{ error }}</div>
        <div class="text-success mt-3" v-if="success">{{ success }}</div>
      </div>
    </div>
  </div>
</template>

<script>
import { changeUserPassword } from '../firebase/auth'

export default {
  name: 'ChangePasswordView',
  data() {
    return {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      loading: false,
      error: '',
      success: '',
      showCurrent: false,
      showNew: false,
      showConfirm: false
    }
  },
  methods: {
    async onSubmit() {
      this.error = ''
      this.success = ''

      if (this.newPassword !== this.confirmPassword) {
        this.error = 'Las contraseñas nuevas no coinciden.'
        return
      }

      this.loading = true
      try {
        await changeUserPassword(this.currentPassword, this.newPassword)
        this.success = 'Tu contraseña fue actualizada correctamente.'
        this.currentPassword = ''
        this.newPassword = ''
        this.confirmPassword = ''
      } catch (err) {
        const code = err?.code || ''
        if (code.includes('auth/wrong-password') || code.includes('auth/invalid-credential')) {
          this.error = 'La contraseña actual es incorrecta.'
        } else if (code.includes('auth/requires-recent-login')) {
          this.error = 'Por seguridad, vuelve a iniciar sesión e intenta nuevamente.'
        } else {
          this.error = 'No se pudo actualizar la contraseña. Intenta más tarde.'
        }
      } finally {
        this.loading = false
      }
    }
  }
}
</script>
