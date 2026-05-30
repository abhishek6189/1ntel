const HEIC_TYPES = ["image/heic", "image/heif"];
const HEIC_EXTENSIONS = [".heic", ".heif"];

const isHeicFile = (file: File) => {
  const name = file.name.toLowerCase();
  return HEIC_TYPES.includes(file.type) || HEIC_EXTENSIONS.some((ext) => name.endsWith(ext));
};

const withJpegName = (name: string) => name.replace(/\.[^.]+$/, "") + ".jpg";

export const FALLBACK_AVATAR_URL =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 160 160'%3E%3Crect width='160' height='160' rx='80' fill='%23e5e7eb'/%3E%3Ccircle cx='80' cy='58' r='30' fill='%23f8fafc'/%3E%3Cpath d='M25 150c8-34 29-53 55-53s47 19 55 53' fill='%23f8fafc'/%3E%3C/svg%3E";

export const prepareImageForUpload = async (file: File) => {
  let uploadFile = file;

  if (isHeicFile(file)) {
    const { default: heic2any } = await import("heic2any");
    const converted = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.86,
    });

    const blob = Array.isArray(converted) ? converted[0] : converted;
    uploadFile = new File([blob], withJpegName(file.name), { type: "image/jpeg" });
  }

  const { default: imageCompression } = await import("browser-image-compression");
  const compressed = await imageCompression(uploadFile, {
    maxSizeMB: 1.2,
    maxWidthOrHeight: 1800,
    useWebWorker: true,
    initialQuality: 0.86,
    fileType: uploadFile.type || "image/jpeg",
  });

  return new File([compressed], uploadFile.name, {
    type: compressed.type || uploadFile.type || "image/jpeg",
  });
};

export const getImageUploadPath = (userId: string, file: File) => {
  const extension = file.type === "image/png" ? "png" : "jpg";
  return `${userId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
};
