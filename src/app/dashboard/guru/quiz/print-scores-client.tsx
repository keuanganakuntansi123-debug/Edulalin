"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export type PrintAttempt = {
  id: string;
  studentName: string;
  className: string | null;
  major: string | null;
  educationLevel: string | null;
  schoolName: string;
  quizTitle: string;
  score: number;
  passed: boolean;
  minScore: number;
  submittedAt: string | null;
};

/**
 * Cetak PDF nilai murid. Membuka jendela print-friendly berisi tabel nilai
 * seluruh murid dari sekolah guru. Guru cukup memilih "Save as PDF" di dialog
 * cetak browser.
 */
export function PrintScoresClient({
  schoolName,
  attempts,
  studentName,
  quizTitle,
}: {
  schoolName: string;
  attempts: PrintAttempt[];
  studentName?: string;
  quizTitle?: string;
}) {
  const handlePrint = () => {
    const filtered = studentName
      ? attempts.filter((a) => a.studentName === studentName)
      : attempts;
    const rows = quizTitle
      ? filtered.filter((a) => a.quizTitle === quizTitle)
      : filtered;

    const title = studentName ? "Nilai Kuis Per Murid" : "Laporan Nilai Kuis Murid";
    const subtitle = studentName
      ? `Murid: ${studentName}`
      : quizTitle
        ? `Kuis: ${quizTitle}`
        : "Seluruh murid";

    const trs = rows
      .map(
        (a) => `<tr>
          <td>${escapeHtml(a.studentName)}</td>
          <td>${escapeHtml(a.educationLevel ?? "-")}</td>
          <td>${escapeHtml(a.className ?? "-")}</td>
          <td>${escapeHtml(a.major ?? "-")}</td>
          <td>${escapeHtml(a.schoolName)}</td>
          <td>${escapeHtml(a.quizTitle)}</td>
          <td class="center">${a.score}</td>
          <td class="center">${a.passed ? "Lulus" : "Belum Lulus"}</td>
          <td>${a.submittedAt ? new Date(a.submittedAt).toLocaleDateString("id-ID") : "-"}</td>
        </tr>`
      )
      .join("");

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)} - ${escapeHtml(schoolName)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; padding: 32px; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  h2 { font-size: 14px; font-weight: normal; color: #444; margin-bottom: 20px; }
  .meta { font-size: 13px; color: #333; margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
  th, td { border: 1px solid #999; padding: 8px 6px; text-align: left; vertical-align: top; }
  th { background: #e8f0fe; font-weight: bold; }
  .center { text-align: center; }
  .lulus { color: #047857; font-weight: bold; }
  .belum { color: #b91c1c; font-weight: bold; }
  .footer { margin-top: 28px; font-size: 11px; color: #777; }
  .no-data { margin-top: 20px; font-size: 13px; color: #666; }
  @media print {
    body { padding: 12px; }
    button { display: none; }
  }
</style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <h2>Sekolah: ${escapeHtml(schoolName)} • ${escapeHtml(subtitle)}</h2>
  <p class="meta">Total: ${rows.length} hasil</p>
  <button onclick="window.print()" style="margin-top:12px;padding:8px 16px;font-size:13px;">Cetak / Simpan PDF</button>
  ${
    rows.length === 0
      ? '<p class="no-data">Tidak ada data hasil kuis untuk ditampilkan.</p>'
      : `<table>
        <thead>
          <tr>
            <th>Nama Murid</th>
            <th>Jenjang</th>
            <th>Kelas</th>
            <th>Jurusan</th>
            <th>Sekolah</th>
            <th>Nama Kuis</th>
            <th>Nilai</th>
            <th>Status</th>
            <th>Tanggal</th>
          </tr>
        </thead>
        <tbody>${trs}</tbody>
      </table>`
  }
  <p class="footer">Dicetak dari EDULALIN — Edukasi Lalu Lintas • ${new Date().toLocaleString("id-ID")}</p>
  <script>window.onload = function(){ if (window.__print) window.print(); };</script>
</body>
</html>`;

    const w = window.open("", "_blank", "width=1000,height=700");
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
  };

  return (
    <Button type="button" size="sm" onClick={handlePrint} className="gap-2">
      <Printer className="h-4 w-4" />
      Cetak PDF Nilai Murid
    </Button>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function PrintSingleAttemptButton({ attempt }: { attempt: PrintAttempt }) {
  const handlePrint = () => {
    const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8" />
<title>Detail Nilai - ${escapeHtml(attempt.studentName)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; padding: 40px; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  .meta { font-size: 13px; color: #333; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
  th, td { border: 1px solid #999; padding: 8px 10px; text-align: left; }
  th { background: #e8f0fe; }
  .score { font-size: 30px; font-weight: bold; }
  .badge-lulus { color: #047857; font-weight: bold; }
  .badge-belum { color: #b91c1c; font-weight: bold; }
  .footer { margin-top: 28px; font-size: 11px; color: #777; }
  @media print { body { padding: 16px; } button { display: none; } }
</style>
</head>
<body>
  <h1>Nilai Kuis Murid — ${escapeHtml(attempt.studentName)}</h1>
  <p class="meta">Sekolah: ${escapeHtml(attempt.schoolName)}</p>
  <button onclick="window.print()" style="margin-bottom:16px;padding:8px 16px;font-size:13px;">Cetak / Simpan PDF</button>
  <table>
    <tr><th>Nama Murid</th><td>${escapeHtml(attempt.studentName)}</td></tr>
    <tr><th>Jenjang</th><td>${escapeHtml(attempt.educationLevel ?? "-")}</td></tr>
    <tr><th>Kelas</th><td>${escapeHtml(attempt.className ?? "-")}</td></tr>
    <tr><th>Jurusan</th><td>${escapeHtml(attempt.major ?? "-")}</td></tr>
    <tr><th>Sekolah</th><td>${escapeHtml(attempt.schoolName)}</td></tr>
    <tr><th>Nama Kuis</th><td>${escapeHtml(attempt.quizTitle)}</td></tr>
    <tr>
      <th>Nilai</th>
      <td class="score">${attempt.score}/100</td>
    </tr>
    <tr><th>Status</th><td class="${attempt.passed ? "badge-lulus" : "badge-belum"}">${attempt.passed ? "Lulus" : "Belum Lulus"}</td></tr>
    <tr><th>Waktu Dikerjakan</th><td>${attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString("id-ID") : "-"}</td></tr>
  </table>
  <p class="footer">Dicetak dari EDULALIN — Edukasi Lalu Lintas • ${new Date().toLocaleString("id-ID")}</p>
</body>
</html>`;

    const w = window.open("", "_blank", "width=900,height=650");
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
  };

  return (
    <Button type="button" size="sm" variant="outline" onClick={handlePrint} className="gap-2">
      <Printer className="h-4 w-4" />
      Cetak PDF Nilai Murid
    </Button>
  );
}
