// Browser-side Cloudinary unsigned upload. Never put API secrets in this file.
const CLOUD_NAME = 'b1gbrfyv';
const UPLOAD_PRESET = 'sportifano_upload';
export async function uploadCloudinaryImage(file, folder='products', progress){
  if (!file || !['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Utilisez JPG, PNG ou WEBP');
  if (file.size > 5 * 1024 * 1024) throw new Error('Image supérieure à 5 Mo');
  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', UPLOAD_PRESET);
  // Folder location is managed in Cloudinary's unsigned preset.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    if(progress) progress.textContent='Envoi image vers Cloudinary (max 25 secondes)...';
    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method:'POST', body:form, signal:controller.signal
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.secure_url) {
      throw new Error(result.error?.message || `Cloudinary HTTP ${response.status}. Vérifiez le preset Unsigned.`);
    }
    if(progress) progress.textContent='Photo transférée. Sauvegarde du produit...';
    return result.secure_url;
  } catch (error) {
    const message = error.name === 'AbortError'
      ? 'Envoi trop long (25 s). Vérifiez la connexion et le preset Cloudinary Unsigned.'
      : error.message || 'Échec de connexion Cloudinary';
    if(progress) progress.textContent='Erreur : '+message;
    throw new Error(message);
  } finally {
    clearTimeout(timer);
  }
}
