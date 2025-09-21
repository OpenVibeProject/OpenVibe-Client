<script setup lang="ts">
import { IonApp, IonRouterOutlet, IonHeader, IonToolbar } from '@ionic/vue';
import Header from './components/Header.vue';
</script>

<template>
  <ion-app>
    <ion-header>
      <ion-toolbar>
        <Header/>
      </ion-toolbar>
    </ion-header>
    <ion-router-outlet />
  </ion-app>
</template>

<style scoped>

</style>