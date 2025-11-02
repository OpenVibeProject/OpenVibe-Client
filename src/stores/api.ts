import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useApiStore = defineStore('api', () =>
{
    const socket = ref<WebSocket | null>(null);
});
