const CONFIG = {
  SPREADSHEET_ID: '1fNaERltql_EDl1IGn1TnnMDT_X-a1t96E_zrkfggHIg',
  ORDERS_SHEET: 'PEDIDOS',
  PRODUCTION_SHEET: 'PRODUCCION_DIARIA',
  MACHINES_SHEET: 'MAQUINAS',
  TOKEN: 'Dunno0109'
};

const ORDER_HEADERS = ['ID','Cliente','Diseño','Cantidad','Producidos','Estado','Entrega','Prioridad','Actualizado'];
const PRODUCTION_HEADERS = ['Fecha','Pedido','Diseño','Cantidad','Máquina','Estado','Colores'];
const PRODUCTION_TIMEZONE = 'America/Argentina/Buenos_Aires';
const MACHINE_HEADERS = ['ID','Maquina','Pedido','Colores','Actualizado'];
const MACHINE_NAMES = ['A1','A2','A3','A4','A5','A6','Amini','V3','CR10'];

function getSS_(){ return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID); }

function setup(){
  const ss=getSS_();
  const pedidos=ensureSheet_(ss,CONFIG.ORDERS_SHEET,ORDER_HEADERS);
  ensureSheet_(ss,CONFIG.PRODUCTION_SHEET,PRODUCTION_HEADERS);
  const machines=ensureSheet_(ss,CONFIG.MACHINES_SHEET,MACHINE_HEADERS);
  if(machines.getLastRow()<2){
    const now=new Date();
    machines.getRange(2,1,MACHINE_NAMES.length,5).setValues(
      MACHINE_NAMES.map((name,i)=>[i+1,name,'','',now])
    );
  } else {
    const existing=machines.getRange(2,1,Math.max(0,machines.getLastRow()-1),5).getValues();
    const byId={};
    existing.forEach(r=>{if(r[0]!==''&&r[0]!=null)byId[String(r[0])]=r;});
    const rows=MACHINE_NAMES.map((name,i)=>byId[String(i+1)]||[i+1,name,'','',new Date()]);
    machines.getRange(2,1,rows.length,5).setValues(rows);
  }
  pedidos.setFrozenRows(1);
  return 'OK';
}

function ensureSheet_(ss,name,headers){
  let sh=ss.getSheetByName(name);
  if(!sh) sh=ss.insertSheet(name);
  sh.getRange(1,1,1,headers.length).setValues([headers]);
  sh.setFrozenRows(1);
  sh.getRange(1,1,1,headers.length).setFontWeight('bold');
  return sh;
}

function doGet(e){
  try{
    const p=e&&e.parameter?e.parameter:{};
    if(p.token!==CONFIG.TOKEN) return respond_({ok:false,error:'Token inválido'},p.callback);
    if(p.action){
      executeAction_(p);
      return respond_({ok:true,action:p.action},p.callback);
    }
    const data=getDashboardData_();
    return respond_(data,p.callback);
  }catch(err){
    return respond_({ok:false,error:String(err)},e&&e.parameter?e.parameter.callback:'');
  }
}

function doPost(e){
  try{
    const p=e&&e.parameter?e.parameter:{};
    if(p.token!==CONFIG.TOKEN) return html_('Token inválido');
    executeAction_(p);
    return html_('OK');
  }catch(err){ return html_('ERROR: '+String(err)); }
}

function executeAction_(p){
  const action=p.action||'';
  if(action==='addOrder') addOrder_(p);
  else if(action==='updateOrder') updateOrder_(p);
  else if(action==='updateBatch') updateBatch_(p);
  else if(action==='deleteOrder') deleteOrder_(p);
  else if(action==='updateMachine') updateMachine_(p);
  else throw new Error('Acción no reconocida: '+action);
}

function getDashboardData_(){
  return {ok:true,orders:getOrders_(),production:getProductionSummary_(),machines:getMachines_()};
}

function getOrders_(){
  const sh=getSS_().getSheetByName(CONFIG.ORDERS_SHEET);
  if(!sh || sh.getLastRow()<2) return [];
  const rows=sh.getRange(2,1,sh.getLastRow()-1,ORDER_HEADERS.length).getValues();
  return rows.filter(r=>r[0]!==''&&r[0]!=null).map(r=>({
    id:String(r[0]), client:String(r[1]||''), design:String(r[2]||''), qty:Number(r[3]||0),
    done:Number(r[4]||0), status:String(r[5]||'pending'), date:formatDate_(r[6]),
    priority:String(r[7]||'normal'), updated:r[8]?String(r[8]):''
  }));
}

function getMachines_(){
  const sh=getSS_().getSheetByName(CONFIG.MACHINES_SHEET);
  if(!sh || sh.getLastRow()<2){ setup(); return getMachines_(); }
  const rows=sh.getRange(2,1,sh.getLastRow()-1,5).getValues();
  const byId={};
  rows.forEach(r=>{if(r[0]!==''&&r[0]!=null)byId[String(r[0])]=r;});
  return MACHINE_NAMES.map((name,i)=>{
    const r=byId[String(i+1)]||[];
    let colors=[];
    try{ colors=r[3]?JSON.parse(String(r[3])):[]; }catch(_){ colors=String(r[3]||'').split(',').map(s=>s.trim()).filter(Boolean); }
    return {id:i+1,name:name,orderId:String(r[2]||''),colors:Array.isArray(colors)?colors.slice(0,16):[]};
  });
}

function updateMachine_(p){
  const sh=getSS_().getSheetByName(CONFIG.MACHINES_SHEET)||ensureSheet_(getSS_(),CONFIG.MACHINES_SHEET,MACHINE_HEADERS);
  const id=Number(p.machineId||0);
  if(id<1||id>MACHINE_NAMES.length) throw new Error('Máquina inválida');
  let colors=[];
  try{ colors=p.colors?JSON.parse(p.colors):[]; }catch(_){ colors=[]; }
  colors=Array.isArray(colors)?colors.slice(0,16):[];
  const row=id+1;
  sh.getRange(row,1,1,5).setValues([[id,MACHINE_NAMES[id-1],String(p.orderId||''),JSON.stringify(colors),new Date()]]);
}

function addOrder_(p){
  const sh=getSS_().getSheetByName(CONFIG.ORDERS_SHEET)||ensureSheet_(getSS_(),CONFIG.ORDERS_SHEET,ORDER_HEADERS);
  const id=String(p.id||'').trim();
  const design=String(p.design||'').trim();
  const qty=Number(p.qty||0);
  if(!id||!design||qty<=0) throw new Error('Datos de pedido incompletos');
  const existing=getOrders_().some(o=>String(o.id)===id);
  if(existing) throw new Error('Ya existe el pedido '+id);
  const now=new Date();
  sh.appendRow([id,String(p.client||''),design,qty,0,'pending',String(p.date||''),String(p.priority||'normal'),now]);
}

function updateOrder_(p){
  const lock=LockService.getScriptLock();
  lock.waitLock(10000);
  try{
    return updateOrderUnlocked_(p);
  }finally{ lock.releaseLock(); }
}

function updateBatch_(p){
  let changes=[];
  try{ changes=JSON.parse(String(p.changes||'[]')); }catch(_){ throw new Error('El lote de cambios no tiene formato JSON válido'); }
  if(!Array.isArray(changes)||changes.length>50) throw new Error('El lote de cambios es inválido o demasiado grande');
  const lock=LockService.getScriptLock();
  lock.waitLock(10000);
  try{
    changes.forEach(change=>updateOrderUnlocked_(change));
    return {count:changes.length};
  }finally{ lock.releaseLock(); }
}

function updateOrderUnlocked_(p){
    const sh=getSS_().getSheetByName(CONFIG.ORDERS_SHEET);
    if(!sh) throw new Error('No existe PEDIDOS');
    const id=String(p.id||'');
    const newDone=Math.max(0,Number(p.done||0));
    const rows=sh.getRange(2,1,Math.max(0,sh.getLastRow()-1),ORDER_HEADERS.length).getValues();
    for(let i=0;i<rows.length;i++){
      if(String(rows[i][0])===id){
        const previous=Number(rows[i][4]||0);
        const qty=Number(rows[i][3]||0);
        const done=Math.min(qty,newDone);
        const status=done>=qty?'done':done>0?'production':'pending';
        rows[i][4]=done; rows[i][5]=status; rows[i][8]=new Date();
        sh.getRange(i+2,1,1,ORDER_HEADERS.length).setValues([rows[i]]);
        const difference=done-previous;
        if(difference>0) appendProduction_({
          id:id,
          design:String(rows[i][2]||''),
          units:difference,
          machine:String(p.machine||p.machineName||''),
          colors:String(p.colors||''),
          status:status
        });
        return;
      }
    }
    throw new Error('Pedido no encontrado: '+id);
}

function appendProduction_(production){
  const sh=getProductionSheet_();
  const now=new Date();
  const date=Utilities.formatDate(now,PRODUCTION_TIMEZONE,'yyyy-MM-dd');
  sh.appendRow([
    date,
    production.id,
    production.design,
    production.units,
    production.machine,
    production.status==='done'?'Completado':'En producción',
    production.colors
  ]);
}

function getProductionSheet_(){
  const sh=getSS_().getSheetByName(CONFIG.PRODUCTION_SHEET);
  if(!sh) throw new Error('No existe la hoja "'+CONFIG.PRODUCTION_SHEET+'". Ejecutá setup() para crearla.');
  if(sh.getLastColumn()<PRODUCTION_HEADERS.length) sh.insertColumnsAfter(sh.getLastColumn(),PRODUCTION_HEADERS.length-sh.getLastColumn());
  const headers=sh.getRange(1,1,1,PRODUCTION_HEADERS.length).getValues()[0].map(String);
  PRODUCTION_HEADERS.forEach((header,i)=>{
    if(headers[i].trim()!==header) sh.getRange(1,i+1).setValue(header);
  });
  return sh;
}

function deleteOrder_(p){
  const sh=getSS_().getSheetByName(CONFIG.ORDERS_SHEET);
  if(!sh) throw new Error('No existe PEDIDOS');
  const id=String(p.id||'');
  for(let r=sh.getLastRow();r>=2;r--){ if(String(sh.getRange(r,1).getValue())===id){ sh.deleteRow(r); return; } }
  throw new Error('Pedido no encontrado: '+id);
}

function getProductionSummary_(){
  const sh=getProductionSheet_();
  if(sh.getLastRow()<2) return {};
  const rows=sh.getRange(2,1,sh.getLastRow()-1,4).getValues();
  const out={};
  rows.forEach(r=>{
    const d=r[0];
    if(!d)return;
    const text=String(d);
    const k=/^\d{4}-\d{2}-\d{2}$/.test(text)
      ? text
      : Utilities.formatDate(new Date(d),PRODUCTION_TIMEZONE,'yyyy-MM-dd');
    out[k]=(Number(out[k]||0)+Number(r[3]||0));
  });
  return out;
}

function formatDate_(v){
  if(!v) return '';
  if(Object.prototype.toString.call(v)==='[object Date]'&&!isNaN(v)) return Utilities.formatDate(v,Session.getScriptTimeZone(),'yyyy-MM-dd');
  return String(v);
}
function respond_(obj,callback){
  const text=JSON.stringify(obj);
  if(callback && /^[A-Za-z_$][\w$]*$/.test(callback)) return ContentService.createTextOutput(callback+'('+text+');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.JSON);
}
function html_(msg){ return HtmlService.createHtmlOutput('<!doctype html><html><body>'+msg+'</body></html>'); }
