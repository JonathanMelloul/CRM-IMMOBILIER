let whatsappWindow:Window|null=null;

/** Reuse the CRM's WhatsApp tab while the browser keeps its window reference usable. */
export function openWhatsAppWindow(url:string):boolean {
 try {
  if(whatsappWindow&&!whatsappWindow.closed){
   whatsappWindow.location.href=url;
   try{whatsappWindow.focus();}catch{/* Navigation can succeed even if focus is blocked. */}
   return true;
  }
 }catch{/* Cross-origin isolation may invalidate an existing reference. */}
 whatsappWindow=null;
 let opened:Window|null=null;
 try {
  // Keep the reference for reuse, but remove access back to the CRM before navigation.
  opened=window.open('about:blank','crm-whatsapp');
  if(!opened)return false;
  opened.opener=null;
  opened.location.href=url;
  whatsappWindow=opened;
 }catch{
  try{opened?.close();}catch{/* Only the newly opened blank tab is closed. */}
  return false;
 }
 try{opened.focus();}catch{/* Focusing is best effort. */}
 return true;
}
