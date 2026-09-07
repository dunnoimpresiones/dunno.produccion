import "dotenv/config";
import http from "node:http";
import mqtt from "mqtt";
import { WebSocketServer } from "ws";

const config = {
  host: process.env.AGENT_HOST || "0.0.0.0",
  port: Number(process.env.AGENT_PORT || 8787),
  printers: [{
    id: "bambu-01",
    name: process.env.BAMBU_01_NAME || "A1",
    model: process.env.BAMBU_01_MODEL || "Bambu Lab A1",
    serial: process.env.BAMBU_01_SERIAL,
    ip: process.env.BAMBU_01_IP,
    accessCode: process.env.BAMBU_01_ACCESS_CODE
  }]
};

const states = new Map(config.printers.map(printer => [printer.id, {
  id: printer.id,
  name: printer.name,
  model: printer.model,
  serial: printer.serial,
  connection: "OFFLINE",
  state: "OFFLINE",
  progress: 0,
  job: "",
  remainingMinutes: null,
  elapsedSeconds: null,
  nozzleTemperature: null,
  bedTemperature: null,
  ams: [],
  activeTray: null,
  errors: [],
  updatedAt: null
}]));
const clients = new Set();
const mqttClients = new Map();

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function pick(object, ...keys) {
  for (const key of keys) if (object?.[key] !== undefined && object?.[key] !== null) return object[key];
  return null;
}

function normalizeState(printer, previous, report) {
  const print = report?.print || {};
  const ams = report?.ams || {};
  const rawState = String(pick(print, "gcode_state", "state") || previous.state || "IDLE").toUpperCase();
  const state = ["IDLE", "RUNNING", "PAUSE", "PAUSED", "FINISH", "FAILED"].includes(rawState)
    ? rawState === "PAUSED" ? "PAUSE" : rawState
    : previous.state;
  const trays = Array.isArray(ams.ams) ? ams.ams.flatMap(unit => (unit.tray || []).map((tray, index) => ({
    id: `${unit.id ?? "ams"}-${index}`,
    slot: index + 1,
    color: tray.tray_color || "",
    type: tray.tray_type || tray.tray_info_idx || "",
    remain: number(tray.remain)
  }))) : previous.ams;
  const errors = Array.isArray(report.hms) ? report.hms : previous.errors;
  return {
    ...previous,
    connection: "ONLINE",
    state,
    progress: number(pick(print, "mc_percent", "percent")) ?? previous.progress,
    job: String(pick(print, "subtask_name", "gcode_file", "file") || previous.job || ""),
    remainingMinutes: number(pick(print, "mc_remaining_time", "remaining_time")) ?? previous.remainingMinutes,
    elapsedSeconds: number(pick(print, "mc_print_time", "print_time")) ?? previous.elapsedSeconds,
    nozzleTemperature: number(pick(print, "nozzle_temper", "nozzle_temp")) ?? previous.nozzleTemperature,
    bedTemperature: number(pick(print, "bed_temper", "bed_temp")) ?? previous.bedTemperature,
    ams: trays,
    activeTray: pick(ams, "tray_now", "active_tray") ?? previous.activeTray,
    errors,
    updatedAt: new Date().toISOString()
  };
}

function broadcast() {
  const message = JSON.stringify({ type: "printers", printers: [...states.values()] });
  for (const client of clients) if (client.readyState === 1) client.send(message);
}

function connectPrinter(printer) {
  if (!printer.serial || !printer.ip || !printer.accessCode) {
    console.error(`[Bambu] Configuración incompleta para ${printer.name}`);
    return;
  }
  const topic = `device/${printer.serial}/report`;
  const requestTopic = `device/${printer.serial}/request`;
  const client = mqtt.connect(`mqtts://${printer.ip}:8883`, {
    username: "bblp",
    password: printer.accessCode,
    reconnectPeriod: 5000,
    rejectUnauthorized: false
  });
  mqttClients.set(printer.id, client);
  client.on("connect", () => {
    const state = states.get(printer.id);
    states.set(printer.id, {...state, connection: "ONLINE", state: state.state === "OFFLINE" ? "IDLE" : state.state, updatedAt: new Date().toISOString()});
    client.subscribe(topic, error => {
      if (error) console.error(`[Bambu] Suscripción fallida ${printer.name}:`, error.message);
      else client.publish(requestTopic, JSON.stringify({pushing:{sequence_id:"0",command:"pushall",version:1,push_target:1}}));
      broadcast();
    });
  });
  client.on("message", (_topic, payload) => {
    try {
      const report = JSON.parse(payload.toString());
      states.set(printer.id, normalizeState(printer, states.get(printer.id), report));
      broadcast();
    } catch (error) {
      console.error(`[Bambu] Reporte inválido ${printer.name}:`, error.message);
    }
  });
  client.on("error", error => console.error(`[Bambu] MQTT ${printer.name}:`, error.message));
  client.on("close", () => {
    const state = states.get(printer.id);
    states.set(printer.id, {...state, connection: "OFFLINE", state: "OFFLINE", updatedAt: new Date().toISOString()});
    broadcast();
  });
}

const server = http.createServer((request, response) => {
  if (request.url === "/health") {
    response.writeHead(200, {"Content-Type": "application/json"});
    response.end(JSON.stringify({ok: true, printers: [...states.values()]}));
    return;
  }
  response.writeHead(404);
  response.end();
});
const websocket = new WebSocketServer({server});
websocket.on("connection", socket => {
  clients.add(socket);
  socket.send(JSON.stringify({type: "printers", printers: [...states.values()]}));
  socket.on("close", () => clients.delete(socket));
});
server.listen(config.port, config.host, () => {
  console.log(`[Bambu] Agent escuchando en ${config.host}:${config.port}`);
  config.printers.forEach(connectPrinter);
});
