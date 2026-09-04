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


let orders = [];

let machines = [];


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


      script.src =
        CONFIG.API_URL;


      script.onload =
        function() {

          script.remove();


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


          resolve(
            data.orders || []
          );

        };


      script.onerror =
        function() {

          script.remove();


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


    orders =
      result;


    saveCache();


    cleanMachineOrders();


    render();


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


    return false;

  }

}


// =====================================================
// LIMPIAR PEDIDOS DE MÁQUINAS
// =====================================================

function cleanMachineOrders() {

  const validIds =
    new Set(
      orders.map(
        o =>
          String(o.id)
      )
    );


  let changed =
    false;


  machines.forEach(
    machine => {

      if (
        machine.orderId &&
        !validIds.has(
          String(
            machine.orderId
          )
        )
      ) {

        machine.orderId =
          "";

        changed =
          true;

      }

    }
  );


  if (
    changed
  ) {

    saveMachines();

  }

}


// =====================================================
// POST
// =====================================================

function postAPI(
  action,
  data = {}
) {

  return new Promise(
    (
      resolve,
      reject
    ) => {

      const iframe =
        document.createElement(
          "iframe"
        );


      iframe.name =
        "dunno_post_" +
        Date.now();


      iframe.style.display =
        "none";


      document
        .body
        .appendChild(
          iframe
        );


      const form =
        document.createElement(
          "form"
        );


      form.method =
        "POST";


      form.action =
        CONFIG.API_URL;


      form.target =
        iframe.name;


      form.style.display =
        "none";


      addFormField(
        form,
        "token",
        CONFIG.TOKEN
      );


      addFormField(
        form,
        "action",
        action
      );


      Object.keys(data)
        .forEach(
          key => {

            addFormField(
              form,
              key,
              data[key]
            );

          }
        );


      document
        .body
        .appendChild(
          form
        );


      let finished =
        false;


      function finish() {

        if (
          finished
        ) {

          return;

        }


        finished =
          true;


        setTimeout(
          () => {

            form.remove();

            iframe.remove();

          },
          500
        );


        resolve({
          ok: true
        });

      }


      iframe.onload =
        function() {

          finish();

        };


      iframe.onerror =
        function() {

          if (
            finished
          ) {

            return;

          }


          finished =
            true;


          form.remove();

          iframe.remove();


          reject(
            new Error(
              "No se pudo enviar el pedido"
            )
          );

        };


      form.submit();


      setTimeout(
        () => {

          finish();

        },
        5000
      );

    }
  );

}


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


  try {

    await postAPI(
      "addOrder",
      {

        id:
          id,

        client:
          client,

        design:
          design,

        qty:
          qty,

        done:
          0,

        date:
          date,

        priority:
          priority

      }
    );


    closeModal();


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


    await wait(
      700
    );


    await syncFromSheets();


  } catch (error) {

    console.error(
      error
    );


    alert(
      "No se pudo guardar el pedido.\n\n" +
      error.message
    );

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


  try {

    await postAPI(
      "updateOrder",
      {

        id:
          order.id,

        done:
          newDone

      }
    );


    await wait(
      500
    );


    await syncFromSheets();


  } catch (error) {

    console.error(
      error
    );


    alert(
      "No se pudo actualizar el pedido.\n\n" +
      error.message
    );

  }

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


  try {

    await postAPI(
      "deleteOrder",
      {

        id:
          id

      }
    );


    await wait(
      700
    );


    await syncFromSheets();


  } catch (error) {

    console.error(
      error
    );


    alert(
      "No se pudo eliminar el pedido.\n\n" +
      error.message
    );

  }

}


// =====================================================
// ASIGNAR PEDIDO A MÁQUINA
// =====================================================

function updateMachineOrder(
  machineId,
  orderId
) {

  const machine =
    machines.find(
      m =>
        Number(m.id) ===
        Number(machineId)
    );


  if (
    !machine
  ) {

    return;

  }


  machine.orderId =
    orderId;


  saveMachines();


  renderMachines();

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

function renderMachineCard(
  machine
) {

  const order =
    orders.find(
      o =>
        String(o.id) ===
        String(
          machine.orderId
        )
    );


  const active =
    !!order;


  let orderInfo =
    "";


  if (
    order
  ) {

    const qty =
      Number(
        order.qty
      ) || 0;


    const done =
      Number(
        order.done
      ) || 0;


    const pct =
      qty
        ? Math.round(
            (
              done /
              qty
            ) *
            100
          )
        : 0;


    orderInfo = `

      <div class="machine-order-info">

        <div class="machine-order-title">

          ${esc(
            order.design
          )}

          ×${qty}

        </div>


        <div class="machine-order-code">

          Pedido #${esc(
            order.id
          )}

          ${
            order.client
              ?

              " · " +
              esc(
                order.client
              )

              :

              ""
          }

        </div>


        <div class="machine-production-number">

          <span>

            Producidos

          </span>

          <strong>

            ${done}/${qty}

            ·

            ${pct}%

          </strong>

        </div>


        <div class="machine-order-progress">

          <div
            style="
              width:${pct}%;
            "
          ></div>

        </div>


        <div class="machine-buttons">

          <button
            class="machine-mini-btn"
            onclick="
              setDone(
                '${js(order.id)}',
                -10
              )
            ">

            -10

          </button>


          <button
            class="machine-mini-btn"
            onclick="
              setDone(
                '${js(order.id)}',
                -5
              )
            ">

            -5

          </button>


          <button
            class="machine-mini-btn"
            onclick="
              setDone(
                '${js(order.id)}',
                -1
              )
            ">

            -1

          </button>


          <button
            class="machine-mini-btn"
            onclick="
              setDone(
                '${js(order.id)}',
                1
              )
            ">

            +1

          </button>


          <button
            class="machine-mini-btn"
            onclick="
              setDone(
                '${js(order.id)}',
                5
              )
            ">

            +5

          </button>


          <button
            class="machine-mini-btn"
            onclick="
              setDone(
                '${js(order.id)}',
                10
              )
            ">

            +10

          </button>


          <button
            class="machine-mini-btn"
            onclick="
              setDone(
                '${js(order.id)}',
                20
              )
            ">

            +20

          </button>


          <button
            class="machine-mini-btn"
            onclick="
              setDone(
                '${js(order.id)}',
                25
              )
            ">

            +25

          </button>


          <button
            class="machine-mini-btn"
            onclick="
              setDone(
                '${js(order.id)}',
                'ALL'
              )
            ">

            Completar

          </button>

        </div>

      </div>

    `;

  } else {

    orderInfo = `

      <div class="machine-free">

        Máquina libre

      </div>

    `;

  }


  // ===================================================
  // PEDIDOS DISPONIBLES
  // ===================================================

  const orderOptions =
    orders
      .filter(
        o =>
          o.status !==
          "done"
      )
      .map(
        o => {

          const design =
            String(
              o.design ||
              "Sin diseño"
            );


          const qty =
            Number(
              o.qty
            ) || 0;


          const done =
            Number(
              o.done
            ) || 0;


          return `

            <option
              value="${escAttr(o.id)}"

              ${
                String(
                  machine.orderId
                ) ===
                String(o.id)

                  ?

                  "selected"

                  :

                  ""
              }>

              ${esc(
                design
              )}

              ×${qty}

              ${
                done > 0

                  ?

                  " · " +
                  done +
                  "/" +
                  qty

                  :

                  ""
              }

              · #

              ${esc(
                o.id
              )}

            </option>

          `;

        }
      )
      .join("");


  // ===================================================
  // TARJETA
  // ===================================================

  return `

    <div class="machine-card">

      <div class="machine-header">

        <span class="machine-name">

          🖨️
          ${esc(
            machine.name
          )}

        </span>


        <span
          class="machine-status ${
            active
              ? "active"
              : ""
          }">

          ${
            active
              ?

              "Produciendo"

              :

              "Libre"
          }

        </span>

      </div>


      <select
        class="machine-select"

        onchange="
          updateMachineOrder(
            ${machine.id},
            this.value
          )
        ">

        <option value="">

          — Seleccionar pedido —

        </option>


        ${orderOptions}

      </select>


      ${orderInfo}

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


// =====================================================
// INICIO
// =====================================================

orders =
  loadCache();


installMachineStyles();


render();


setupSearch();


syncFromSheets(
  false
);
