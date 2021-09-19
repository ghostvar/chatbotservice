# Chat bot Service
> Chat bot services integrated and api avaliable (on progress)

Chat Bot Service adalah layanan integrasi api sekaligus bot yang digunakan nantinya untuk melakukan perintah tertentu, saat ini sedang dalam proses pengembangan & pembuatan fitur-fitur. Adapun jika ingin bergabung kami sangat senang sekali, Anda dapat membuat issue, pull request, atau menghubungi kontak dibawah.

## Disclaimer
Lebih ditujukan kepada Bot WhatsApp, Kode ini dapat memberikan akses kepada akun anda, tidak terdapat jaminan kode yang anda gunakan adalah tanggung jawab anda sendiri.

## Persiapan
- Memiliki mesin terinstal Node.js
- Memiliki mesin terinstal Postgres dan membuat basisdata.
- Token yang telah di dapat dari pembuatan Bot Telegram di [BotFather](tg://resolve?domain=botfather).
- Perangkat WhatsApp untuk nantinya digunakan untuk bot WhatsApp.
- Perangkat WhastApp untuk anda sendiri.

## Proses Installasi
Mendownload source code
```bash
git pull https://github.com/ghostvar/chatbotservice
```
Masuk kedalam folder
```bash
cd chatbotservice
```
Installasi Pustaka
```bash
npm install
```
Installasi Knex Command Line
```bash
npm install -g knex
```
membuat file konfigurasi, dan modifikasi kesesuaian konfigurasi
```bash
cp .env.example .env
```
menjalankan migrasi
```bash
knex migrate:latest
```
menjalankan bot
```bash
node main.js
```
selesai.

## Kontak
[WhatsApp](https://wa.me/6282145186986), [Telegram](https://t.me/didinfakhrudin)

## Tentang
Sekilas saat ini bot hanya berjalan secara penuh pada perangkat WhatsApp saja, proses pengembangan dan pembuatan fitur-fitur masih sedang di implementasikan di waktu-waktu senggang.

Selain itu dikarenakan dukungan penuh terhadap pustaka WhastApp dimana bot dapat berperan sebagai Pengguna Biasa dapat melakukan kebebasan untuk mengirimkan seseorang chat atau semacamnya, berbeda dengan bot Telegram yang telah didukung resmi dari pihak telegram, bot perlu di tindak sebagai robot dimana beberapa hal tidak dapat dilakukan seperti memulai chat dll.
