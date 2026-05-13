const HEIC_TYPES = ["image/heic", "image/heif"];
const HEIC_EXTENSIONS = [".heic", ".heif"];

const isHeicFile = (file: File) => {
  const name = file.name.toLowerCase();
  return HEIC_TYPES.includes(file.type) || HEIC_EXTENSIONS.some((ext) => name.endsWith(ext));
};

const withJpegName = (name: string) => name.replace(/\.[^.]+$/, "") + ".jpg";

export const FALLBACK_AVATAR_URL =
  "https://ui-avatars.com/api/?name=User&background=2563eb&color=ffffff";

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
