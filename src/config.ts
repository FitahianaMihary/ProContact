const getApiBaseUrl = () => {
  // ✅ Si on est en développement sur PC (localhost ou 127.0.0.1)
  if (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  ) {
    return "http://localhost:5000/api";
  }

  // ✅ Sinon (accès depuis téléphone ou autre appareil du réseau local)
  return "http://192.168.137.1:5000/api";
};

export const API_BASE_URL = getApiBaseUrl();
