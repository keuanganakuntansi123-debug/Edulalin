import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getCurrentUser } from "@/lib/session";
import { MAX_SIZES } from "@/lib/storage";
import { blobAllowedContentTypes } from "@/lib/blob-storage";
import type { FileKind } from "@/generated/prisma/client";

export const instant = false;

const KINDS: FileKind[] = [
  "MODULE_CONTENT",
  "QUIZ_PDF",
  "AVATAR",
  "SITE_IMAGE",
  "SCHOOL_LOGO",
  "ARTICLE_IMAGE",
];

/**
 * Route untuk client upload ke Vercel Blob (browser → Blob langsung).
 * Fungsi handleUpload:
 *  - onBeforeGenerateToken: otentikasi + otorisasi + batas ukuran/tipe file.
 * Metadata & URL file disimpan di Neon lewat /api/upload/register setelah
 * upload selesai di sisi client.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const user = await getCurrentUser();
        if (!user) throw new Error("Tidak terautentikasi");

        let kind: FileKind = "MODULE_CONTENT";
        try {
          const parsed = clientPayload ? JSON.parse(clientPayload) : null;
          if (parsed && typeof parsed.kind === "string" && KINDS.includes(parsed.kind as FileKind)) {
            kind = parsed.kind as FileKind;
          }
        } catch {
          // gunakan default
        }

        // Otorisasi sesuai jenis file (sama seperti /api/upload).
        if ((kind === "SITE_IMAGE" || kind === "ARTICLE_IMAGE") && user.role !== "ADMIN") {
          throw new Error("Hanya Admin yang dapat mengunggah gambar ini");
        }
        if (kind === "SCHOOL_LOGO" && user.role !== "ADMIN" && user.role !== "GURU") {
          throw new Error("Hanya Admin dan Guru yang dapat mengunggah logo sekolah");
        }
        if ((user.role === "MURID" || user.role === "POLISI") && kind !== "AVATAR") {
          throw new Error("Tidak memiliki izin mengunggah tipe file ini");
        }
        if (
          user.role === "GURU" &&
          kind !== "MODULE_CONTENT" &&
          kind !== "AVATAR" &&
          kind !== "SCHOOL_LOGO"
        ) {
          throw new Error("Tidak memiliki izin mengunggah tipe file ini");
        }

        return {
          allowedContentTypes: blobAllowedContentTypes(kind),
          maximumSizeInBytes: MAX_SIZES[kind],
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ userId: user.id, kind }),
        };
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menyiapkan unggahan" },
      { status: 400 }
    );
  }
}
