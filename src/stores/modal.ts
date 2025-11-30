import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useModalStore = defineStore('modal', () => {
  const openModals = ref<Set<string>>(new Set());

  const open = (modalId: string) => {
    openModals.value.add(modalId);
  };

  const close = (modalId: string) => {
    openModals.value.delete(modalId);
  };

  const isOpen = (modalId: string) => {
    return openModals.value.has(modalId);
  };

  const closeAll = () => {
    openModals.value.clear();
  };

  return {
    openModals,
    open,
    close,
    isOpen,
    closeAll
  };
});
