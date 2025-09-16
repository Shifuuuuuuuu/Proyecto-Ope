<template>
  <nav class="navbar navbar-expand-lg navbar-dark bg-danger shadow-sm">
    <div class="container-fluid">
      <router-link class="navbar-brand d-flex align-items-center gap-2" to="/menu">
        <div class="logo-container">
          <img src="../img/Logo XT Servicios.png" alt="Logo" class="logo-img" />
        </div>
      </router-link>

      <button
        class="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#navbarNav"
        aria-controls="navbarNav"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <span class="navbar-toggler-icon"></span>
      </button>

      <div class="collapse navbar-collapse" id="navbarNav">
        <ul class="navbar-nav ms-auto align-items-lg-center">
          <li class="nav-item">
            <router-link class="nav-link" to="/menu">Inicio</router-link>
          </li>
          <li class="nav-item" v-if="estaLogueado">
            <router-link class="nav-link" to="/perfil">Perfil</router-link>
          </li>

          <!-- Admin solo si rol === admin -->
          <li class="nav-item" v-if="rolUsuario === 'admin'">
            <router-link class="nav-link" to="/admin">Admin</router-link>
          </li>

          <!-- NUEVO: Cargar Certificado (solo admin) -->
          <li class="nav-item" v-if="rolUsuario === 'admin'">
            <router-link class="nav-link" to="/cargar-certificado">Cargar Certificado</router-link>
          </li>

          <!-- Ingreso de equipos -->
          <li class="nav-item" v-if="puedeVerIngresoContratos">
            <router-link class="nav-link" to="/ingreso-contratos">Ingreso de Equipos</router-link>
          </li>

          <!-- Botón cerrar sesión -->
          <li class="nav-item mt-2 mt-lg-0" v-if="estaLogueado">
            <button @click="cerrarSesion" class="btn btn-outline-light ms-lg-3">Cerrar sesión</button>
          </li>

          <!-- Si NO está logueado -->
          <li class="nav-item" v-else>
            <router-link class="nav-link" to="/login">Iniciar sesión</router-link>
          </li>
        </ul>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { ref, onMounted, computed } from 'vue';
import { logoutUser } from '../firebase/auth';

const router = useRouter();
const rolUsuario = ref('');
const estaLogueado = ref(false);
const userEmail = ref('');

// Correos autorizados (case-insensitive)
const ALLOWED_INGRESO_EMAILS = [
  'sectecentral@xtrememining.cl',
  'pbustos@xtrememining.cl',
  'gcastro@xtrememining.cl',
  'tallercm@xtremeservicios.cl',
  'secteccoya@xtrememining.cl'
];

const cargarRol = async (uid) => {
  const snap = await getDoc(doc(db, 'usuarios', uid));
  rolUsuario.value = snap.exists() ? (snap.data().rol || '') : '';
};

const puedeVerIngresoContratos = computed(() => {
  if (!estaLogueado.value) return false;
  const r = (rolUsuario.value || '').toLowerCase();
  const mail = (userEmail.value || '').toLowerCase();
  if (r === 'admin' || r === 'visualizador') return true;
  if (r === 'operador' && ALLOWED_INGRESO_EMAILS.includes(mail)) return true;
  return false;
});

const cerrarSesion = async () => {
  try {
    await logoutUser();
    rolUsuario.value = '';
    estaLogueado.value = false;
    router.push('/login');
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
  }
};

onMounted(() => {
  const auth = getAuth();
  onAuthStateChanged(auth, async (user) => {
    estaLogueado.value = !!user;
    userEmail.value = user?.email || '';
    if (user) await cargarRol(user.uid);
  });
});
</script>

<style scoped>
.navbar-brand { font-size: 1.4rem; padding: 0; }
.logo-container { background-color: white; padding: 5px 10px; border-radius: 10px; box-shadow: 0 0 5px rgba(0,0,0,0.2); }
.logo-img { height: 40px; object-fit: cover; display: block; }
.nav-link { color: white !important; font-weight: 500; }
.nav-link:hover { text-decoration: underline; }
button.btn { font-weight: 500; }
</style>
