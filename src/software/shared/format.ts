export const usd=(value:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(value);
export const shortDate=(value?:string)=>value?new Intl.DateTimeFormat("en-LK",{year:"numeric",month:"short",day:"2-digit"}).format(new Date(value)):"—";
