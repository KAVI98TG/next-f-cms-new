import { useMemo } from 'react';
import { createPaymentQrMatrix, paymentQrPath } from './qrCode';

export function PaymentQr({value,label='Payment address QR code'}:{value:string;label?:string}){
  const qr=useMemo(()=>{try{const matrix=createPaymentQrMatrix(value);const margin=4;return {size:matrix.length+margin*2,path:paymentQrPath(matrix,1,margin)};}catch{return null;}},[value]);
  if(!qr)return <div className="supplier-payment-qr__error">QR unavailable. Copy the payment address manually.</div>;
  return <svg className="supplier-payment-qr__svg" viewBox={`0 0 ${qr.size} ${qr.size}`} role="img" aria-label={label} shapeRendering="crispEdges">
    <title>{label}</title>
    <rect width="100%" height="100%" fill="#fff"/>
    <path d={qr.path} fill="#000"/>
  </svg>;
}
