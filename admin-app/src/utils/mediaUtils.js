/**
 * Compress an uploaded image File into a lightweight Data URL (JPEG/WebP)
 * so course/lesson covers load quickly across Telegram Mini App without needing Storage bucket setup.
 */
export function compressImageFileToDataUrl(file, maxWidth = 720, quality = 0.8) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type?.startsWith('image/')) {
      reject(new Error("Faqat rasm faylini tanlang (JPG, PNG, WebP)"));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Faylni o'qishda xatolik"));
    reader.onload = (ev) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Rasmni qayta ishlashda xatolik"));
      img.onload = () => {
        try {
          let { width, height } = img;
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const webpUrl = canvas.toDataURL('image/webp', quality);
          if (webpUrl && webpUrl.startsWith('data:image/webp')) {
            resolve(webpUrl);
          } else {
            resolve(canvas.toDataURL('image/jpeg', quality));
          }
        } catch (err) {
          reject(err);
        }
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Formats seconds into M:SS or H:MM:SS string. Returns empty string if invalid.
 */
export function formatDurationFromSeconds(totalSeconds) {
  const sec = Math.round(Number(totalSeconds));
  if (!Number.isFinite(sec) || sec <= 0) return '';
  const hours = Math.floor(sec / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const remSecs = sec % 60;
  if (hours > 0) {
    return `${hours}:${String(mins).padStart(2, '0')}:${String(remSecs).padStart(2, '0')}`;
  }
  return `${mins}:${String(remSecs).padStart(2, '0')}`;
}
