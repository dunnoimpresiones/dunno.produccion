const CONFIG = {
  SPREADSHEET_ID: '1fNaERltql_EDl1IGn1TnnMDT_X-a1t96E_zrkfggHIg',
  ORDERS_SHEET: 'PEDIDOS',
  PRODUCTION_SHEET: 'PRODUCCION_DIARIA',
  SUMMARY_SHEET: 'RESUMEN_PRODUCCION',
  MACHINES_SHEET: 'MAQUINAS',
  TOKEN: 'Dunno0109'
};

const ORDER_HEADERS = ['ID','Fecha','Hora','Cliente','Contacto','Producto','Diseño','Cantidad','Producidos','Estado','Máquina','Fecha_inicio','Fecha_completado','Prioridad','Actualizado'];
const PRODUCTION_HEADERS = ['Fecha','Pedido','Diseño','Cantidad a producir','Cantidad realizada','Máquina','Estado','Colores','Tipo','ID_PRODUCCION'];
const SUMMARY_HEADERS = ['Fecha','Total_produccion'];
const MACHINE_HEADERS = ['ID','Maquina','Pedido','Colores','Actualizado'];
const MACHINE_NAMES = ['A1','A2','A3','A4','A5','A6','Amini','V3','CR10'];
const PRODUCTION_TIMEZONE = 'America/Argentina/Buenos_Aires';

function getSS_(){ return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID); }
function setup(){
  const ss=getSS_();
  currentOrdersSheet_();
  ensureProductionSheet_(ss);
  ensureSheet_(ss,CONFIG.SUMMARY_SHEET,SUMMARY_HEADERS);
  const sh=ensureSheet_(ss,CONFIG.MACHINES_SHEET,MACHINE_HEADERS);
  const rows=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,5).getValues():[],byId={};
  rows.forEach(r=>{if(r[0]!==''&&r[0]!=null)byId[String(r[0])]=r;});
  sh.getRange(2,1,MACHINE_NAMES.length,5).setValues(MACHINE_NAMES.map((name,i)=>byId[String(i+1)]||[i+1,name,'','',new Date()]));
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
    const migrated=oldRows.map((r,i)=>[r[0],r[1],r[2],0,Number(r[3]||0),r[4],r[5],r[6],'HISTORICAL','LEGACY|'+String(i+2)]);
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
  const ss=getSS_(),name=monthlySheetName_(new Date()),existing=ss.getSheetByName(name);
  const oldHeader=existing&&existing.getLastRow()>0?existing.getRange(1,1,1,Math.min(ORDER_HEADERS.length,existing.getLastColumn())).getValues()[0].map(String):[];
  const oldRows=existing&&oldHeader[1]!=='Fecha'&&existing.getLastRow()>1?existing.getRange(2,1,existing.getLastRow()-1,Math.min(9,existing.getLastColumn())).getValues().filter(r=>r[0]!==''&&r[0]!=null):[];
  const sh=ensureSheet_(ss,name,ORDER_HEADERS);
  const legacy=ss.getSheetByName(CONFIG.ORDERS_SHEET);
  if(sh.getLastRow()<2&&oldRows.length){
    const rows=oldRows.map(r=>[String(r[0]),formatDate_(r[6]),'',String(r[1]||''),'','',String(r[2]||''),Number(r[3]||0),Number(r[4]||0),normalizeStatus_(r[5]),'','','',String(r[7]||'normal'),r[8]||new Date()]);
    sh.getRange(2,1,rows.length,ORDER_HEADERS.length).setValues(rows);
  }else if(sh.getLastRow()<2&&legacy&&legacy.getLastRow()>1){
    const legacyRows=legacy.getRange(2,1,legacy.getLastRow()-1,Math.min(9,legacy.getLastColumn())).getValues();
    const rows=legacyRows.filter(r=>r[0]!==''&&r[0]!=null).map(r=>[
      String(r[0]),formatDate_(r[6]),'',String(r[1]||''),'','',String(r[2]||''),Number(r[3]||0),
      Number(r[4]||0),normalizeStatus_(r[5]),'','','',String(r[7]||'normal'),r[8]||new Date()
    ]);
    if(rows.length)sh.getRange(2,1,rows.length,ORDER_HEADERS.length).setValues(rows);
  }
  return sh;
}

function doGet(e){
  const p=e&&e.parameter?e.parameter:{};
  try{
    if(p.token!==CONFIG.TOKEN)return respond_({ok:false,error:'Token inválido'},p.callback);
    if(p.action)return respond_({ok:true,action:p.action,data:executeAction_(p)},p.callback);
    return respond_({ok:true,orders:getOrders_(),production:getProductionSummary_(),machines:getMachines_()},p.callback);
  }catch(err){return respond_({ok:false,error:errorMessage_(err)},p.callback);}
}
function doPost(e){
  const p=e&&e.parameter?e.parameter:{};
  try{
    if(p.token!==CONFIG.TOKEN)return respond_({ok:false,error:'Token inválido'},p.callback);
    return respond_({ok:true,action:p.action,data:executeAction_(p)},p.callback);
  }catch(err){return respond_({ok:false,error:errorMessage_(err)},p.callback);}
}
function executeAction_(p){
  const action=p.action||'';
  if(action==='addOrder')return addOrder_(p);
  if(action==='updateOrder')return updateOrder_(p);
  if(action==='updateBatch')return updateBatch_(p);
  if(action==='deleteOrder')return deleteOrder_(p);
  if(action==='updateMachine')return updateMachine_(p);
  throw new Error('Acción no reconocida: '+action);
}
function readTable_(sh,width){return sh.getLastRow()<2?[]:sh.getRange(2,1,sh.getLastRow()-1,width).getValues();}
function getOrders_(){
  const ss=getSS_(),sheets=ss.getSheets().filter(sh=>/^PEDIDOS_[A-ZÁÉÍÓÚ]+_\d{4}$/.test(sh.getName()));
  if(!sheets.some(sh=>sh.getName()===monthlySheetName_(new Date())))sheets.push(currentOrdersSheet_());
  return [].concat.apply([],sheets.map(sh=>readTable_(sh,ORDER_HEADERS.length))).filter(r=>r[0]!==''&&r[0]!=null).map(r=>({
    id:String(r[0]),date:formatDate_(r[1]),time:String(r[2]||''),client:String(r[3]||''),contact:String(r[4]||''),
    product:String(r[5]||''),design:String(r[6]||''),qty:Number(r[7]||0),done:Number(r[8]||0),
    status:normalizeStatus_(r[9]),machine:String(r[10]||''),priority:String(r[13]||'normal'),updated:r[14]?String(r[14]):''
  }));
}
function getMachines_(){
  const rows=readTable_(ensureSheet_(getSS_(),CONFIG.MACHINES_SHEET,MACHINE_HEADERS),MACHINE_HEADERS.length),byId={};
  rows.forEach(r=>{if(r[0]!==''&&r[0]!=null)byId[String(r[0])]=r;});
  return MACHINE_NAMES.map((name,i)=>{
    const r=byId[String(i+1)]||[];let colors=[];
    try{colors=r[3]?JSON.parse(String(r[3])):[];}catch(_){}
    return {id:i+1,name:name,orderId:String(r[2]||''),colors:Array.isArray(colors)?colors.slice(0,16):[]};
  });
}
function findOrderRow_(sh,id){
  const rows=readTable_(sh,ORDER_HEADERS.length);
  for(let i=0;i<rows.length;i++)if(String(rows[i][0])===String(id))return {index:i+2,row:rows[i]};
  return null;
}
function findOrderLocation_(id){
  const ss=getSS_(),sheets=ss.getSheets().filter(sh=>/^PEDIDOS_[A-ZÁÉÍÓÚ]+_\d{4}$/.test(sh.getName()));
  for(let i=0;i<sheets.length;i++){const found=findOrderRow_(sheets[i],id);if(found)return {sheet:sheets[i],index:found.index,row:found.row};}
  return null;
}
function addOrder_(p){
  const lock=LockService.getScriptLock();lock.waitLock(10000);
  try{return addOrderUnlocked_(p);}finally{lock.releaseLock();}
}
function addOrderUnlocked_(p){
  const id=String(p.id||'').trim(),design=String(p.design||'').trim(),qty=Number(p.qty||0);
  if(!id||!design||qty<=0)throw new Error('Datos de pedido incompletos');
  const sh=currentOrdersSheet_(),existing=findOrderLocation_(id);
  if(existing)return {id:id,created:false,duplicate:true};
  const now=new Date(),date=p.date?String(p.date):Utilities.formatDate(now,PRODUCTION_TIMEZONE,'yyyy-MM-dd');
  sh.getRange(sh.getLastRow()+1,1,1,ORDER_HEADERS.length).setValues([[
    id,date,Utilities.formatDate(now,PRODUCTION_TIMEZONE,'HH:mm:ss'),String(p.client||''),String(p.contact||''),
    String(p.product||''),design,qty,0,'pending','', '', '',String(p.priority||'normal'),now
  ]]);
  return {id:id,created:true,sheet:sh.getName()};
}
function updateBatch_(p){
  let changes=[],machines=[],newOrders=[];
  try{changes=JSON.parse(String(p.changes||'[]'));}catch(_){throw new Error('El lote de pedidos no tiene JSON válido');}
  try{machines=JSON.parse(String(p.machines||'[]'));}catch(_){throw new Error('El lote de máquinas no tiene JSON válido');}
  try{newOrders=JSON.parse(String(p.newOrders||'[]'));}catch(_){throw new Error('El lote de nuevos pedidos no tiene JSON válido');}
  if(!Array.isArray(changes)||!Array.isArray(machines)||!Array.isArray(newOrders)||changes.length>50||machines.length>50||newOrders.length>50)throw new Error('El lote de cambios es inválido o demasiado grande');
  const lock=LockService.getScriptLock();lock.waitLock(10000);
  try{newOrders.forEach(addOrderUnlocked_);changes.forEach(updateOrderUnlocked_);machines.forEach(updateMachineUnlocked_);return {newOrders:newOrders.length,orders:changes.length,machines:machines.length};}finally{lock.releaseLock();}
}
function updateOrder_(p){const lock=LockService.getScriptLock();lock.waitLock(10000);try{return updateOrderUnlocked_(p);}finally{lock.releaseLock();}}
function updateOrderUnlocked_(p){
  const location=findOrderLocation_(p.id);if(!location)throw new Error('Pedido no encontrado: '+String(p.id||''));const sh=location.sheet,found={index:location.index,row:location.row};
  const row=found.row,qty=Number(row[7]||0),previous=Number(row[8]||0),done=Math.min(qty,Math.max(0,Number(p.done||0)));
  const status=done>=qty?'COMPLETADO':done>0?'INICIADO':'PENDIENTE';
  row[8]=done;row[9]=status;row[14]=new Date();if(p.machine)row[10]=String(p.machine);
  if(status==='INICIADO'&&!row[11])row[11]=new Date();if(status==='COMPLETADO'&&!row[12])row[12]=new Date();
  sh.getRange(found.index,1,1,ORDER_HEADERS.length).setValues([row]);
  if(done>previous)appendProductionEvent_({id:String(row[0]),design:String(row[6]||''),units:done-previous,total:done,machine:String(p.machine||row[10]||''),colors:String(p.colors||''),status:status});
  if(status==='INICIADO'&&row[10])upsertActiveProduction_({id:String(row[0]),design:String(row[6]||''),planned:qty,done:done,machine:String(row[10]),colors:String(p.colors||'')});
  if(status==='COMPLETADO')removeActiveProduction_(String(row[0]));
  return {id:String(row[0]),done:done,status:normalizeStatus_(status)};
}
function updateMachine_(p){const lock=LockService.getScriptLock();lock.waitLock(10000);try{return updateMachineUnlocked_(p);}finally{lock.releaseLock();}}
function updateMachineUnlocked_(p){
  const id=Number(p.machineId||0);if(id<1||id>MACHINE_NAMES.length)throw new Error('Máquina inválida');
  const sh=ensureSheet_(getSS_(),CONFIG.MACHINES_SHEET,MACHINE_HEADERS),colors=parseColors_(p.colors),orderId=String(p.orderId||'');
  sh.getRange(id+1,1,1,5).setValues([[id,MACHINE_NAMES[id-1],orderId,JSON.stringify(colors),new Date()]]);
  if(orderId){
    const location=findOrderLocation_(orderId);if(!location)throw new Error('Pedido no encontrado: '+orderId);const orders=location.sheet,found={index:location.index,row:location.row};
    const row=found.row;if(normalizeStatus_(row[9])!=='done'){row[9]='INICIADO';row[10]=MACHINE_NAMES[id-1];row[11]=row[11]||new Date();row[14]=new Date();orders.getRange(found.index,1,1,ORDER_HEADERS.length).setValues([row]);upsertActiveProduction_({id:orderId,design:String(row[6]||''),planned:Number(row[7]||0),done:Number(row[8]||0),machine:MACHINE_NAMES[id-1],colors:JSON.stringify(colors)});}
  }
  return {machineId:id,orderId:orderId};
}
function upsertActiveProduction_(p){
  const sh=ensureProductionSheet_(getSS_()),rows=readTable_(sh,PRODUCTION_HEADERS.length),id='ACTIVE|'+String(p.id);
  const values=[Utilities.formatDate(new Date(),PRODUCTION_TIMEZONE,'yyyy-MM-dd'),p.id,p.design,p.planned,p.done,p.machine,'INICIADO',p.colors||'','ACTIVE',id];
  for(let i=0;i<rows.length;i++)if(String(rows[i][9])===id){sh.getRange(i+2,1,1,PRODUCTION_HEADERS.length).setValues([values]);return;}
  sh.getRange(sh.getLastRow()+1,1,1,PRODUCTION_HEADERS.length).setValues([values]);
}
function removeActiveProduction_(orderId){
  const sh=getSS_().getSheetByName(CONFIG.PRODUCTION_SHEET);if(!sh||sh.getLastRow()<2)return;
  const rows=readTable_(sh,PRODUCTION_HEADERS.length);for(let i=rows.length-1;i>=0;i--)if(String(rows[i][9])==='ACTIVE|'+orderId)sh.deleteRow(i+2);
}
function appendProductionEvent_(p){
  const sh=ensureProductionSheet_(getSS_()),date=Utilities.formatDate(new Date(),PRODUCTION_TIMEZONE,'yyyy-MM-dd'),eventId='EVENT|'+p.id+'|'+date+'|'+String(p.total),rows=readTable_(sh,PRODUCTION_HEADERS.length);
  for(let i=0;i<rows.length;i++)if(String(rows[i][9])===eventId)return;
  sh.getRange(sh.getLastRow()+1,1,1,PRODUCTION_HEADERS.length).setValues([[date,p.id,p.design,0,p.units,p.machine,p.status==='COMPLETADO'?'COMPLETADO':'INICIADO',p.colors||'','HISTORICAL',eventId]]);
  upsertDailySummary_(date,p.units);
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
  const location=findOrderLocation_(p.id);if(!location)throw new Error('Pedido no encontrado: '+String(p.id||''));const sh=location.sheet,found={index:location.index,row:location.row};
  sh.deleteRow(found.index);removeActiveProduction_(String(p.id));return {id:String(p.id),deleted:true};
}
function normalizeStatus_(value){
  const status=String(value||'').toLowerCase();
  return status==='done'||status==='completado'?'done':status==='production'||status==='started'||status==='iniciado'?'production':'pending';
}
function parseColors_(value){try{const parsed=value?JSON.parse(String(value)):[];return Array.isArray(parsed)?Array.from(new Set(parsed)).slice(0,16):[];}catch(_){return [];}}
function formatDate_(v){if(!v)return '';if(Object.prototype.toString.call(v)==='[object Date]'&&!isNaN(v))return Utilities.formatDate(v,PRODUCTION_TIMEZONE,'yyyy-MM-dd');return String(v);}
function errorMessage_(err){return err&&err.message?err.message:String(err);}
function respond_(obj,callback){const text=JSON.stringify(obj);if(callback&&/^[A-Za-z_$][\w$]*$/.test(callback))return ContentService.createTextOutput(callback+'('+text+');').setMimeType(ContentService.MimeType.JAVASCRIPT);return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.JSON);}
