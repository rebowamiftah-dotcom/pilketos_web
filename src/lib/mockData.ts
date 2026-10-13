// Tipe data siswa dari Supabase
export interface Student {
  id: string;
  nama: string;
  kelas: string;
  jurusan: string;
  status_pkl: boolean;
  has_voted: boolean;
  created_at: string;
  updated_at: string;
}

export interface Candidate {
  id: string;
  nomor_urut: number;
  nama_ketua: string;
  nama_wakil: string;
  visi: string;
  misi: string[] | string;
  foto_url?: string | null;
  foto_ketua?: string | null;
  foto_wakil?: string | null;
}

export interface Vote {
  id: string;
  student_id: string;
  candidate_id: string;
  voted_at: string;
}