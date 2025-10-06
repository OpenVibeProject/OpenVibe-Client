<script setup lang="ts">
import { IonApp, IonRouterOutlet, IonHeader, IonToolbar, IonFooter } from '@ionic/vue';
import Header from './components/Header.vue';
import Footer from './components/Footer.vue';
import DebugConsole from './components/DebugConsole.vue';
</script>

<template>
  <ion-app>
    <DebugConsole />
    <ion-header>
      <ion-toolbar>
        <Header/>
      </ion-toolbar>
    </ion-header>
    <ion-router-outlet />
    <ion-footer>
      <ion-toolbar>
        <Footer/>
      </ion-toolbar>
    </ion-footer>
  </ion-app>
</template>

<style scoped>

</style>