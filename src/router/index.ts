import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    component: () => import('../views/Home.vue')
  },
  {
    path: '/bluetooth-setup',
    component: () => import('../views/BluetoothSetup.vue')
  },
  {
    path: '/wifi-setup',
    component: () => import('../views/WiFiSetup.vue')
  },
  {
    path: '/remote-setup',
    component: () => import('../views/RemoteSetup.vue')
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router
