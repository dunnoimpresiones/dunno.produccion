# Bambu Agent

Agent local para monitorear impresoras Bambu Lab mediante MQTT LAN y publicar
telemetría normalizada por WebSocket.

## Configuración

1. Instalar Node.js 20 o superior.
2. Copiar `.env.example` a `.env`.
3. Completar `BAMBU_01_ACCESS_CODE` con el LAN Access Code de la A1.
4. Ejecutar `npm install`.
5. Ejecutar `npm start`.

El Agent escucha en `http://<ip-del-pc>:8787` y WebSocket en
`ws://<ip-del-pc>:8787`. El frontend no recibe ni almacena credenciales MQTT.

Los colores asignados manualmente pueden fijarse para los slots 1 a 16 en
`.env` con `BAMBU_01_SLOT_N_COLOR` y `BAMBU_01_SLOT_N_TYPE`. Esos valores
tienen prioridad sobre los colores reportados por el AMS. Después de cambiar
`.env`, reiniciá el Agent.

Para probar desde GitHub Pages, abrir temporalmente la aplicación con
`?bambuAgent=ws://IP_DEL_PC_DEL_AGENT:8787`. No usar la IP de la impresora en
esa URL: el Agent corre en la PC del taller. En una publicación HTTPS, el
endpoint remoto deberá usar `wss://`.

La A1 debe tener LAN Mode habilitado y el PC debe poder acceder a su IP por
TCP 8883.
