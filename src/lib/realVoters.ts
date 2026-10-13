export type RealVoter = {
  nama: string;
  kelas: string;
  jurusan: string;
  status_pkl: boolean;
  is_test_account: boolean;
};

export function normalizeVoterName(name: string): string {
  return name
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('id-ID');
}

export const realVoters: RealVoter[] = [
  // XI DKV — 18 pemilih resmi
  ...[
    'Andira Shafa Maulidya',
    'Delvin Charles',
    'Eka Nuryanti',
    'Farrel Akram Adisya',
    'Halwa Maulida Hasanah',
    'Jeanice Abigail Hermawan',
    'Julian Ilham Putra Pangrukti',
    'Khairinnisa Putri Faulia',
    'Mohammad Rizky',
    'Muhammad Fikri Eka Putra',
    'Muhammad Hafidz Fakhrudin',
    'Muhammad Satriyo Pradyto',
    'Putri Tiara Azzahra',
    'Rafif Ibrahim Taboer',
    'Shasmita Hannasyifa',
    'Lakeisha Rindri Azzahra',
    'Shofi Ashilah',
    'Maulidya Syauqina Febriandanes',
  ].map((nama) => ({
    nama,
    kelas: 'XI DKV',
    jurusan: 'Desain Komunikasi Visual',
    status_pkl: false,
    is_test_account: false,
  })),

  // XI RPL — 8 pemilih resmi
  ...[
    'Aditya Pratama',
    'Aqila Ramadhani',
    'Baraka Al Maliku Sonja',
    'Haikal Bintang Mikail',
    'Nadhir Joshafarra',
    'Reza Fatur Rahman',
    'Safa Aulia Rahmawati',
    'Syaiful Ulum',
  ].map((nama) => ({
    nama,
    kelas: 'XI RPL',
    jurusan: 'Rekayasa Perangkat Lunak',
    status_pkl: false,
    is_test_account: false,
  })),

  // XI TKR — 7 pemilih resmi
  ...[
    'Muhammad Ikhsan Nur Maulidin',
    'Septian Surya Nugraha',
    'Arvino Chandra Kusuma',
    'Rizky Pramono',
    'Naviz Lam Praditya',
    'Oksa Barraq Rizqi',
    'Hulul Hafiz',
  ].map((nama) => ({
    nama,
    kelas: 'XI TKR',
    jurusan: 'Teknik Kendaraan Ringan',
    status_pkl: false,
    is_test_account: false,
  })),

  // XII RPL — khusus pengujian, bukan pemilih resmi
  {
    nama: 'Rebowa Miftahurrahman',
    kelas: 'XII RPL',
    jurusan: 'Rekayasa Perangkat Lunak',
    status_pkl: false,
    is_test_account: true,
  },
];

// Validasi data saat development atau proses impor.
export function validateRealVoters(): string[] {
  const errors: string[] = [];

  const officialVoters = realVoters.filter(
    (voter) => !voter.is_test_account,
  );

  const testAccounts = realVoters.filter(
    (voter) => voter.is_test_account,
  );

  if (realVoters.length !== 34) {
    errors.push(`Jumlah akun harus 34, ditemukan ${realVoters.length}.`);
  }

  if (officialVoters.length !== 33) {
    errors.push(
      `Jumlah pemilih resmi harus 33, ditemukan ${officialVoters.length}.`,
    );
  }

  if (testAccounts.length !== 1) {
    errors.push(
      `Jumlah akun penguji harus 1, ditemukan ${testAccounts.length}.`,
    );
  }

  const seenNames = new Set<string>();

  for (const voter of realVoters) {
    const normalizedName = normalizeVoterName(voter.nama);

    if (!normalizedName) {
      errors.push('Ada akun dengan nama kosong.');
      continue;
    }

    if (seenNames.has(normalizedName)) {
      errors.push(`Nama ganda ditemukan: ${voter.nama}.`);
    }

    seenNames.add(normalizedName);

    if (!voter.kelas.trim() || !voter.jurusan.trim()) {
      errors.push(`Kelas atau jurusan kosong: ${voter.nama}.`);
    }
  }

  return errors;
}