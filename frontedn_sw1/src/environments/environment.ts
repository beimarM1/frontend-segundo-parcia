export const environment = {
  production: true,
  //coreUrl: 'https://backensw1-production.up.railway.app/api',
  //wsWorkflowUrl: 'https://backensw1-production.up.railway.app/ws-workflow',
  coreUrl: 'http://localhost:8080/api',
  wsWorkflowUrl: 'http://localhost:8080/ws-workflow',
  aiUrl: 'http://localhost:8000/ai',
  // URL del servidor y-websocket (Yjs CRDT).
  // PRODUCCIÓN → desplegar con: docker run -p 1234:1234 y-websocket en Railway/Render
  ///yjsUrl: 'wss://ibpm-yjs-collab.up.railway.app',
  yjsUrl: 'ws://localhost:1234',
};
