<template>
  <div id="app">
    <Navbar v-if="mostrarNavbar" />
    <router-view />
  </div>
</template>

<script>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import Navbar from './components/NavBar.vue';


export default {
  name: 'App',
  components: {
    Navbar
  },
  setup() {
    const route = useRoute()
    const mostrarNavbar = computed(() => {
      return !['/login', '/register'].includes(route.path)
    })

    return {
      mostrarNavbar
    }
  }
}
</script>
<style>
html, body, #app {
  height: auto !important;
  overflow-y: auto !important;
  background-color: #fff;
}
</style>
