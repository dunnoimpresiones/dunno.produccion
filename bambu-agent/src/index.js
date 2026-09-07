import "dotenv/config";
import http from "node:http";
import mqtt from "mqtt";
import { WebSocketServer } from "ws";

const config = {
  host: process.env.AGENT_HOST || "0.0.0.0",
  port: Number(process.env.AGENT_PORT || 8787),
  printers: Array.from({length: Number(process.env.BAMBU_COUNT || 1)}, (_, index) => {
    const key = `BAMBU_${String(index + 1).padStart(2, "0")}`;
    return {
      id: `bambu-${String(index + 1).padStart(2, "0")}`,
      name: process.env[`${key}_NAME`] || `Bambu ${index + 1}`,
      model: process.env[`${key}_MODEL`] || "Bambu Lab",
      serial: process.env[`${key}_SERIAL`],
      ip: process.env[`${key}_IP`],
      accessCode: process.env[`${key}_ACCESS_CODE`],
      slotAssignments: Array.from({length: 16}, (_, slotIndex) => {
        const slot = slotIndex + 1;
        return {
          slot,
          color: process.env[`${key}_SLOT_${slot}_COLOR`] || "",
          type: process.env[`${key}_SLOT_${slot}_TYPE`] || ""
        };
      })
    };
  })
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
const reports = new Map();

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function pick(object, ...keys) {
  for (const key of keys) if (object?.[key] !== undefined && object?.[key] !== null) return object[key];
  return null;
}

function mergeReports(previous, next) {
  if (!previous || typeof previous !== "object") return next;
  if (!next || typeof next !== "object") return previous;
  const merged = {...previous, ...next};
  for (const key of Object.keys(next)) {
    if (previous[key] && typeof previous[key] === "object" && next[key] && typeof next[key] === "object" && !Array.isArray(next[key])) {
      merged[key] = mergeReports(previous[key], next[key]);
    }
  }
  return merged;
}

function temperature(value, previous) {
  const parsed = number(value);
  return parsed !== null && (parsed > 0 || previous === null || previous === undefined) ? parsed : previous;
}

function color(value) {
  const normalized = String(value || "").replace("#", "");
  return normalized.length >= 6 ? normalized.slice(0, 6) : normalized;
}

function meaningfulText(...values) {
  return values
    .map(value => String(value ?? "").trim())
    .find(value => value && !["sin_guardar", "sin guardar", "none", "null"].includes(value.toLowerCase())) || "";
}

function filamentAssignments(print) {
  const values = print.filament || print.filaments || print.filament_info || [];
  if (!Array.isArray(values)) return [];
  return values.map((filament, index) => {
    const item = typeof filament === "string" ? {color: filament} : filament;
    return {
      slot: index + 1,
      color: color(item.color || item.filament_color || item.tray_color),
      type: item.type || item.filament_type || item.tray_type || ""
    };
  }).filter(item => item.color || item.type);
}

function normalizeState(printer, previous, report) {
  const print = report?.print || {};
  const ams = print.ams || report?.ams || {};
  const rawState = String(pick(print, "gcode_state", "state") || previous.state || "IDLE").toUpperCase();
  const state = ["IDLE", "RUNNING", "PAUSE", "PAUSED", "FINISH", "FAILED"].includes(rawState)
    ? rawState === "PAUSED" ? "PAUSE" : rawState
    : previous.state;
  const trayUnits = Array.isArray(ams.ams) ? ams.ams : Array.isArray(ams.ams_list) ? ams.ams_list : [];
  const trays = trayUnits.length ? trayUnits.flatMap(unit => (unit.tray || unit.trays || []).map((tray, index) => ({
    id: `${unit.id ?? "ams"}-${index}`,
    slot: index + 1,
    color: color(tray.tray_color || tray.color),
    type: tray.tray_type || tray.tray_info_idx || tray.tray_type_name || "",
    remain: number(tray.remain)
  }))) : previous.ams;
  const assignedFilaments = filamentAssignments(print);
  const configuredFilaments = printer.slotAssignments.some(assignment => assignment.color || assignment.type)
    ? printer.slotAssignments.map(assignment => ({
      ...assignment,
      color: color(assignment.color)
    }))
    : [];
  const displayFilaments = configuredFilaments.length
    ? configuredFilaments
    : assignedFilaments.length ? assignedFilaments : trays;
  const errors = Array.isArray(report.hms) ? report.hms : previous.errors;
  return {
    ...previous,
    connection: "ONLINE",
    state,
    progress: number(pick(print, "mc_percent", "percent", "print_percent")) ?? previous.progress,
    job: meaningfulText(
      pick(print, "gcode_file", "file", "filename", "project_name", "task_name"),
      pick(print, "subtask_name"),
      previous.job
    ),
    remainingMinutes: number(pick(print, "mc_remaining_time", "remaining_time")) ?? previous.remainingMinutes,
    elapsedSeconds: number(pick(print, "mc_print_time", "print_time")) ?? previous.elapsedSeconds,
    nozzleTemperature: temperature(pick(print, "nozzle_temper", "nozzle_temp", "nozzle_temper_target"), previous.nozzleTemperature),
    bedTemperature: temperature(pick(print, "bed_temper", "bed_temp", "bed_temper_target"), previous.bedTemperature),
    ams: displayFilaments,
    activeTray: pick(ams, "tray_now", "active_tray", "tray_now_id") ?? previous.activeTray,
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
      const mergedReport = mergeReports(reports.get(printer.id), report);
      reports.set(printer.id, mergedReport);
      states.set(printer.id, normalizeState(printer, states.get(printer.id), mergedReport));
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

/* Duplicate block from an outdated local copy; the implementation above is authoritative.
function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function pick(object, ...keys) {
  for (const key of keys) if (object?.[key] !== undefined && object?.[key] !== null) return object[key];
  return null;
}

function mergeReports(previous, next) {
  if (!previous || typeof previous !== "object") return next;
  if (!next || typeof next !== "object") return previous;
  const merged = {...previous, ...next};
  for (const key of Object.keys(next)) {
    if (previous[key] && typeof previous[key] === "object" && next[key] && typeof next[key] === "object" && !Array.isArray(next[key])) {
      merged[key] = mergeReports(previous[key], next[key]);
    }
  }
  return merged;
}

function temperature(value, previous) {
  const parsed = number(value);
  return parsed !== null && (parsed > 0 || previous === null || previous === undefined) ? parsed : previous;
}

function color(value) {
  const normalized = String(value || "").replace("#", "");
  return normalized.length >= 6 ? normalized.slice(0, 6) : normalized;
}

function meaningfulText(...values) {
  return values
    .map(value => String(value ?? "").trim())
    .find(value => value && !["sin_guardar", "sin guardar", "none", "null"].includes(value.toLowerCase())) || "";
}

function filamentAssignments(print) {
  const values = print.filament || print.filaments || print.filament_info || [];
  if (!Array.isArray(values)) return [];
  return values.map((filament, index) => {
    const item = typeof filament === "string" ? {color: filament} : filament;
    return {
      slot: index + 1,
      color: color(item.color || item.filament_color || item.tray_color),
      type: item.type || item.filament_type || item.tray_type || ""
    };
  }).filter(item => item.color || item.type);
}

function normalizeState(printer, previous, report) {
  const print = report?.print || {};
  const ams = print.ams || report?.ams || {};
  const rawState = String(pick(print, "gcode_state", "state") || previous.state || "IDLE").toUpperCase();
  const state = ["IDLE", "RUNNING", "PAUSE", "PAUSED", "FINISH", "FAILED"].includes(rawState)
    ? rawState === "PAUSED" ? "PAUSE" : rawState
    : previous.state;
  const trayUnits = Array.isArray(ams.ams) ? ams.ams : Array.isArray(ams.ams_list) ? ams.ams_list : [];
  const trays = trayUnits.length ? trayUnits.flatMap(unit => (unit.tray || unit.trays || []).map((tray, index) => ({
    id: `${unit.id ?? "ams"}-${index}`,
    slot: index + 1,
    color: color(tray.tray_color || tray.color),
    type: tray.tray_type || tray.tray_info_idx || tray.tray_type_name || "",
    remain: number(tray.remain)
  }))) : previous.ams;
  const assignedFilaments = filamentAssignments(print);
  const configuredFilaments = printer.slotAssignments.some(assignment => assignment.color || assignment.type)
    ? printer.slotAssignments.map(assignment => ({
      ...assignment,
      color: color(assignment.color)
    }))
    : [];
  const displayFilaments = configuredFilaments.length
    ? configuredFilaments
    : assignedFilaments.length ? assignedFilaments : trays;
  const errors = Array.isArray(report.hms) ? report.hms : previous.errors;
  return {
    ...previous,
    connection: "ONLINE",
    state,
    progress: number(pick(print, "mc_percent", "percent", "print_percent")) ?? previous.progress,
    job: meaningfulText(
      pick(print, "gcode_file", "file", "filename", "project_name", "task_name"),
      pick(print, "subtask_name"),
      previous.job
    ),
    remainingMinutes: number(pick(print, "mc_remaining_time", "remaining_time")) ?? previous.remainingMinutes,
    elapsedSeconds: number(pick(print, "mc_print_time", "print_time")) ?? previous.elapsedSeconds,
    nozzleTemperature: temperature(pick(print, "nozzle_temper", "nozzle_temp", "nozzle_temper_target"), previous.nozzleTemperature),
    bedTemperature: temperature(pick(print, "bed_temper", "bed_temp", "bed_temper_target"), previous.bedTemperature),
    ams: displayFilaments,
    activeTray: pick(ams, "tray_now", "active_tray", "tray_now_id") ?? previous.activeTray,
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
      const mergedReport = mergeReports(reports.get(printer.id), report);
      reports.set(printer.id, mergedReport);
      states.set(printer.id, normalizeState(printer, states.get(printer.id), mergedReport));
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
*/
