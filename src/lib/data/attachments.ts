// Client-side attachment preparation (AZURE Phase 3, task 3.4).
//
// Privacy-first: every image is re-encoded through a canvas before it leaves the
// device, which strips ALL metadata (EXIF — including GPS location — ICC, etc.).
// EXIF orientation is honoured first (via createImageBitmap) so the visible
// picture is not rotated when the metadata is dropped. Output is JPEG, bounded
// in dimension so the payload stays under the 10 MB server cap. Browser only.

export interface PreparedUpload {
  filename: string;
  mime: string;
  /** base64 of the re-encoded, EXIF-stripped bytes (no data: prefix). */
  dataBase64: string;
}

const MAX_DIMENSION_DEFAULT = 2000;
const QUALITY_DEFAULT = 0.85;

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000; // avoid arg-count limits on String.fromCharCode
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function withJpgExtension(name: string): string {
  const base = (name.split(/[\\/]/).pop() ?? "photo").replace(/\.[^.]+$/, "");
  return `${base || "photo"}.jpg`;
}

/**
 * Re-encode an image File to a metadata-free JPEG and return it base64-encoded,
 * ready for `Repository.uploadAttachment`. Throws if the file isn't an image or
 * the browser can't decode it.
 */
export async function prepareImageForUpload(
  file: File,
  opts?: { maxDimension?: number; quality?: number },
): Promise<PreparedUpload> {
  if (typeof document === "undefined") {
    throw new Error("prepareImageForUpload is browser-only.");
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files can be attached.");
  }

  const maxDimension = opts?.maxDimension ?? MAX_DIMENSION_DEFAULT;
  const quality = opts?.quality ?? QUALITY_DEFAULT;

  // imageOrientation:'from-image' applies the EXIF rotation to the pixels, so
  // stripping EXIF afterwards doesn't flip the photo.
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not prepare the image (no canvas context).");
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    if (!blob) throw new Error("Could not encode the image.");

    return {
      filename: withJpgExtension(file.name),
      mime: "image/jpeg",
      dataBase64: bufferToBase64(await blob.arrayBuffer()),
    };
  } finally {
    bitmap.close();
  }
}
