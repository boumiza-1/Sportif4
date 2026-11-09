/* Shared visual product ordering for catalog, carousel, and static SEO pages.
   Positive integer 1 appears first, 2 second, etc. Products without a position follow. */
export function displayOrder(value){
  if(value===null||value===undefined||value==='')return null;
  const n=Number(value);
  return Number.isSafeInteger(n)&&n>=1&&n<=99999?n:null;
}
export function sortProducts(items){
  return [...items].sort((a,b)=>{
    const ao=displayOrder(a.displayOrder),bo=displayOrder(b.displayOrder);
    if(ao!==null&&bo!==null&&ao!==bo)return ao-bo;
    if(ao!==null&&bo===null)return -1;
    if(bo!==null&&ao===null)return 1;
    // Deterministic tie-breaking; avoid changing saved metadata.
    const aid=String(a.id||''),bid=String(b.id||'');
    return aid.localeCompare(bid);
  });
}
