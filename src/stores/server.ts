import { defineStore } from 'pinia';
import { ref } from 'vue';
import { DEFAULT_SERVER } from '@/constants';

interface Server {
  name: string;
  url: string;
}

export const useServerStore = defineStore('server', () => {
  const servers = ref<Server[]>([]);

  const loadServers = () => {
    const saved = localStorage.getItem('openvibe-servers');
    if (saved) {
      servers.value = JSON.parse(saved);
    } else {
      servers.value = [DEFAULT_SERVER];
    }
  };

  const saveServers = () => {
    localStorage.setItem('openvibe-servers', JSON.stringify(servers.value));
  };

  const addServer = (server: Server) => {
    servers.value.push(server);
    saveServers();
  };

  const deleteServer = (index: number) => {
    servers.value.splice(index, 1);
    saveServers();
  };

  return {
    servers,
    loadServers,
    addServer,
    deleteServer
  };
});