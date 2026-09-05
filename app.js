/*
  =====================================================
  DUNNO PRODUCCIÓN
  =====================================================

  GOOGLE SHEETS
  GET  = leer pedidos
  POST = agregar / actualizar / eliminar

  MÁQUINAS FIJAS
  A1
  A2
  A3
  A4
  A5
  A6
  Amini
  V3
  CR10
*/


const CONFIG = {

  API_URL:
    "https://script.google.com/macros/s/AKfycbyiy6bBWy_SAgy3G5FJuLLulE4S6wXY5L8mmJWp1VedseybXA8OY31KH4x3t6r0V9x05g/exec",

  TOKEN:
    "Dunno0109"

};


const LOCAL_KEY =
  "dunno_produccion_v1_cache";


const MACHINES_KEY =
  "dunno_produccion_maquinas_v2";


const MACHINE_NAMES = [

  "A1",
  "A2",
  "A3",
  "A4",
  "A5",
  "A6",
  "Amini",
  "V3",
  "CR10"

];

const MACHINE_IMAGES_V2 = {
};


let orders = [];

let machines = [];

// Producción diaria sincronizada con Google Sheets
let productionDailyV2 = {};


// =====================================================
// CACHE PEDIDOS
// =====================================================

function saveCache() {

  try {

    localStorage.setItem(
      LOCAL_KEY,
      JSON.stringify(orders)
    );

  } catch (error) {

    console.error(
      "No se pudo guardar cache",
      error
    );

  }

}


function loadCache() {

  try {

    return JSON.parse(
      localStorage.getItem(
        LOCAL_KEY
      ) || "[]"
    );

  } catch {

    return [];

  }

}


// =====================================================
// MÁQUINAS
// =====================================================

function createDefaultMachines() {

  return MACHINE_NAMES.map(
    (
      name,
      index
    ) => ({

      id:
        index + 1,

      name:
        name,

      orderId:
        ""

    })
  );

}


function loadMachines() {

  try {

    const saved =
      JSON.parse(
        localStorage.getItem(
          MACHINES_KEY
        ) || "null"
      );


    if (
      Array.isArray(saved)
    ) {

      return MACHINE_NAMES.map(
        (
          name,
          index
        ) => {

          const old =
            saved[index];


          return {

            id:
              index + 1,

            name:
              name,

            orderId:
              old?.orderId || ""

          };

        }
      );

    }

  } catch (error) {

    console.error(
      "Error cargando máquinas",
      error
    );

  }


  return createDefaultMachines();

}


function saveMachines() {

  try {

    localStorage.setItem(
      MACHINES_KEY,
      JSON.stringify(
        machines
      )
    );

  } catch (error) {

    console.error(
      "No se pudieron guardar las máquinas",
      error
    );

  }

}


machines =
  loadMachines();


// =====================================================
// ESTILOS
// =====================================================

function installMachineStyles() {

  if (
    document.getElementById(
      "dunno-machine-styles"
    )
  ) {

    return;

  }


  const style =
    document.createElement(
      "style"
    );


  style.id =
    "dunno-machine-styles";


  style.textContent = `

    /* =================================================
       GRID DE MÁQUINAS
       3 COLUMNAS x 3 FILAS
       ================================================= */

    .machines-grid {

      display:
        grid;

      grid-template-columns:
        repeat(
          3,
          minmax(
            0,
            1fr
          )
        );

      gap:
        12px;

      margin-top:
        16px;

    }


    /* =================================================
       TARJETA
       ================================================= */

    .machine-card {

      border:
        1px solid #dedede;

      border-radius:
        12px;

      padding:
        11px;

      background:
        #fff;

      min-width:
        0;

      transition:
        .15s ease;

    }


    .machine-card:hover {

      border-color:
        #bcbcbc;

      box-shadow:
        0 3px 10px
        rgba(
          0,
          0,
          0,
          .06
        );

    }


    /* =================================================
       ENCABEZADO
       ================================================= */

    .machine-header {

      display:
        flex;

      align-items:
        center;

      justify-content:
        space-between;

      gap:
        8px;

      margin-bottom:
        9px;

    }


    .machine-name {

      font-size:
        17px;

      font-weight:
        800;

      letter-spacing:
        .2px;

      color:
        #111;

    }


    .machine-status {

      flex-shrink:
        0;

      font-size:
        10px;

      font-weight:
        600;

      padding:
        4px 7px;

      border-radius:
        20px;

      background:
        #f1f1f1;

      color:
        #666;

    }


    .machine-status.active {

      background:
        #e8f7ed;

      color:
        #18853b;

    }


    /* =================================================
       SELECTOR
       ================================================= */

    .machine-select {

      width:
        100%;

      box-sizing:
        border-box;

      border:
        1px solid #d8d8d8;

      border-radius:
        8px;

      padding:
        8px;

      font-size:
        12px;

      background:
        #fff;

      outline:
        none;

      cursor:
        pointer;

    }


    .machine-select:focus {

      border-color:
        #999;

    }


    /* =================================================
       INFORMACIÓN DEL PEDIDO
       ================================================= */

    .machine-order-info {

      margin-top:
        8px;

      padding:
        9px;

      border-radius:
        8px;

      background:
        #f6f6f6;

      font-size:
        11px;

    }


    .machine-order-title {

      font-weight:
        800;

      font-size:
        13px;

      line-height:
        1.2;

      margin-bottom:
        3px;

    }


    .machine-order-code {

      color:
        #777;

      font-size:
        10px;

      line-height:
        1.2;

    }


    .machine-order-progress {

      margin-top:
        7px;

      height:
        5px;

      background:
        #ddd;

      border-radius:
        10px;

      overflow:
        hidden;

    }


    .machine-order-progress > div {

      height:
        100%;

      background:
        #111;

      transition:
        width .2s ease;

    }


    .machine-production-number {

      display:
        flex;

      justify-content:
        space-between;

      align-items:
        center;

      margin-top:
        6px;

      font-size:
        11px;

    }


    .machine-production-number strong {

      font-size:
        12px;

    }


    /* =================================================
       BOTONES
       ================================================= */

    .machine-buttons {

      display:
        flex;

      gap:
        3px;

      flex-wrap:
        wrap;

      margin-top:
        8px;

    }


    .machine-mini-btn {

      border:
        1px solid #ddd;

      background:
        #fff;

      border-radius:
        6px;

      padding:
        5px 6px;

      font-size:
        10px;

      line-height:
        1;

      cursor:
        pointer;

      white-space:
        nowrap;

    }


    .machine-mini-btn:hover {

      background:
        #f0f0f0;

    }


    /* =================================================
       MÁQUINA LIBRE
       ================================================= */

    .machine-free {

      padding:
        10px;

      margin-top:
        8px;

      border-radius:
        8px;

      background:
        #f7f7f7;

      color:
        #777;

      font-size:
        11px;

      text-align:
        center;

    }


    /* =================================================
       PEDIDOS
       ================================================= */

    .order-actions {

      display:
        flex;

      gap:
        5px;

      flex-wrap:
        wrap;

      margin-top:
        10px;

    }


    .small-btn {

      cursor:
        pointer;

    }


    /* =================================================
       PANTALLAS MEDIANAS
       ================================================= */

    @media (
      max-width: 1000px
    ) {

      .machines-grid {

        grid-template-columns:
          repeat(
            3,
            minmax(
              0,
              1fr
            )
          );

      }

    }


    /* =================================================
       TABLET
       ================================================= */

    @media (
      max-width: 750px
    ) {

      .machines-grid {

        grid-template-columns:
          repeat(
            2,
            minmax(
              0,
              1fr
            )
          );

      }

    }


    /* =================================================
       CELULAR
       ================================================= */

    @media (
      max-width: 480px
    ) {

      .machines-grid {

        grid-template-columns:
          1fr;

      }

    }

  `;


  style.textContent += `
    /* DUNNO DARK ROWS */
    html.dark .machine-card{
      background:#000!important;
      color:#fff!important;
      border:1px solid #fff!important;
      box-shadow:none!important;
    }
    html.dark .machine-card:hover{border-color:#fff!important;box-shadow:none!important}
    html.dark .machine-name,
    html.dark .machine-order-title,
    html.dark .machine-production-number strong{color:#fff!important}
    html.dark .machine-order-code,
    html.dark .machine-free,
    html.dark .color-more{color:#fff!important}
    html.dark .machine-order-info,
    html.dark .machine-free{background:#000!important;border-color:#fff!important}
    html.dark .machine-select{background:#000!important;color:#fff!important;border:1px solid #fff!important}
    html.dark .machine-select option{background:#000!important;color:#fff!important}
    html.dark .machine-mini-btn,
    html.dark .machine-complete-btn{background:#000!important;color:#fff!important;border:1px solid #fff!important}
    html.dark .machine-mini-btn:hover,
    html.dark .machine-complete-btn:hover{background:#111!important}
    html.dark .machine-complete-btn:disabled{opacity:.5!important}
    html.dark .machine-order-progress{background:#222!important}
    html.dark .machine-order-progress>div{background:#fff!important}
    html.dark .color-add{background:#000!important;color:#fff!important;border:1px solid #fff!important}

    /* Filas compactas: evita que las acciones invadan el resumen lateral. */
    @media (min-width:901px){
      .machine-card{
        grid-template-columns:80px minmax(150px,1fr) 104px minmax(145px,1fr) minmax(100px,145px) minmax(140px,max-content)!important;
        gap:10px!important;
      }
      .machine-quick-actions{justify-content:flex-end!important}
    }
    .workshop-message{margin-top:10px;font-weight:800;color:var(--text,#fff);font-size:13px}
  `;

  document
    .head
    .appendChild(
      style
    );

}


// =====================================================
// GOOGLE SHEETS - GET
// =====================================================

function getOrdersFromAPI() {

  return new Promise(
    (
      resolve,
      reject
    ) => {

      window.dunnoData =
        null;


      const script =
        document.createElement(
          "script"
        );


      const callback = "dunnoData_" + Date.now();
      window[callback] = function(data) {
        window.dunnoData = data;
      };
      script.src =
        CONFIG.API_URL + "?token=" + encodeURIComponent(CONFIG.TOKEN) +
        "&callback=" + callback + "&_=" + Date.now();


      script.onload =
        function() {

          script.remove();
          delete window[callback];


          const data =
            window.dunnoData;


          if (
            !data
          ) {

            reject(
              new Error(
                "Google Apps Script no devolvió datos"
              )
            );

            return;

          }


          if (
            !data.ok
          ) {

            reject(
              new Error(
                data.error ||
                "Error de Google Apps Script"
              )
            );

            return;

          }


          resolve({
            orders: Array.isArray(data.orders) ? data.orders : [],
            production: data.production || {}
          });

        };


      script.onerror =
        function() {

          script.remove();
          delete window[callback];


          reject(
            new Error(
              "No se pudo conectar con Google Apps Script"
            )
          );

        };


      document
        .head
        .appendChild(
          script
        );

    }
  );

}


// =====================================================
// SINCRONIZAR
// =====================================================

async function syncFromSheets(
  showError = true
) {

  try {

    const result =
      await getOrdersFromAPI();


    const remoteOrders=Array.isArray(result) ? result : (result.orders || []);
    orders=remoteOrders.map(remote=>{
      const pending=pendingChangesV2[String(remote.id)];
      const local=pending||optimisticOrdersV2[String(remote.id)];
      return local ? {...remote,done:local.done,status:local.status|| (Number(local.done)>=Number(remote.qty)?"done":Number(local.done)>0?"production":"pending")} : remote;
    });

    productionDailyV2 =
      (!Array.isArray(result) && result.production)
        ? result.production
        : productionDailyV2;

    if(!Array.isArray(result) && Array.isArray(result.machines) && result.machines.length){
      machines=result.machines.map((m,i)=>({id:i+1,name:MACHINE_NAMES[i],orderId:String(m.orderId||""),colors:Array.isArray(m.colors)?m.colors.slice(0,16):[]}));
      saveMachines();
    }

    saveCache();


    cleanMachineOrders();


    render();
    if(!pendingListV2().length){
      setLastSyncV2(Date.now());
      if(showError)showSyncStatusV2("🟢 Sincronizado");
    }else{
      showSyncStatusV2("🟡 Guardando...");
    }


    console.log(
      "Pedidos cargados:",
      orders
    );


    return true;

  } catch (error) {

    console.error(
      "Error sincronizando:",
      error
    );


    const cached =
      loadCache();


    if (
      cached.length
    ) {

      orders =
        cached;


      cleanMachineOrders();


      render();

    }


    if (
      showError
    ) {

      alert(
        "No se pudo sincronizar con Google Sheets.\n\n" +
        error.message
      );

    }
    showSyncStatusV2("No se pudo sincronizar con Google Sheets: "+syncErrorMessageV2(error),true);

    return false;

  }

}


// =====================================================
// LIMPIAR PEDIDOS DE MÁQUINAS
// =====================================================

function cleanMachineOrders() {
  const validIds=new Set(orders.map(o=>String(o.id)));
  let changed=false;
  machines.forEach(machine=>{
    if(machine.orderId && !validIds.has(String(machine.orderId))){
      machine.orderId="";
      changed=true;
    }
  });
  if(changed){
    saveMachines();
    machines.forEach(m=>{
      if(!m.orderId) postAPI("updateMachine",{machineId:m.id,orderId:"",colors:JSON.stringify(m.colors||[])}).catch(()=>{});
    });
  }
}


// =====================================================
// POST
// =====================================================

// Se declara antes de postAPI para que toda llamada POST pueda crear sus
// campos ocultos, incluso si el archivo se carga parcialmente o se reordena.
function addFormField(
  form,
  name,
  value
) {

  const input =
    document.createElement(
      "input"
    );

  input.type =
    "hidden";

  input.name =
    name;

  input.value =
    value ?? "";

  form.appendChild(
    input
  );

}

function postAPI(
  action,
  data = {}
) {
  return new Promise(
    (
      resolve,
      reject
    ) => {

      const callback = "dunnoAction_" + Date.now() + "_" + Math.random().toString(36).slice(2);
      const params = new URLSearchParams({token: CONFIG.TOKEN, action, callback, _: String(Date.now())});
      Object.keys(data).forEach(key => params.set(key, String(data[key] ?? "")));
      const script = document.createElement("script");
      let finished = false;
      const cleanup = () => {
        script.remove();
        delete window[callback];
      };
      const fail = message => {
        if (finished) return;
        finished = true;
        cleanup();
        reject(new Error(message));
      };
      window[callback] = response => {
        if (finished) return;
        finished = true;
        cleanup();
        if (!response || !response.ok) {
          reject(new Error(response?.error || "Google Apps Script rechazó la operación"));
          return;
        }
        resolve(response);
      };
      script.onerror = () => fail("No se pudo conectar con Google Apps Script");
      script.src = CONFIG.API_URL + "?" + params.toString();
      document.head.appendChild(script);
      setTimeout(() => fail("Google Apps Script no respondió a tiempo"), 10000);

    }
  );

}


// =====================================================
// MODAL
// =====================================================

function openOrderModal() {

  const modal =
    document.getElementById(
      "modal"
    );


  if (
    modal
  ) {

    modal.classList
      .remove(
        "hidden"
      );

  }

}


function closeModal() {

  const modal =
    document.getElementById(
      "modal"
    );


  if (
    modal
  ) {

    modal.classList
      .add(
        "hidden"
      );

  }

}


// =====================================================
// AGREGAR PEDIDO
// =====================================================

async function addOrder() {

  const id =
    document
      .getElementById(
        "fOrder"
      )
      .value
      .trim();


  const client =
    document
      .getElementById(
        "fClient"
      )
      .value
      .trim();


  const design =
    document
      .getElementById(
        "fDesign"
      )
      .value
      .trim();


  const qty =
    Number(
      document
        .getElementById(
          "fQty"
        )
        .value
    );


  const date =
    document
      .getElementById(
        "fDate"
      )
      .value;


  const priority =
    document
      .getElementById(
        "fPriority"
      )
      .value;


  if (
    !id ||
    !design ||
    !qty
  ) {

    alert(
      "Completá pedido, diseño y cantidad."
    );

    return;

  }


  const newOrder={id,client,design,qty,done:0,date,priority,status:"pending"};
  orders=[...orders,newOrder];
  saveCache();
  render();
  closeModal();
  try {
    await retryPostV2("addOrder",{
      id,client,design,qty,done:0,date,priority
    },error=>{
      orders=orders.filter(item=>String(item.id)!==String(id));
      saveCache();
      render();
      alert("No se pudo guardar el pedido.\n\n"+syncErrorMessageV2(error));
    });


    document
      .getElementById(
        "fOrder"
      )
      .value = "";


    document
      .getElementById(
        "fClient"
      )
      .value = "";


    document
      .getElementById(
        "fDesign"
      )
      .value = "";


    document
      .getElementById(
        "fQty"
      )
      .value = "";


  } catch (error) {
    console.error("Sincronización del pedido:",error);
  }

}


// =====================================================
// ACTUALIZAR PRODUCCIÓN
// =====================================================

async function setDone(
  id,
  amount
) {

  const order =
    orders.find(
      x =>
        String(x.id) ===
        String(id)
    );


  if (
    !order
  ) {

    return;

  }


  let newDone;


  if (
    amount === "ALL"
  ) {

    newDone =
      Number(
        order.qty
      );

  } else {

    newDone =
      Number(
        order.done || 0
      ) +
      Number(
        amount
      );

  }


  newDone =
    Math.max(
      0,

      Math.min(
        Number(order.qty),
        newDone
      )
    );


  order.done=newDone;
  order.status=newDone>=Number(order.qty)?"done":newDone>0?"production":"pending";
  optimisticOrdersV2[String(order.id)]={done:newDone,status:order.status};
  saveCache();
  render();
  queueOrderChangeV2(order);

}


// =====================================================
// ELIMINAR PEDIDO
// =====================================================

async function removeOrder(
  id
) {

  if (
    !confirm(
      "¿Eliminar este pedido?"
    )
  ) {

    return;

  }


  const removed=orders.find(order=>String(order.id)===String(id));
  orders=orders.filter(order=>String(order.id)!==String(id));
  saveCache();
  render();
  try {
    await retryPostV2("deleteOrder",{id},error=>{
      if(removed) orders=[...orders,removed];
      saveCache();
      render();
      alert("No se pudo eliminar el pedido.\n\n"+syncErrorMessageV2(error));
    });
  } catch (error) {
    console.error("Sincronización de eliminación:",error);
  }

}


// =====================================================
// ASIGNAR PEDIDO A MÁQUINA
// =====================================================

async function updateMachineOrder(machineId, orderId) {
  const machine=machines.find(m=>Number(m.id)===Number(machineId));
  if(!machine)return;
  machine.orderId=String(orderId||"");
  saveMachines();
  renderMachines();
  try{
    await postAPI("updateMachine",{machineId:machine.id,orderId:machine.orderId,colors:JSON.stringify(machine.colors||[])});
  }catch(e){ console.error("No se pudo guardar la máquina:",e); }
}


// =====================================================
// RENDER MÁQUINAS
// =====================================================

function renderMachines() {

  const container =
    document.getElementById(
      "productionList"
    );


  if (
    !container
  ) {

    return;

  }


  container.innerHTML = `

    <div class="machines-grid">

      ${
        machines
          .map(
            machine =>
              renderMachineCard(
                machine
              )
          )
          .join("")
      }

    </div>

  `;

}


// =====================================================
// TARJETA DE MÁQUINA
// =====================================================

function renderMachineCard(machine) {
  const order = orders.find(o => String(o.id) === String(machine.orderId));
  const active = !!order;
  const colors = (machine.colors || []).slice(0, 16);

  const chips = colors.map(name => {
    const c = DUNNO_COLORS.find(x => x[0] === name);
    return c
      ? `<span class="color-chip" style="background:${c[1]}" title="${escAttr(name)}"></span>`
      : "";
  }).join("");

  const orderOptions = orders
    .filter(o => o.status !== "done")
    .map(o => {
      const design = String(o.design || "Sin diseño");
      const qty = Number(o.qty) || 0;
      const done = Number(o.done) || 0;
      return `<option value="${escAttr(o.id)}" ${String(machine.orderId) === String(o.id) ? "selected" : ""}>${esc(design)} ×${qty}${done > 0 ? " · " + done + "/" + qty : ""} · #${esc(o.id)}</option>`;
    }).join("");

  let orderInfo = `<div class="machine-free">Máquina libre</div>`;

  if (order) {
    const qty = Number(order.qty) || 0;
    const done = Number(order.done) || 0;
    const pct = qty ? Math.round((done / qty) * 100) : 0;

    orderInfo = `
      <div class="machine-order-info">
        <div class="machine-order-title">${esc(order.design)} ×${qty}</div>
        <div class="machine-order-code">Pedido #${esc(order.id)}${order.client ? " · " + esc(order.client) : ""}</div>
        <div class="machine-production-number">
          <span>Producidos</span>
          <strong>${done}/${qty} · ${pct}% ${savingOrdersV2[String(order.id)] ? '<span class="saving-dot">● Guardando...</span>' : ""}</strong>
        </div>
        <div class="machine-order-progress"><div style="width:${pct}%"></div></div>
      </div>
    `;
  }

  const buttons = order ? `
    <div class="machine-buttons">
      <button class="machine-mini-btn" onclick="setDone('${js(order.id)}',-5)">-5</button>
      <button class="machine-mini-btn" onclick="setDone('${js(order.id)}',-1)">-1</button>
      <button class="machine-mini-btn" onclick="setDone('${js(order.id)}',1)">+1</button>
      <button class="machine-mini-btn" onclick="setDone('${js(order.id)}',5)">+5</button>
      <button class="machine-mini-btn" onclick="setDone('${js(order.id)}',10)">+10</button>
      <button class="machine-complete-btn" onclick="setDone('${js(order.id)}','ALL')">Completar</button>
    </div>
  ` : `
    <div class="machine-buttons">
      <button class="machine-complete-btn" disabled>Completar</button>
    </div>
  `;

  return `
    <div class="machine-card">
      <div class="machine-name">${esc(machine.name)}</div>
      <span class="machine-status ${active ? "active" : ""}">${active ? "Produciendo" : "Libre"}</span>

      <select class="machine-select" onchange="updateMachineOrder(${machine.id},this.value)">
        <option value="">— Seleccionar pedido —</option>
        ${orderOptions}
      </select>

      <div class="machine-main-info">
        ${orderInfo}
      </div>

      <div class="machine-colors">
        ${chips || `<span class="color-more">Sin colores</span>`}
        <button class="color-add" data-color-btn="${machine.id}" onclick="openColorPaletteV2(${machine.id});event.stopPropagation()">+</button>
      </div>

      ${buttons}
    </div>
  `;
}

// =====================================================
// RENDER GENERAL
// =====================================================

function render() {

  installMachineStyles();


  // ===================================================
  // TÍTULO
  // ===================================================

  const productionList =
    document.getElementById(
      "productionList"
    );


  if (
    productionList
  ) {

    const section =
      productionList.closest(
        "section"
      );


    if (
      section
    ) {

      const title =
        section.querySelector(
          "h2, h3"
        );


      if (
        title
      ) {

        title.textContent =
          "Máquinas";

        title.classList.add(
          "production-section-title"
        );

      }


      const description =
        section.querySelector(
          "p"
        );


      if (
        description
      ) {

        description.textContent =
          "Asigná un pedido a cada máquina y controlá la producción.";

        description.classList.add(
          "production-section-description"
        );

      }

    }

  }


  // ===================================================
  // BUSCADOR
  // ===================================================

  const search =
    document
      .getElementById(
        "search"
      );


  const q =
    (
      search?.value ||
      ""
    )
    .toLowerCase();


  const filtered =
    orders.filter(
      o =>

        (
          String(o.id) +
          " " +
          String(o.client) +
          " " +
          String(o.design)
        )
        .toLowerCase()
        .includes(q)

    );


  // ===================================================
  // CONTADORES
  // ===================================================

  const pendingCount =
    document.getElementById(
      "pendingCount"
    );


  const productionCount =
    document.getElementById(
      "productionCount"
    );


  const doneCount =
    document.getElementById(
      "doneCount"
    );


  const unitsCount =
    document.getElementById(
      "unitsCount"
    );


  if (
    pendingCount
  ) {

    pendingCount.textContent =
      orders.filter(
        o =>
          o.status ===
          "pending"
      ).length;

  }


  if (
    productionCount
  ) {

    productionCount.textContent =
      orders.filter(
        o =>
          o.status ===
          "production"
      ).length;

  }


  if (
    doneCount
  ) {

    doneCount.textContent =
      orders.filter(
        o =>
          o.status ===
          "done"
      ).length;

  }


  if (
    unitsCount
  ) {

    unitsCount.textContent =
      orders.reduce(
        (
          sum,
          o
        ) =>

          sum +

          Math.max(
            0,

            Number(o.qty) -
            Number(o.done)
          ),

        0
      );

  }


  // ===================================================
  // MÁQUINAS
  // ===================================================

  renderMachines();


  // ===================================================
  // PEDIDOS
  // ===================================================

  const ordersList =
    document
      .getElementById(
        "ordersList"
      );


  if (
    !ordersList
  ) {

    return;

  }


  ordersList.innerHTML =
    filtered.length

      ?

      filtered
        .map(
          o => {

            const pct =
              o.qty

                ?

                Math.round(
                  (
                    Number(o.done) /
                    Number(o.qty)
                  ) *
                  100
                )

                :

                0;


            return `

              <div class="order">

                <div class="order-main">

                  <div>

                    <div class="order-title">

                      #${esc(o.id)}

                      ·

                      ${esc(o.design)}

                      ×${o.qty}

                    </div>


                    <div class="muted">

                      ${esc(
                        o.client ||
                        "Sin cliente"
                      )}

                      ${
                        o.date

                          ?

                          " · entrega " +
                          esc(o.date)

                          :

                          ""
                      }

                    </div>

                  </div>


                  <span
                    class="badge ${
                      o.priority ===
                      "high"

                        ?

                        "high"

                        :

                        ""
                    }">

                    ${
                      o.status ===
                      "done"

                        ?

                        "terminado"

                        :

                        o.status ===
                        "production"

                          ?

                          "produciendo"

                          :

                          "pendiente"
                    }

                  </span>

                </div>


                <div class="progress">

                  <div
                    style="
                      width:${pct}%;
                    "
                  ></div>

                </div>


                <div class="muted">

                  ${o.done}/${o.qty}
                  producidos

                </div>


                <div class="order-actions">

                  <button
                    class="small-btn"
                    onclick="
                      setDone(
                        '${js(o.id)}',
                        -10
                      )
                    ">

                    -10

                  </button>


                  <button
                    class="small-btn"
                    onclick="
                      setDone(
                        '${js(o.id)}',
                        -5
                      )
                    ">

                    -5

                  </button>


                  <button
                    class="small-btn"
                    onclick="
                      setDone(
                        '${js(o.id)}',
                        -1
                      )
                    ">

                    -1

                  </button>


                  <button
                    class="small-btn"
                    onclick="
                      setDone(
                        '${js(o.id)}',
                        1
                      )
                    ">

                    +1

                  </button>


                  <button
                    class="small-btn"
                    onclick="
                      setDone(
                        '${js(o.id)}',
                        5
                      )
                    ">

                    +5

                  </button>


                  <button
                    class="small-btn"
                    onclick="
                      setDone(
                        '${js(o.id)}',
                        10
                      )
                    ">

                    +10

                  </button>


                  <button
                    class="small-btn"
                    onclick="
                      setDone(
                        '${js(o.id)}',
                        20
                      )
                    ">

                    +20

                  </button>


                  <button
                    class="small-btn"
                    onclick="
                      setDone(
                        '${js(o.id)}',
                        25
                      )
                    ">

                    +25

                  </button>


                  <button
                    class="small-btn"
                    onclick="
                      setDone(
                        '${js(o.id)}',
                        'ALL'
                      )
                    ">

                    Completar

                  </button>


                  <button
                    class="small-btn"
                    onclick="
                      removeOrder(
                        '${js(o.id)}'
                      )
                    ">

                    Eliminar

                  </button>

                </div>

              </div>

            `;

          }
        )
        .join("")

      :

      "<p class='muted'>No se encontraron pedidos.</p>";

}


// =====================================================
// BUSCADOR
// =====================================================

function setupSearch() {

  const search =
    document
      .getElementById(
        "search"
      );


  if (
    search
  ) {

    search.addEventListener(
      "input",
      render
    );

  }

}


// =====================================================
// ESPERAR
// =====================================================

function wait(
  ms
) {

  return new Promise(
    resolve =>
      setTimeout(
        resolve,
        ms
      )
  );

}


// =====================================================
// ESCAPAR HTML
// =====================================================

function esc(
  value
) {

  return String(
    value ?? ""
  )
  .replace(
    /[&<>"']/g,
    char =>
      ({

        "&":
          "&amp;",

        "<":
          "&lt;",

        ">":
          "&gt;",

        '"':
          "&quot;",

        "'":
          "&#39;"

      }[char])
  );

}


// =====================================================
// ESCAPAR ATRIBUTOS
// =====================================================

function escAttr(
  value
) {

  return String(
    value ?? ""
  )
  .replace(
    /&/g,
    "&amp;"
  )
  .replace(
    /"/g,
    "&quot;"
  )
  .replace(
    /</g,
    "&lt;"
  )
  .replace(
    />/g,
    "&gt;"
  );

}


// =====================================================
// ESCAPAR JAVASCRIPT
// =====================================================

function js(
  value
) {

  return String(
    value ?? ""
  )
  .replace(
    /\\/g,
    "\\\\"
  )
  .replace(
    /'/g,
    "\\'"
  );

}


/* =====================================================
   DUNNO V2 - EXTENSION
   ===================================================== */
const DUNNO_COLORS = [
  ["Negro","#111111"],["Blanco","#FFFFFF"],["Gris claro","#D4D4D4"],["Gris","#737373"],["Gris oscuro","#404040"],["Natural","#E5D3B3"],["Transparente","#E8F4F8"],
  ["Rojo","#E53935"],["Rojo oscuro","#9B1C1C"],["Bordó","#6D1F2B"],["Coral","#FF7F6E"],["Rosa","#F472B6"],["Rosa pastel","#F9A8D4"],["Fucsia","#D946EF"],
  ["Naranja","#F97316"],["Naranja oscuro","#C2410C"],["Amarillo","#FACC15"],["Amarillo pastel","#FDE68A"],
  ["Verde","#22C55E"],["Verde oscuro","#166534"],["Verde militar","#4D5D3C"],["Verde agua","#5EEAD4"],["Verde menta","#86EFAC"],["Verde lima","#84CC16"],
  ["Celeste","#7DD3FC"],["Celeste pastel","#BAE6FD"],["Azul","#3B82F6"],["Azul oscuro","#1E3A8A"],["Azul petróleo","#155E75"],["Turquesa","#14B8A6"],
  ["Violeta","#8B5CF6"],["Violeta oscuro","#5B21B6"],["Lavanda","#C4B5FD"],["Lila","#D8B4FE"],["Magenta","#C026D3"],
  ["Marrón","#92400E"],["Marrón oscuro","#451A03"],["Beige","#D6C6A5"],["Crema","#FFF1C1"],["Terracota","#C76B4A"],
  ["Dorado","#D4AF37"],["Plateado","#A8A8A8"],["Cobre","#B87333"]
];
const DAILY_KEY_V2="dunno_produccion_diaria_v2";
const PENDING_CHANGES_KEY_V2="dunno_produccion_pending_changes_v2";
const LAST_SYNC_KEY_V2="dunno_produccion_last_sync_v2";
const BATCH_DELAY_V2=2500;
let savingOrdersV2={};let openColorMachineIdV2=null;
let optimisticOrdersV2={};
let pendingChangesV2=loadPendingChangesV2();
let pendingFlushTimerV2=null;
let flushingPendingV2=false;
let pendingRetryTimerV2=null;

function loadPendingChangesV2(){
  try{
    const saved=JSON.parse(localStorage.getItem(PENDING_CHANGES_KEY_V2)||"{}");
    return saved&&typeof saved==="object"?saved:{};
  }catch(error){console.error("No se pudieron cargar cambios pendientes:",error);return {}}
}
function savePendingChangesV2(){
  try{localStorage.setItem(PENDING_CHANGES_KEY_V2,JSON.stringify(pendingChangesV2))}
  catch(error){console.error("No se pudieron guardar cambios pendientes:",error)}
}
function pendingListV2(){return Object.values(pendingChangesV2)}
function setLastSyncV2(value){
  try{localStorage.setItem(LAST_SYNC_KEY_V2,String(value))}catch(error){console.error("No se pudo guardar la última sincronización:",error)}
  const el=document.getElementById("lastSyncTime");
  if(el)el.textContent=new Date(value).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit",second:"2-digit"});
}
function loadLastSyncV2(){
  try{
    const value=Number(localStorage.getItem(LAST_SYNC_KEY_V2)||0);
    if(value)setLastSyncV2(value);
  }catch(error){console.error("No se pudo cargar la última sincronización:",error)}
}
function syncErrorMessageV2(error){
  const message=String(error?.message||error||"Error desconocido");
  if(/permiso|autoriz|token/i.test(message))return "Error de permisos o autenticación: "+message;
  if(/hoja/i.test(message))return "Error de hoja de cálculo: "+message;
  if(/columna|datos|incomplet|inválid/i.test(message))return "Error de datos/formato: "+message;
  if(/conectar|red|tiempo|respond/i.test(message))return "Error de conexión: "+message;
  return "Google Apps Script rechazó la operación: "+message;
}
function showSyncStatusV2(message,isError=false){
  const el=document.getElementById("syncStatusV2");
  if(!el)return;
  el.textContent=message;
  el.className=isError?"sync-error":"sync-ok";
}
function schedulePendingFlushV2(delay=BATCH_DELAY_V2){
  clearTimeout(pendingFlushTimerV2);
  if(!pendingListV2().length)return;
  pendingFlushTimerV2=setTimeout(flushPendingChangesV2,delay);
}
function queueOrderChangeV2(order){
  const key=String(order.id);
  const version=Date.now()+"-"+Math.random().toString(36).slice(2);
  pendingChangesV2[key]={id:order.id,done:Number(order.done),status:order.status,version};
  savingOrdersV2[key]=true;
  savePendingChangesV2();
  showSyncStatusV2("🟡 Guardando...");
  schedulePendingFlushV2();
}
async function flushPendingChangesV2(){
  clearTimeout(pendingFlushTimerV2);
  pendingRetryTimerV2=null;
  if(flushingPendingV2||!pendingListV2().length)return;
  flushingPendingV2=true;
  const batch=pendingListV2().map(change=>({...change}));
  showSyncStatusV2("🟡 Guardando...");
  try{
    const delays=[0,2000,5000];
    let response;
    for(let attempt=0;attempt<delays.length;attempt++){
      if(delays[attempt])await wait(delays[attempt]);
      try{response=await postAPI("updateBatch",{changes:JSON.stringify(batch.map(change=>({id:change.id,done:change.done}))) });break}
      catch(error){if(attempt===delays.length-1)throw error}
    }
    if(!response?.ok)throw new Error("Google Apps Script no confirmó el lote");
    batch.forEach(change=>{
      const current=pendingChangesV2[String(change.id)];
      if(current?.version===change.version){
        delete pendingChangesV2[String(change.id)];
        delete savingOrdersV2[String(change.id)];
      }
    });
    savePendingChangesV2();
    if(!pendingListV2().length)setLastSyncV2(Date.now());
    showSyncStatusV2(pendingListV2().length?"🟡 Guardando...":"🟢 Sincronizado");
  }catch(error){
    console.error("Error sincronizando lote:",error);
    showSyncStatusV2("🔴 Error al sincronizar",true);
    clearTimeout(pendingRetryTimerV2);
    pendingRetryTimerV2=setTimeout(flushPendingChangesV2,10000);
  }finally{
    flushingPendingV2=false;
    if(pendingListV2().length&&!pendingRetryTimerV2)schedulePendingFlushV2();
  }
}

async function retryPostV2(action,data,onFailure){
  let error;
  for(let attempt=0;attempt<3;attempt++){
    try{
      if(attempt)await wait(attempt*2000);
      const response=await postAPI(action,data);
      if(!pendingListV2().length){
        setLastSyncV2(Date.now());
        showSyncStatusV2("🟢 Sincronizado");
      }else{
        showSyncStatusV2("🟡 Guardando...");
      }
      return response;
    }catch(currentError){error=currentError}
  }
  onFailure(error);
  showSyncStatusV2("🔴 Error al sincronizar",true);
  throw error;
}

function normalizeMachinesV2(){machines=machines.map((m,i)=>({id:i+1,name:MACHINE_NAMES[i],orderId:m.orderId||"",colors:Array.isArray(m.colors)?m.colors.slice(0,16):[]}));saveMachines();}
function saveDailyV2(d){try{localStorage.setItem(DAILY_KEY_V2,JSON.stringify(d))}catch(e){console.error(e)}}
function loadDailyV2(){try{return JSON.parse(localStorage.getItem(DAILY_KEY_V2)||"{}")}catch{return {}}}
function dateKeyV2(date){
  const y=date.getFullYear();
  const m=String(date.getMonth()+1).padStart(2,"0");
  const d=String(date.getDate()).padStart(2,"0");
  return `${y}-${m}-${d}`;
}
function todayV2(){return dateKeyV2(new Date())}
function addDailyV2(units){if(units<=0)return;const d=loadDailyV2(),k=todayV2();if(!d[k])d[k]={units:0};d[k].units=(d[k].units||0)+Number(units);saveDailyV2(d)}
function toggleTheme(){document.documentElement.classList.toggle("dark");localStorage.setItem("dunno_produccion_theme",document.documentElement.classList.contains("dark")?"dark":"light");updateThemeButtonV2()}
function updateThemeButtonV2(){const b=document.getElementById("themeToggle");if(b)b.textContent=document.documentElement.classList.contains("dark")?"☀":"☾"}
function initThemeV2(){if(localStorage.getItem("dunno_produccion_theme")==="dark")document.documentElement.classList.add("dark");updateThemeButtonV2()}

async function toggleMachineColorV2(machineId,name){const m=machines.find(x=>Number(x.id)===Number(machineId));if(!m)return;m.colors=m.colors||[];const i=m.colors.indexOf(name);if(i>=0)m.colors.splice(i,1);else{if(m.colors.length>=16){alert("Esta impresora ya tiene 16 colores seleccionados.");return}m.colors.push(name)}saveMachines();render();openColorPaletteV2(machineId);try{await postAPI("updateMachine",{machineId:m.id,orderId:m.orderId||"",colors:JSON.stringify(m.colors)})}catch(e){console.error("No se pudieron guardar los colores:",e)}}
function openColorPaletteV2(machineId){openColorMachineIdV2=Number(machineId);const m=machines.find(x=>Number(x.id)===openColorMachineIdV2),p=document.getElementById("colorPopover");if(!m||!p)return;p.innerHTML=`<div class="palette-head"><span>Colores — ${esc(m.name)}</span><span class="palette-count">${(m.colors||[]).length}/16</span></div><div class="palette-grid">${DUNNO_COLORS.map(c=>`<button class="palette-item ${(m.colors||[]).includes(c[0])?"selected":""}" style="background:${c[1]}" title="${escAttr(c[0])}" onclick="toggleMachineColorV2(${m.id},'${js(c[0])}')"></button>`).join("")}</div>`;p.classList.remove("hidden");const b=document.querySelector(`[data-color-btn="${m.id}"]`);if(b){const r=b.getBoundingClientRect();p.style.left=Math.min(window.innerWidth-300,Math.max(8,r.right-290))+"px";p.style.top=Math.min(window.innerHeight-300,r.bottom+7)+"px"}}
function closeColorPaletteV2(){document.getElementById("colorPopover")?.classList.add("hidden");openColorMachineIdV2=null}
document.addEventListener("click",e=>{if(openColorMachineIdV2===null)return;const p=document.getElementById("colorPopover");if(p&&!p.contains(e.target)&&!e.target.closest("[data-color-btn]"))closeColorPaletteV2()});

function renderMachineCard(machine){
  const order=orders.find(o=>String(o.id)===String(machine.orderId));
  const active=!!order;
  const qty=Number(order?.qty||0), done=Number(order?.done||0);
  const pct=qty?Math.min(100,Math.round(done/qty*100)):0;
  const colors=(machine.colors||[]).slice(0,16);
  const chips=colors.map(n=>{
    const c=DUNNO_COLORS.find(x=>x[0]===n);
    return c?`<span class="color-chip" style="background:${c[1]}" title="${escAttr(n)}"></span>`:"";
  }).join("");
  const options=orders.filter(o=>o.status!=="done").map(o=>
    `<option value="${escAttr(o.id)}" ${String(machine.orderId)===String(o.id)?"selected":""}>${esc(o.design||"Sin diseño")} ×${Number(o.qty)||0}${Number(o.done||0)>0?" · "+o.done+"/"+o.qty:""} · #${esc(o.id)}</option>`
  ).join("");
  const quick=order?`
    <div class="machine-quick-actions">
      <button class="machine-mini-btn" onclick="setDone('${js(order.id)}',20)">+20</button>
      <button class="machine-complete-btn" onclick="setDone('${js(order.id)}','ALL')">Completar</button>
    </div>`:"";
  return `<div class="machine-card">
    <div class="machine-id-block"><div class="machine-name">${esc(machine.name)}</div><span class="machine-status ${active?"active":""}">${active?"Produciendo":"Libre"}</span></div>
    <div class="machine-order-block">
      <label>Pedido</label>
      <select class="machine-select" onchange="updateMachineOrder(${machine.id},this.value)">
        <option value="">Seleccionar pedido</option>${options}
      </select>
    </div>
    <div class="machine-qty-block">
      <label>Cantidad</label>
      ${order?`<div class="qty-control"><button onclick="setDone('${js(order.id)}',-1)">−</button><span>${done}</span><button onclick="setDone('${js(order.id)}',1)">+</button></div>`:`<div class="qty-control disabled"><button disabled>−</button><span>0</span><button disabled>+</button></div>`}
    </div>
    <div class="machine-progress-block">
      <label>Progreso</label>
      ${order?`<div class="progress-line"><span>${done} / ${qty}</span><strong>${pct}%</strong></div><div class="machine-order-progress"><div style="width:${pct}%"></div></div>`:`<div class="progress-line"><span>Sin pedido</span><strong>0%</strong></div><div class="machine-order-progress"><div style="width:0%"></div></div>`}
    </div>
    <div class="machine-colors-block">
      <label>Colores</label>
      <div class="machine-colors">${chips||`<span class="color-more">Sin colores</span>`}<button class="color-add" data-color-btn="${machine.id}" onclick="openColorPaletteV2(${machine.id});event.stopPropagation()">+</button></div>
    </div>
    <div class="machine-actions-block">${quick}</div>
  </div>`;
}
function renderDashboardV2(){
  const el=document.getElementById("workshopDashboard");
  if(!el)return;

  const active=machines.filter(m=>orders.some(o=>String(o.id)===String(m.orderId)&&o.status!=="done")).length;
  const inactive=machines.length-active;
  const names=machines.filter(m=>!orders.some(o=>String(o.id)===String(m.orderId)&&o.status!=="done")).map(m=>m.name);
  const workshopMessage=workshopMessageV2(inactive,machines.length);
  const production=productionDailyV2||{};
  const days=[];

  for(let i=6;i>=0;i--){
    const date=new Date();
    date.setDate(date.getDate()-i);
    const key=dateKeyV2(date);
    const value=production[key];
    days.push({
      key,
      units:Number(value?.units??value??0),
      label:i===0?"Hoy":key.slice(8,10)+"/"+key.slice(5,7)
    });
  }

  const today=days[days.length-1].units;
  const yesterday=days[days.length-2].units;
  const weeklyTotal=days.reduce((sum,day)=>sum+day.units,0);
  const weeklyAverage=Math.round(weeklyTotal/days.length);
  const diff=yesterday?Math.round((today-yesterday)/yesterday*100):null;
  const max=Math.max(1,...days.map(day=>day.units));

  el.innerHTML=`
    <div class="dashboard-card alert-card ${inactive===0?"good":"warning"}">
      <div>
        <div class="dashboard-title">Estado del taller</div>
        <div class="alert-count">${inactive===0?"🟢 TALLER A FULL":"⚠️ "+inactive+" "+(inactive===1?"MÁQUINA INACTIVA":"MÁQUINAS INACTIVAS")}</div>
        <div class="machine-list-inline">${inactive===0?"Todas las máquinas están produciendo.":names.join(" · ")}</div>
        <div class="workshop-message">${workshopMessage}</div>
      </div>
      <div class="dashboard-meta"><span><strong>${active}</strong> / ${machines.length} activas</span></div>
    </div>
    <div class="dashboard-card">
      <div class="dashboard-title">Producción de hoy</div>
      <div class="dashboard-big">${today} <small>unidades</small></div>
      <div class="dashboard-meta">
        <span>Pedidos activos <strong>${orders.filter(o=>o.status==="production").length}</strong></span>
        <span>Máquinas <strong>${active}</strong></span>
        <span>Promedio 7 días <strong>${weeklyAverage}</strong></span>
        ${diff!==null?`<span>${diff>=0?"↑":"↓"} ${Math.abs(diff)}% vs. ayer</span>`:""}
      </div>
      <div class="dashboard-message">${motivationV2(today)}</div>
      <div class="dashboard-history">${days.map(day=>`<div class="history-bar" style="height:${Math.max(6,Math.round(day.units/max*40))}px" title="${day.label}: ${day.units} unidades"><span class="history-label">${day.label}</span></div>`).join("")}</div>
    </div>`;
}
const MOTIVATION_KEY_V2="dunno_motivacion_diaria_v2";
const WORKSHOP_MESSAGE_KEY_V2="dunno_estado_taller_v2";
const WORKSHOP_MESSAGES_V2={
  quiet:[
     "Dale pa, así no vas a pagar las deudas.",
    "Rey, si seguís así vas a vender medias.",
    "Hay más silencio que en un velorio. Prendé una máquina.",
    "Las impresoras están mirando el techo, jefe.",
    "Hasta Loan se esforzo más",
    "Una máquina laburando no te paga la comida. Metele un poco."
  ],
  middle:[
    "Vamos tomando ritmo, pero todavía le falta onda.",
    "Mitad taller, mitad siesta. Metele un poquito más.",
    "Bien ahí, pero todavía queda lugar para que arranquen más máquinas.",
    "Dale papito, prende las que faltan.",
    "Vamos bien, pero bien lento."
  ],
  near:[
    "Casi a pleno. Una empujadita más y acabamos.",
    "Está picante el taller. Falta poquito para el modo fábrica.",
    "Hermoso ritmo: las maquinas estan más calientes que aquella.",
    "Ya se siente el lorca.",
    "Estamos cerca del pleno, dale que so vo."
  ],
  full:[
    "A pleeeeeeeno. Así se trabaja.",
    "Dale que so vo: taller en modo fábrica.",
    "Todas prendidas. Hoy se come.",
    "Taller completo, chocha, culo, teta.",
    "Máquinas a full: moskito feliz."
  ]
};
function workshopMessageV2(inactive,total){
  const bucket=inactive===0?"full":inactive<=2?"near":inactive<=Math.ceil(total/2)?"middle":"quiet";
  const today=todayV2();
  let saved={};
  try{saved=JSON.parse(localStorage.getItem(WORKSHOP_MESSAGE_KEY_V2)||"{}")}catch(_){ }
  if(saved.date===today&&saved.bucket===bucket&&saved.phrase)return saved.phrase;
  const options=WORKSHOP_MESSAGES_V2[bucket];
  const phrase=options[Math.floor(Math.random()*options.length)];
  try{localStorage.setItem(WORKSHOP_MESSAGE_KEY_V2,JSON.stringify({date:today,bucket,phrase}))}catch(_){ }
  return phrase;
}
const MOTIVATION_SETS_V2={
  "0":["Dale que arrancamos 🚀","Todo empieza con la primera impresión.","Vamos a poner esas máquinas a trabajar.","Arrancamos tranqui, pero arrancamos 🔥","Hoy se viene jornada de taller.","Primero una impresión, después vemos 😎","Que empiece el ruido de las máquinas.","Día nuevo, impresiones nuevas.","Vamos a llenar esas bobinas de trabajo.","El taller está listo. ¿Y nosotros? 😏","Hoy también se fabrica.","A darle vida a esas ideas.","Las máquinas están esperando 🔥","Ponemos primera y arrancamos.","Un buen día empieza con una impresión."],
  "1-99":["Ya arrancamos 🔥","El taller empieza a tomar ritmo.","Primeras impresiones del día 💪","De a poco se llena la mesa.","Ya hay movimiento en el taller.","La primera tanda ya está saliendo.","Arrancamos suave, pero con estilo.","Esto recién empieza 🚀","Unas cuantas impresiones y calentamos motores.","Ya estamos fabricando 🔥","El taller empieza a despertar.","Poco a poco, pedido a pedido.","Las máquinas ya están trabajando.","Buen comienzo para la jornada.","Ya salió la primera tanda."],
  "100-199":["Ya está tomando ritmo 🔥","Vamos con todo.","El taller empieza a calentarse.","Ya pasamos las 100. Seguimos.","Más de 100 razones para seguir imprimiendo.","Esto ya tiene ritmo de taller 💪","La producción viene tomando velocidad.","Ya hay unas cuantas impresiones dando vueltas.","Seguimos sumando unidades 🔥","El día viene cargadito.","Las máquinas empiezan a pedir más trabajo.","Buen ritmo. No aflojamos.","Esto se está poniendo interesante 🚀","Ya hay producción de verdad.","Vamos acumulando impresiones."],
  "200-299":["El taller viene con todo 💪","Buen ritmo de producción.","Seguimos metiendo impresiones.","Más de 200 unidades. Nada mal 🔥","Acá ya se está trabajando en serio.","El taller está agarrando velocidad.","Dos centenas y seguimos 🚀","Las máquinas están rindiendo.","Esto ya parece una fábrica chiquita 😎","La producción viene fuerte.","Seguimos llenando pedidos.","Buen día para tener máquinas trabajando.","El contador sigue subiendo 🔥","Más impresiones, más pedidos listos.","El taller está en modo producción."],
  "300-499":["Hoy se imprimió fuerte 🔥","Taller a pleno 💪","La producción viene excelente.","Más de 300 unidades. Tremendo día.","Esto ya es ritmo de fábrica 🚀","Las máquinas están a full.","El taller no está aflojando.","Seguimos rompiendo el contador 🔥","Hay producción para rato.","Hoy las impresoras no paran.","El ritmo está muy arriba 💪","Cada vez más cerca de las 500.","Esto viene MUY fuerte.","Día productivo desbloqueado 🚀","El taller está volando."],
  "500+":["MODO FÁBRICA ACTIVADO 🚀🔥","Esto ya no es un taller.","Dunno está volando 🚀","Producción nivel industrial.","500+ unidades. Una locura 🔥","Las máquinas directamente no descansan.","Hoy el taller está en otro nivel.","Modo fábrica: ON 💪","Esto se fue al carajo 😎🔥","El contador pidió vacaciones.","Más de 500. Qué animalada.","Dunno en modo producción extrema 🚀","Acá ya se imprime en serio.","Taller a pleno nivel industrial.","Hoy se trabajó MUY fuerte 🔥"]
};
function motivationRangeV2(n){if(n<=0)return "0";if(n<100)return "1-99";if(n<200)return "100-199";if(n<300)return "200-299";if(n<500)return "300-499";return "500+"}
function motivationV2(n){const date=todayV2();const range=motivationRangeV2(Number(n)||0);const list=MOTIVATION_SETS_V2[range]||MOTIVATION_SETS_V2["0"];let saved={};try{saved=JSON.parse(localStorage.getItem(MOTIVATION_KEY_V2)||"{}")}catch{}if(saved.date===date&&saved.range===range&&saved.phrase)return saved.phrase;let pool=list.filter(x=>x!==saved.phrase);if(!pool.length)pool=list;const phrase=pool[Math.floor(Math.random()*pool.length)];try{localStorage.setItem(MOTIVATION_KEY_V2,JSON.stringify({date,range,phrase}))}catch{}return phrase}

function renderGroupedProductionV2(){
  const el=document.getElementById("productionList");
  if(!el)return;
  const groups={};
  orders.forEach(o=>{
    const key=String(o.design||"Sin diseño").trim()||"Sin diseño";
    if(!groups[key])groups[key]={design:key,qty:0,done:0,orders:[]};
    groups[key].qty+=Number(o.qty)||0;
    groups[key].done+=Number(o.done)||0;
    groups[key].orders.push(o);
  });
  const items=Object.values(groups).sort((a,b)=>b.qty-a.qty);
  el.innerHTML=items.length?items.map(g=>{
    const pct=g.qty?Math.round(g.done/g.qty*100):0;
    const machineNames=machines.filter(m=>g.orders.some(o=>String(o.id)===String(m.orderId))).map(m=>m.name);
    return `<div class="prod-card"><div class="prod-top"><div class="prod-name">${esc(g.design)}</div><strong>${pct}%</strong></div><div class="prod-meta"><span>${g.done} / ${g.qty} producidos</span><span>${machineNames.length?machineNames.join(", "):"Sin máquina"}</span></div><div class="progress"><div style="width:${pct}%"></div></div></div>`;
  }).join(""):"<p class='muted'>Todavía no hay pedidos para agrupar.</p>";
}

function render(){
  const search=document.getElementById("search");
  const q=(search?.value||"").toLowerCase();
  const filtered=orders.filter(o=>(String(o.id)+" "+String(o.client)+" "+String(o.design)).toLowerCase().includes(q));
  document.getElementById("pendingCount").textContent=orders.filter(o=>o.status==="pending").length;
  document.getElementById("productionCount").textContent=orders.filter(o=>o.status==="production").length;
  document.getElementById("doneCount").textContent=orders.filter(o=>o.status==="done").length;
  document.getElementById("unitsCount").textContent=orders.reduce((s,o)=>s+Math.max(0,Number(o.qty)-Number(o.done)),0);
  renderDashboardV2();
  renderGroupedProductionV2();
  renderMachines();
  renderWorkshopSidebarV3();
  const list=document.getElementById("ordersList");
  if(!list)return;
  list.innerHTML=filtered.length?filtered.map(o=>{
    const pct=o.qty?Math.round(Number(o.done)/Number(o.qty)*100):0;
    return `<div class="order"><div class="order-main"><div><div class="order-title">#${esc(o.id)} · ${esc(o.design)} ×${o.qty}</div><div class="muted">${esc(o.client||"Sin cliente")}${o.date?" · entrega "+esc(o.date):""}</div></div><span class="badge ${o.priority==="high"?"high":""}">${o.status==="done"?"terminado":o.status==="production"?"produciendo":"pendiente"}</span></div><div class="progress"><div style="width:${pct}%"></div></div><div class="muted">${o.done}/${o.qty} producidos ${savingOrdersV2[String(o.id)]?`<span class="saving-dot">● Guardando...</span>`:""}</div><div class="order-actions">${[-5,-1,1,5,10].map(n=>`<button class="small-btn" onclick="setDone('${js(o.id)}',${n})">${n>0?"+":""}${n}</button>`).join("")}<button class="small-btn" onclick="setDone('${js(o.id)}','ALL')">Completar</button><button class="small-btn" onclick="removeOrder('${js(o.id)}')">Eliminar</button></div></div>`;
  }).join(""):"<p class='muted'>No se encontraron pedidos.</p>";
}



function renderWorkshopSidebarV3(){
  const p=document.getElementById("sidebarPedidosV3");
  const r=document.getElementById("sidebarResumenV3");
  if(!p||!r)return;
  const active=machines.filter(m=>orders.some(o=>String(o.id)===String(m.orderId)&&o.status!=="done")).length;
  const rows=orders.filter(o=>o.status!=="done").slice(0,8);
  p.innerHTML=rows.length?rows.map(o=>{
    const late=o.date && new Date(o.date)<new Date();
    const label=o.status==="production"?"Produciendo":o.status==="done"?"Listo":"Pendiente";
    return `<div class="side-order-row"><div><strong>${esc(o.design||"Sin diseño")}</strong><small>×${Number(o.qty)||0}</small></div><span class="side-status ${o.status}">${label}</span><em>${late?"Con demora":"En día"}</em></div>`;
  }).join(""):"<div class='side-empty'>No hay pedidos pendientes.</div>";
  const pending=orders.filter(o=>o.status!=="done").length;
  const production=orders.filter(o=>o.status==="production").length;
  const ready=orders.filter(o=>o.status==="done").length;
  const totalQty=orders.reduce((s,o)=>s+Number(o.qty||0),0);
  const totalDone=orders.reduce((s,o)=>s+Number(o.done||0),0);
  const totalPct=totalQty?Math.round(totalDone/totalQty*100):0;
  r.innerHTML=`<div class="summary-row"><span>Total pedidos</span><strong>${orders.length}</strong></div><div class="summary-row"><span>En producción</span><strong>${production}</strong></div><div class="summary-row"><span>Pendientes</span><strong>${pending}</strong></div><div class="summary-row"><span>Máquinas activas</span><strong>${active} / ${machines.length}</strong></div><div class="summary-row"><span>Producción total</span><strong>${totalDone} / ${totalQty}</strong></div><div class="summary-progress"><div style="width:${totalPct}%"></div></div><div class="summary-percent">${totalPct}%</div>`;
}

normalizeMachinesV2();initThemeV2();installMachineStyles();render();setupSearch();loadLastSyncV2();
if(pendingListV2().length){
  showSyncStatusV2("🟡 Guardando...");
  schedulePendingFlushV2(500);
}else{
  syncFromSheets(false);
}

// =====================================================
// SINCRONIZACIÓN AUTOMÁTICA
// =====================================================
// Mantiene todos los dispositivos actualizados con Google Sheets.
// Se consulta cada 5 segundos cuando la pestaña está visible.
let realtimeSyncRunningV2 = false;
const REALTIME_SYNC_INTERVAL_V2 = 5000;

async function realtimeSyncV2(){
  if (realtimeSyncRunningV2 || document.hidden) return;
  realtimeSyncRunningV2 = true;
  try {
    await syncFromSheets(false);
  } catch (error) {
    console.warn("Sincronización automática:", error);
  } finally {
    realtimeSyncRunningV2 = false;
  }
}

setInterval(realtimeSyncV2, REALTIME_SYNC_INTERVAL_V2);

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) realtimeSyncV2();
});
