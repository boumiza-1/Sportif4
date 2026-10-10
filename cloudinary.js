// Cloudinary public browser-upload settings. Never insert API secret here.
const CLOUD_NAME = 'b1gbrfyv';
const UPLOAD_PRESET = 'sportifano_upload';
export async function uploadCloudinaryImage(file, folder='products', progress){
  if(!file || !['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Format JPG, PNG ou WEBP uniquement');
  if(file.size > 5*1024*1024) throw new Error('Image trop lourde (5 Mo maximum)');
  const fd=new FormData();
  fd.append('file',file);
  fd.append('upload_preset',UPLOAD_PRESET);
  // The unsigned preset controls the storage location and allowed transformations.
  if(progress)progress.textContent='Upload Cloudinary en cours...';
  let res;
  try{res=await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,{method:'POST',body:fd});}
  catch(e){throw new Error('Connexion impossible à Cloudinary');}
  let data=await res.json().catch(()=>({}));
  if(!res.ok || !data.secure_url)throw new Error(data.error?.message||'Upload Cloudinary échoué');
  if(progress)progress.textContent='Image importée avec succès';
  return data.secure_url;
}
