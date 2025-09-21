<script setup lang="ts">
import { IonApp, IonRouterOutlet } from '@ionic/vue';
import Header from './components/Header.vue'
</script>

<template>
  <Header/>
  <ion-app>
    <ion-router-outlet />
  </ion-app>
</template>