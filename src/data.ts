export type Order={id:string;client:string;design:string;quantity:number;produced:number;status:string;delivery:string;priority:string};
export type Machine={id:number;name:string;orderId:string;colors:string[]};
export const machineNames=['A1','A2','A3','A4','A5','A6'];
export const mockOrders:Order[]=[
{id:'1',client:'gaga - x25',design:'gaga',quantity:25,produced:25,status:'Produciendo',delivery:'En día',priority:'normal'},
{id:'2',client:'ggga',design:'ggga',quantity:25,produced:25,status:'Produciendo',delivery:'En día',priority:'normal'},
{id:'3',client:'sfasf',design:'sfasf',quantity:25,produced:20,status:'Produciendo',delivery:'+1 día',priority:'normal'},
{id:'4',client:'cliente 1',design:'cliente 1',quantity:30,produced:0,status:'Anillado',delivery:'+2 días',priority:'normal'},
{id:'5',client:'pedido urgente',design:'pedido urgente',quantity:15,produced:0,status:'Listo',delivery:'En día',priority:'high'},
{id:'6',client:'messi 10',design:'messi 10',quantity:20,produced:0,status:'Iniciado',delivery:'+3 días',priority:'normal'},
{id:'7',client:'stitch cute',design:'stitch cute',quantity:25,produced:0,status:'Pendiente',delivery:'+5 días',priority:'normal'},
{id:'8',client:'harry potter',design:'harry potter',quantity:18,produced:0,status:'Pendiente',delivery:'+6 días',priority:'normal'}];
export const colors=['#ffffff','#111111','#ef4444','#f59e0b','#facc15','#22c55e','#06b6d4','#2563eb','#7c3aed','#ec4899','#a855f7','#8b5cf6','#f97316','#64748b','#cbd5e1','#84cc16'];
