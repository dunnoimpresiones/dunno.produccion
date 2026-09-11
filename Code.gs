const CONFIG = {
  SPREADSHEET_ID: '1fNaERltql_EDl1IGn1TnnMDT_X-a1t96E_zrkfggHIg',
  PRODUCTION_SHEET: 'PRODUCCION_DIARIA',
  SUMMARY_SHEET: 'RESUMEN_PRODUCCION',
  OPERATIONS_SHEET: 'OPERACIONES_PEDIDOS',
  MACHINES_SHEET: 'MAQUINAS',
  TOKEN: 'Dunno0109'
};

const ORDER_HEADERS = ['ID','Fecha','Cliente','Contacto','Cantidad realizada','Cantidad pedida','Producto','Diseño','Toppers','Placa','Tarjetas','Seña','Total','Provincia','Fecha de entrega','Fecha aproximada','Estado'];
const PRODUCTION_HEADERS = ['Fecha','Pedido','Diseño','Cantidad a producir','Cantidad realizada','Máquina','Estado','Colores','Tipo','ID_PRODUCCION','TOTAL'];
const SUMMARY_HEADERS = ['Fecha','Total_produccion'];
const MACHINE_HEADERS = ['ID','Maquina','Pedido','Colores','Actualizado'];
const MACHINE_NAMES = ['A1','A2','A3','A4','A5','A6','Amini','V3','CR10'];
const PRODUCTION_TIMEZONE = 'America/Argentina/Buenos_Aires';
const OPERATION_HEADERS = ['Operacion','Pedido','Estado','Actualizado'];
const PRODUCTION_TOTAL_LABEL = 'TOTAL GENERAL';
const CUSTOM_ORDER_COLUMNS = {id:0,date:1,client:2,contact:3,done:4,qty:5,product:6,design:7,deposit:11,total:12,province:13,dueDate:14,approxDate:15,status:16};

function getSS_(){ return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID); }
function setup(){
  const ss=getSS_();
  ensureCurrentMonthlyOrdersSheet_(ss);
  ensureProductionSheet_(ss);
  recalculateProductionTotal_();
  ensureSheet_(ss,CONFIG.SUMMARY_SHEET,SUMMARY_HEADERS);
  ensureSheet_(ss,CONFIG.OPERATIONS_SHEET,OPERATION_HEADERS);
  return {ok:true};
}
function ensureSheet_(ss,name,headers){
  let sh=ss.getSheetByName(name);if(!sh)sh=ss.insertSheet(name);
  if(sh.getMaxColumns()<headers.length)sh.insertColumnsAfter(sh.getMaxColumns(),headers.length-sh.getMaxColumns());
  sh.getRange(1,1,1,headers.length).setValues([headers]);sh.setFrozenRows(1);return sh;
}
function ensureProductionSheet_(ss){
  let sh=ss.getSheetByName(CONFIG.PRODUCTION_SHEET);
  if(!sh)return ensureSheet_(ss,CONFIG.PRODUCTION_SHEET,PRODUCTION_HEADERS);
  const header=sh.getRange(1,1,1,Math.min(7,sh.getLastColumn())).getValues()[0].map(String);
  const legacy=header.join('|')==='Fecha|Pedido|Diseño|Cantidad|Máquina|Estado|Colores';
  const oldRows=legacy&&sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,7).getValues():[];
  if(sh.getMaxColumns()<PRODUCTION_HEADERS.length)sh.insertColumnsAfter(sh.getMaxColumns(),PRODUCTION_HEADERS.length-sh.getMaxColumns());
  sh.getRange(1,1,1,PRODUCTION_HEADERS.length).setValues([PRODUCTION_HEADERS]);
  if(legacy&&oldRows.length){
    const migrated=oldRows.map((r,i)=>[r[0],r[1],r[2],0,Number(r[3]||0),r[4],r[5],r[6],'HISTORICAL','LEGACY|'+String(i+2),'']);
    sh.getRange(2,1,migrated.length,PRODUCTION_HEADERS.length).setValues(migrated);
  }
  sh.setFrozenRows(1);return sh;
}
function monthlySheetName_(date){
  const month=Utilities.formatDate(date,PRODUCTION_TIMEZONE,'MMMM').toUpperCase();
  const names={JANUARY:'ENERO',FEBRUARY:'FEBRERO',MARCH:'MARZO',APRIL:'ABRIL',MAY:'MAYO',JUNE:'JUNIO',JULY:'JULIO',AUGUST:'AGOSTO',SEPTEMBER:'SEPTIEMBRE',OCTOBER:'OCTUBRE',NOVEMBER:'NOVIEMBRE',DECEMBER:'DICIEMBRE'};
  return 'PEDIDOS_'+(names[month]||month)+'_'+Utilities.formatDate(date,PRODUCTION_TIMEZONE,'yyyy');
}
function currentOrdersSheet_(){
  return ensureCurrentMonthlyOrdersSheet_(getSS_());
}
function ensureCurrentMonthlyOrdersSheet_(ss){
  const name=monthlySheetName_(new Date());
  let sh=ss.getSheetByName(name);
  if(!sh){
    sh=ss.insertSheet(name);
    sh.getRange(1,1,1,ORDER_HEADERS.length).setValues([ORDER_HEADERS]);
  }else if(sh.getLastRow()===0){
    if(sh.getMaxColumns()<ORDER_HEADERS.length)throw new Error('La hoja mensual '+name+' no tiene espacio para las 17 columnas oficiales');
    sh.getRange(1,1,1,ORDER_HEADERS.length).setValues([ORDER_HEADERS]);
  }
  sh.setFrozenRows(1);
  return sh;
}

function doGet(e){
  const p=e&&e.parameter?e.parameter:{};
  console.log('Petición GET recibida: '+String(p.action||'dashboard'));
  try{
    if(p.token!==CONFIG.TOKEN)return respond_({ok:false,error:'Token inválido'},p.callback);
    if(p.action==='health'){
      console.log('Prueba de conexión procesada');
      return respond_({ok:true,success:true,message:'Google Apps Script conectado',timestamp:new Date().toISOString()},p.callback);
    }
    if(p.action==='operationStatus' || p.action==='getOperationStatusV2')return respond_(operationStatusCompat_(p),p.callback);
    if(p.action==='trackOrder')return respond_(trackOrder_(p),p.callback);
    console.log('Procesando GET: '+String(p.action||'dashboard'));
    if(p.action)return respond_({ok:true,action:p.action,data:executeAction_(p)},p.callback);
    const productionToday=getProductionDailyTotal_();
    console.log('[PRODUCCION] TOTAL encontrado: '+productionToday);
    const result={ok:true,orders:getOrders_(),production:getProductionSummary_(),productionTotal:productionToday,productionToday:productionToday};
    console.log('[PRODUCCION] Respuesta enviada: '+productionToday);
    console.log('Operación GET terminada');
    return respond_(result,p.callback);
  }catch(err){console.error('Error GET: '+errorMessage_(err));return respond_({ok:false,error:errorMessage_(err)},p.callback);}
}
function trackOrder_(p){
  const id=String(p.id||'').trim();
  if(!id)return {ok:false,error:'Ingresá un ID de pedido'};
  const location=findOrderLocation_(id);
  if(!location)return {ok:false,error:'No encontramos un pedido con ese ID'};
  const cols=getPedidoColumnIndexes_();
  const row=location.row;
  const cantidadPedida=Number(row[cols.cantidadPedida-1]||0);
  const cantidadRealizada=Number(row[cols.cantidadRealizada-1]||0);
  const estado=String(row[cols.estado-1]||'Pendiente');
  return {ok:true,order:{
    id:String(row[cols.id-1]||id),
    date:formatDate_(row[cols.fecha-1]),
    cliente:String(row[cols.nombre-1]||''),
    diseño:String(row[cols.diseño-1]||''),
    cantidadPedida:cantidadPedida,
    cantidadRealizada:cantidadRealizada,
    pendiente:Math.max(0,cantidadPedida-cantidadRealizada),
    estado:normalizeStatus_(estado),
    estadoText:String(row[cols.estado-1]||'Pendiente'),
    total:Number(row[cols.total-1]||0),
    seña:Number(row[cols.seña-1]||0)
  }};
}
function doPost(e){
  const p=e&&e.parameter?e.parameter:{};
  console.log('[POST] Petición recibida: '+String(p.action||''));
  console.log('[POST] Payload recibido: '+JSON.stringify(p));
  try{
    if(p.token!==CONFIG.TOKEN)return respond_({ok:false,error:'Token inválido'},p.callback);
    console.log('[POST] Datos interpretados');
    const result={ok:true,action:p.action,data:executeAction_(p)};
    console.log('[POST] Respuesta enviada');
    return respond_(result,p.callback);
  }catch(err){console.error('[POST] ERROR: '+errorMessage_(err));return respond_({ok:false,error:errorMessage_(err)},p.callback);}
}
function executeAction_(p){
  const action=p.action||'';
  if(action==='addOrder')return addOrder_(p);
  if(action==='updateOrder')return updateOrder_(p);
  if(action==='updateProduction')return updateProduction_(p);
  if(action==='updateStatus')return updateStatus_(p);
  if(action==='updateBatch')return updateBatch_(p);
  if(action==='deleteOrder')return deleteOrder_(p);
  if(action==='updateMachine')return updateMachine_(p);
  throw new Error('Acción no reconocida: '+action);
}
function operationStatus_(p){
  const operationId=String(p.operationId||'').trim();
  if(!operationId)return {ok:false,error:'Falta operationId'};
  const sh=getSS_().getSheetByName(CONFIG.OPERATIONS_SHEET);
  if(!sh||sh.getLastRow()<2)return {ok:true,pending:true,processed:false};
  const rows=readTable_(sh,OPERATION_HEADERS.length);
  for(let i=0;i<rows.length;i++)if(String(rows[i][0])===operationId){
    const status=String(rows[i][2]||'');
    return {ok:status==='OK',pending:false,processed:status==='OK',success:status==='OK',orderId:String(rows[i][1]||''),error:status==='OK'?'':status};
  }
  return {ok:true,pending:true,processed:false,success:true};
}
function operationStatusCompat_(p){
  const response=operationStatus_(p);
  return {
    success: !!(response && response.success !== false && response.ok !== false),
    processed: !!(response && response.processed),
    ok: !!(response && response.ok !== false),
    pending: !!(response && response.pending),
    orderId: response && response.orderId ? String(response.orderId) : '',
    error: response && response.error ? String(response.error) : '',
    message: response && response.processed ? 'Operación procesada' : 'Operación pendiente'
  };
}
function readTable_(sh,width){return sh.getLastRow()<2?[]:sh.getRange(2,1,sh.getLastRow()-1,width).getValues();}
function getPedidoColumnIndexes_(){
  return {
    id:1, fecha:2, nombre:3, redes:4, cantidadRealizada:5, cantidadPedida:6, queEsPedido:7, diseño:8,
    toppers:9, placa:10, tarjetas:11, seña:12, total:13, provincia:14, fechaEntrega:15, fechaAprox:16, estado:17
  };
}
function getOrders_(){
  const ss=getSS_();
  return getOrderSheets_().reduce((orders,sh)=>orders.concat(getCustomOrders_(sh)),[]);
}
function getOrderSheets_(){
  const sheets=getSS_().getSheets().filter(sh=>/^PEDIDOS_(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)_\d{4}$/.test(sh.getName()));
  sheets.forEach(sh=>{
    if(sh.getLastColumn()<ORDER_HEADERS.length)throw new Error('La hoja mensual '+sh.getName()+' no tiene las 17 columnas oficiales');
  });
  return sheets;
}
function customOrderColumns_(sh){
  return CUSTOM_ORDER_COLUMNS;
}
function isCustomOrdersSheet_(sh){
  return sh&&/^PEDIDOS_(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)_\d{4}$/.test(sh.getName())&&sh.getLastColumn()>=17;
}
function getCustomOrders_(sh){
  const c=customOrderColumns_(sh),values=readTable_(sh,sh.getLastColumn());
  return values.map(row=>({
    id:String(row[c.id]||''),
    date:formatDate_(row[c.date]),
    dueDate:formatDate_(row[c.dueDate]),
    client:String(row[c.client]||''),
    contact:String(row[c.contact]||''),
    product:String(row[c.product]||''),
    design:String(row[c.design]||''),
    qty:Number(row[c.qty]||0),
    done:Number(row[c.done]||0),
    pending:Math.max(0,Number(row[c.qty]||0)-Number(row[c.done]||0)),
    status:normalizeStatus_(row[c.status]),
    statusText:String(row[c.status]||'Pendiente'),
    machine:'',
    priority:'normal',
    updated:'',
    sheet:sh.getName()
  })).filter(order=>order.id!=='');
}
function getMachines_(){
  const sh=getSS_().getSheetByName(CONFIG.MACHINES_SHEET);
  const rows=sh?readTable_(sh,MACHINE_HEADERS.length):[],byId={};
  rows.forEach(r=>{if(r[0]!==''&&r[0]!=null)byId[String(r[0])]=r;});
  return MACHINE_NAMES.map((name,i)=>{
    const r=byId[String(i+1)]||[];let colors=[];
    try{colors=r[3]?JSON.parse(String(r[3])):[];}catch(_){}
    return {id:i+1,name:name,orderId:String(r[2]||''),colors:Array.isArray(colors)?colors.slice(0,16):[]};
  });
}
function findOrderRow_(sh,id){
  const rows=readTable_(sh,sh.getLastColumn());
  for(let i=0;i<rows.length;i++){
    const row=rows[i];
    if(String(row[0]||'')===String(id))return {index:i+2,row:row};
  }
  return null;
}
function findOrderLocation_(id){
  const ss=getSS_();
  const sheets=getOrderSheets_();
  for(let i=0;i<sheets.length;i++){
    const found=findOrderRow_(sheets[i],id);
    if(found)return {sheet:sheets[i],index:found.index,row:found.row};
  }
  return null;
}
function addOrder_(p){
  throw new Error('La aplicación no puede crear pedidos en Google Sheets. Los pedidos se crean manualmente en las hojas mensuales.');
}
function addOrderUnlocked_(p){
  throw new Error('La aplicación no puede crear filas ni modificar datos de pedidos en Google Sheets.');
}
function updateProduction_(p){
  const id=String(p.id||p.orderId||'').trim();
  if(!id)throw new Error('Falta el ID del pedido');
  const location=findOrderLocation_(id);
  if(!location)throw new Error('Pedido no encontrado: '+id);
  const sh=location.sheet;
  const rowIndex=location.index;
  const cols=getPedidoColumnIndexes_();
  const currentDone=Number((location.row[cols.cantidadRealizada-1]||0));
  const currentQty=Number((location.row[cols.cantidadPedida-1]||0));
  let nextDone=currentDone;
  if(p.value!==undefined || p.cantidadRealizada!==undefined || p.done!==undefined){
    nextDone=Number(p.value!==undefined?p.value:p.cantidadRealizada!==undefined?p.cantidadRealizada:p.done);
  }else if(p.delta!==undefined || p.increment!==undefined || p.add!==undefined){
    const delta=Number(p.delta!==undefined?p.delta:p.increment!==undefined?p.increment:p.add);
    nextDone=currentDone+delta;
  }else if(p.amount!==undefined){
    nextDone=Number(p.amount);
  }else if(p.newValue!==undefined){
    nextDone=Number(p.newValue);
  }else {
    throw new Error('No se recibió un valor para actualizar la cantidad realizada');
  }
  const minValue=0;
  const maxValue=Math.max(0,currentQty);
  if(!Number.isFinite(nextDone) || nextDone < minValue || nextDone > maxValue){
    throw new Error('La cantidad realizada debe estar entre 0 y '+maxValue+' para el pedido '+id);
  }
  sh.getRange(rowIndex, cols.cantidadRealizada).setValue(nextDone);
  const status=String(location.row[cols.estado-1]||'');
  if(status && nextDone >= currentQty && !/listo|entregado|mensaje/i.test(status)){
    sh.getRange(rowIndex, cols.estado).setValue('Listo');
  }
  return {
    ok:true,
    id:id,
    cantidadRealizada:nextDone,
    cantidadPedida:currentQty,
    pendiente:Math.max(0,currentQty-nextDone),
    estado:status && nextDone >= currentQty ? 'Listo' : String(location.row[cols.estado-1]||'Pendiente')
  };
}
function updateStatus_(p){
  const id=String(p.id||p.orderId||'').trim();
  if(!id)throw new Error('Falta el ID del pedido');
  const location=findOrderLocation_(id);
  if(!location)throw new Error('Pedido no encontrado: '+id);
  const cols=getPedidoColumnIndexes_();
  const rawStatus=String(p.status||p.estado||p.newStatus||'').trim();
  const normalized=normalizeStatusValue_(rawStatus);
  if(!normalized)throw new Error('Estado inválido para la columna Q');
  location.sheet.getRange(location.index, cols.estado).setValue(normalized);
  return {ok:true,id:id,estado:normalized};
}
function normalizeStatusValue_(value){
  const status=String(value||'').trim();
  if(!status)return '';
  const normalized=status.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const map={
    'pendiente':'Pendiente',
    'iniciado':'Iniciado',
    'produciendo':'Produciendo',
    'listo':'Listo',
    'mensaje':'Mensaje',
    'entregado':'Entregado',
    'pending':'Pendiente',
    'production':'Produciendo',
    'started':'Iniciado',
    'done':'Listo',
    'completado':'Listo'
  };
  return map[normalized] || status;
}
function updateBatch_(p){
  let changes=[];
  try{changes=JSON.parse(String(p.changes||'[]'));}catch(_){throw new Error('El lote de pedidos no tiene JSON válido');}
  if(!Array.isArray(changes)||changes.length>50)throw new Error('El lote de cambios es inválido o demasiado grande');
  const lock=LockService.getScriptLock();lock.waitLock(10000);
  try{
    const results=[];
    changes.forEach(change=>{
      const id=String(change.id||change.orderId||'').trim();
      if(!id)throw new Error('El lote incluye un pedido sin ID');
      if(change.status!==undefined || change.estado!==undefined || change.newStatus!==undefined){
        results.push(updateStatus_({id:id,status:change.status!==undefined?change.status:change.estado!==undefined?change.estado:change.newStatus}));
      }else if(change.value!==undefined || change.done!==undefined || change.cantidadRealizada!==undefined || change.delta!==undefined || change.increment!==undefined || change.amount!==undefined || change.newValue!==undefined){
        results.push(updateProduction_({id:id,value:change.value!==undefined?change.value:change.done!==undefined?change.done:change.cantidadRealizada!==undefined?change.cantidadRealizada:change.amount!==undefined?change.amount:change.newValue!==undefined?change.newValue:undefined,delta:change.delta!==undefined?change.delta:change.increment!==undefined?change.increment:undefined}));
      }else {
        throw new Error('Cambio inválido para el pedido '+id+'. Debe incluir status o cantidadRealizada.');
      }
    });
    return {ok:true,orders:results.length,results:results};
  }finally{lock.releaseLock();}
}
function updateOrder_(p){const lock=LockService.getScriptLock();lock.waitLock(10000);try{
  if(p.status!==undefined || p.estado!==undefined || p.newStatus!==undefined)return updateStatus_(p);
  return updateProduction_(p);
}finally{lock.releaseLock();}}
function updateOrderUnlocked_(p){
  if(p.status!==undefined || p.estado!==undefined || p.newStatus!==undefined)return updateStatus_(p);
  return updateProduction_(p);
}
function updateCustomOrderUnlocked_(location,p){
  return updateStatus_(p);
}
function updateMachine_(p){throw new Error('La aplicación no puede modificar máquinas en Google Sheets');}
function updateMachineUnlocked_(p){
  throw new Error('La aplicación no puede modificar la hoja de máquinas');
}
function upsertActiveProduction_(p){
  const sh=ensureProductionSheet_(getSS_()),rows=readTable_(sh,PRODUCTION_HEADERS.length),id='ACTIVE|'+String(p.id);
  const values=[Utilities.formatDate(new Date(),PRODUCTION_TIMEZONE,'yyyy-MM-dd'),p.id,p.design,p.planned,p.done,p.machine,'INICIADO',p.colors||'','ACTIVE',id,''];
  for(let i=0;i<rows.length;i++)if(String(rows[i][9])===id){sh.getRange(i+2,1,1,PRODUCTION_HEADERS.length).setValues([values]);recalculateProductionTotal_();return;}
  sh.getRange(sh.getLastRow()+1,1,1,PRODUCTION_HEADERS.length).setValues([values]);
  recalculateProductionTotal_();
}
function removeActiveProduction_(orderId){
  const sh=getSS_().getSheetByName(CONFIG.PRODUCTION_SHEET);if(!sh||sh.getLastRow()<2)return;
  const rows=readTable_(sh,PRODUCTION_HEADERS.length);let removed=false;
  for(let i=rows.length-1;i>=0;i--)if(String(rows[i][9])==='ACTIVE|'+orderId){sh.deleteRow(i+2);removed=true;}
  if(removed)recalculateProductionTotal_();
}
function appendProductionEvent_(p){
  const sh=ensureProductionSheet_(getSS_()),date=Utilities.formatDate(new Date(),PRODUCTION_TIMEZONE,'yyyy-MM-dd'),eventId='EVENT|'+p.id+'|'+date+'|'+String(p.total),rows=readTable_(sh,PRODUCTION_HEADERS.length);
  for(let i=0;i<rows.length;i++)if(String(rows[i][9])===eventId)return;
  sh.getRange(sh.getLastRow()+1,1,1,PRODUCTION_HEADERS.length).setValues([[date,p.id,p.design,0,p.units,p.machine,p.status==='COMPLETADO'?'COMPLETADO':'INICIADO',p.colors||'','HISTORICAL',eventId,'']]);
  upsertDailySummary_(date,p.units);
}
function recalculateProductionTotal_(){
  const sh=ensureProductionSheet_(getSS_()),rows=readTable_(sh,PRODUCTION_HEADERS.length);
  const total=rows.reduce((sum,row)=>sum+(String(row[8]||'')==='ACTIVE'?Number(row[3]||0):0),0);
  let totalRow=-1;
  for(let i=0;i<rows.length;i++){
    if(String(rows[i][0]||'')===PRODUCTION_TOTAL_LABEL&&String(rows[i][9]||'')==='TOTAL'){
      totalRow=i+2;
      break;
    }
  }
  const values=[PRODUCTION_TOTAL_LABEL,'','','','','','','','SUMMARY','TOTAL',total];
  if(totalRow<0)sh.getRange(sh.getLastRow()+1,1,1,PRODUCTION_HEADERS.length).setValues([values]);
  else sh.getRange(totalRow,1,1,PRODUCTION_HEADERS.length).setValues([values]);
  return total;
}
function getProductionDailyTotal_(){
  const sh=ensureProductionSheet_(getSS_()),total=recalculateProductionTotal_();
  const rows=readTable_(sh,PRODUCTION_HEADERS.length);
  for(let i=0;i<rows.length;i++){
    if(String(rows[i][0]||'')===PRODUCTION_TOTAL_LABEL&&String(rows[i][9]||'')==='TOTAL')return Number(rows[i][10]||0);
  }
  return total;
}
function upsertDailySummary_(date,units){
  const sh=ensureSheet_(getSS_(),CONFIG.SUMMARY_SHEET,SUMMARY_HEADERS),rows=readTable_(sh,2);
  for(let i=0;i<rows.length;i++)if(String(rows[i][0])===date){sh.getRange(i+2,2).setValue(Number(rows[i][1]||0)+Number(units));return;}
  sh.getRange(sh.getLastRow()+1,1,1,2).setValues([[date,Number(units)]]);
}
function getProductionSummary_(){
  const sh=getSS_().getSheetByName(CONFIG.SUMMARY_SHEET);if(!sh||sh.getLastRow()<2)return {};
  const out={};readTable_(sh,2).forEach(r=>{if(r[0])out[String(r[0])]=Number(r[1]||0);});return out;
}
function deleteOrder_(p){
  throw new Error('La aplicación no puede eliminar pedidos en Google Sheets');
}
function normalizeStatus_(value){
  const status=String(value||'').trim();
  if(!status)return 'Pendiente';
  const normalized=status.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const map={
    'pendiente':'pending',
    'iniciado':'production',
    'produciendo':'production',
    'listo':'done',
    'completado':'done',
    'mensaje':'mensaje',
    'entregado':'entregado',
    'done':'done',
    'production':'production',
    'started':'production',
    'pending':'pending'
  };
  return map[normalized] || status;
}
function parseColors_(value){try{const parsed=value?JSON.parse(String(value)):[];return Array.isArray(parsed)?Array.from(new Set(parsed)).slice(0,16):[];}catch(_){return [];}}
function formatDate_(v){if(!v)return '';if(Object.prototype.toString.call(v)==='[object Date]'&&!isNaN(v))return Utilities.formatDate(v,PRODUCTION_TIMEZONE,'yyyy-MM-dd');return String(v);}
function errorMessage_(err){return err&&err.message?err.message:String(err);}
function respond_(obj,callback){const text=JSON.stringify(obj);if(callback&&/^[A-Za-z_$][\w$]*$/.test(callback))return ContentService.createTextOutput(callback+'('+text+');').setMimeType(ContentService.MimeType.JAVASCRIPT);return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.JSON);}
