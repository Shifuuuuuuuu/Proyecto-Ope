<template>
  <div class="d-flex justify-content-center align-items-center vh-100 bg-light" style="overflow: hidden;">
    <div class="card p-4 shadow text-center" style="width: 100%; max-width: 400px; margin-top: -60px;">
      <img
        src="../img/Logo XT Servicios.png"
        alt="Login Icon"
        class="mx-auto mb-3"
        style="width: 300px; height: 100px;"
      />

      <h2 class="mb-4">Iniciar Sesión</h2>

      <form @submit.prevent="handleLogin" class="text-start">
        <div class="mb-3">
          <label for="email" class="form-label">Correo Electrónico</label>
          <input
            v-model="email"
            type="email"
            class="form-control"
            id="email"
            placeholder="Ingresa tu correo"
            required
          />
        </div>

        <div class="mb-2">
          <label for="password" class="form-label">Contraseña</label>
          <div class="input-group">
            <input
              :type="showPassword ? 'text' : 'password'"
              v-model="password"
              class="form-control"
              id="password"
              placeholder="Ingresa tu contraseña"
              required
            />
            <button type="button" class="btn btn-outline-secondary" @click="showPassword = !showPassword">
              {{ showPassword ? 'Ocultar' : 'Mostrar' }}
            </button>
          </div>
        </div>

        <div class="d-flex justify-content-between align-items-center mb-3">
          <div class="form-check">
            <input class="form-check-input" type="checkbox" id="remember" v-model="remember" />
            <label class="form-check-label" for="remember">Recordar mi correo</label>
          </div>

          <button type="button" class="btn btn-link p-0" @click="resetPassword" :disabled="sendingReset">
            {{ sendingReset ? 'Enviando...' : '¿Olvidaste tu contraseña?' }}
          </button>
        </div>

        <button type="submit" class="btn btn-primary w-100" :disabled="loading">
          {{ loading ? 'Verificando...' : 'Iniciar Sesión' }}
        </button>
      </form>

      <div class="text-danger mt-2" v-if="error">{{ error }}</div>
      <div class="text-success mt-2" v-if="info">{{ info }}</div>
    </div>
  </div>
</template>

<script>
import { loginUser, sendResetPassword } from '../firebase/auth'
import { useRouter } from 'vue-router'

export default {
  name: 'LoginView',
  data() {
    return {
      email: '',
      password: '',
      remember: false,
      error: '',
      info: '',
      loading: false,
      sendingReset: false,
      showPassword: false
    }
  },
  setup() {
    const router = useRouter()
    return { router }
  },
mounted() {
  const savedEmail = localStorage.getItem('rememberEmail')
  const savedPassword = localStorage.getItem('rememberPassword')

  if (savedEmail && savedPassword) {
    this.email = savedEmail
    this.password = savedPassword
    this.remember = true
  }
},
methods: {
  async handleLogin() {
    this.error = ''
    this.info = ''
    this.loading = true
    try {
      const result = await loginUser(this.email, this.password)

      if (this.remember) {
        localStorage.setItem('rememberEmail', this.email)
        localStorage.setItem('rememberPassword', this.password) // ← guarda la contraseña
      } else {
        localStorage.removeItem('rememberEmail')
        localStorage.removeItem('rememberPassword')
      }

      if (result.rol === 'admin') {
        this.router.push('/admin')
      } else {
        this.router.push('/menu')
      }
    } catch (err) {
      const code = err?.code || ''
      if (code.includes('auth/invalid-credential') || code.includes('auth/wrong-password')) {
        this.error = 'Contraseña incorrecta.'
      } else if (code.includes('auth/user-not-found')) {
        this.error = 'Usuario no encontrado.'
      } else if (code.includes('auth/too-many-requests')) {
        this.error = 'Demasiados intentos. Intenta más tarde.'
      } else {
        this.error = 'Credenciales incorrectas o usuario no encontrado'
      }
    } finally {
      this.loading = false
    }
  },
    async resetPassword() {
      this.error = ''
      this.info = ''
      if (!this.email) {
        this.error = 'Ingresa tu correo y luego presiona "¿Olvidaste tu contraseña?"'
        return
      }
      this.sendingReset = true
      try {
        await sendResetPassword(this.email)
        this.info = 'Te enviamos un correo con instrucciones para restablecer tu contraseña.'
      } catch (err) {
        const code = err?.code || ''
        if (code.includes('auth/user-not-found')) {
          this.error = 'No existe un usuario con ese correo.'
        } else if (code.includes('auth/invalid-email')) {
          this.error = 'Correo inválido.'
        } else {
          this.error = 'No pudimos enviar el correo de recuperación. Intenta nuevamente.'
        }
      } finally {
        this.sendingReset = false
      }
    }
  }
}
</script>

<style>
html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  overflow: hidden;
}
</style>
