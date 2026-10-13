import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

async function verifyAdmin(request: NextRequest) {
  const authorization = request.headers.get('authorization');

  if (!authorization?.startsWith('Bearer ')) {
    return false;
  }

  const token = authorization.slice(7);
  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user?.email) {
    return false;
  }

  const adminEmail = process.env.ADMIN_EMAIL;

  return Boolean(
    adminEmail &&
      data.user.email.toLowerCase() === adminEmail.toLowerCase()
  );
}

export async function POST(request: NextRequest) {
  try {
    const isAdmin = await verifyAdmin(request);

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Akses ditolak. Silakan login sebagai admin.' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'Pilih foto terlebih dahulu.' },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES[file.type]) {
      return NextResponse.json(
        { error: 'Format foto harus JPG, PNG, atau WebP.' },
        { status: 400 }
      );
    }

    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Ukuran foto harus lebih dari 0 dan maksimal 5 MB.' },
        { status: 400 }
      );
    }

    const fileName = `${crypto.randomUUID()}.${ALLOWED_TYPES[file.type]}`;
    const filePath = `candidates/${fileName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('candidate-photos')
      .upload(filePath, file, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload foto gagal:', uploadError);

      return NextResponse.json(
        { error: 'Foto gagal diunggah ke Supabase Storage.' },
        { status: 500 }
      );
    }

    const { data } = supabaseAdmin.storage
      .from('candidate-photos')
      .getPublicUrl(filePath);

    return NextResponse.json({
      message: 'Foto berhasil diunggah.',
      foto_url: data.publicUrl,
      path: filePath,
    });
  } catch (error) {
    console.error('Kesalahan API upload foto:', error);

    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengunggah foto.' },
      { status: 500 }
    );
  }
}