import { defineStore } from 'pinia';
import { ref } from 'vue';

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
      servers.value = [{ name: 'OpenVibe', url: 'openvibe-server.duckdns.org:6969' }];
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