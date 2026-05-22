# Setup Midtrans Payment Gateway

Panduan lengkap mengintegrasikan Midtrans Snap untuk pembayaran cicilan/gadai.

## 1. Dapatkan API Keys dari Midtrans

1. Login ke [https://dashboard.midtrans.com](https://dashboard.midtrans.com)
2. Pilih **Sandbox** dulu untuk testing, lalu ganti ke **Production** kalau sudah live
3. Buka menu **Settings → Access Keys**, salin:
   - **Client Key** (boleh di-expose di frontend, dimulai dengan `SB-Mid-client-` atau `Mid-client-`)
   - **Server Key** (RAHASIA, jangan pernah masukkan ke frontend, dimulai dengan `SB-Mid-server-` atau `Mid-server-`)

## 2. Setup Environment Variables (Frontend)

Buat/edit file `.env` di root project:

```bash
# Midtrans Client Key — aman di-expose, tidak punya akses tulis ke server Midtrans
VITE_MIDTRANS_CLIENT_KEY=SB-Mid-client-XXXXXXXXXXXXX

# URL Snap.js — sandbox utk testing, production utk live
# Sandbox:   https://app.sandbox.midtrans.com/snap/snap.js
# Production: https://app.midtrans.com/snap/snap.js
VITE_MIDTRANS_SNAP_URL=https://app.sandbox.midtrans.com/snap/snap.js
```

## 3. Deploy Supabase Edge Functions

Edge function akan handle dua hal:
- `midtrans-snap`: generate Snap token untuk transaksi baru (frontend memanggil ini)
- `midtrans-webhook`: terima notifikasi status dari Midtrans (Midtrans memanggil ini)

```bash
# Pastikan Supabase CLI sudah ter-install
# npm install -g supabase

# Login ke Supabase
supabase login

# Link project (sekali aja)
supabase link --project-ref <your-project-ref>

# Set secrets (sensitif — tidak ada di frontend bundle)
supabase secrets set MIDTRANS_SERVER_KEY="Mid-server-Gbr0vPqLTGXu2Zic8FeB-r4f"
supabase secrets set MIDTRANS_IS_PRODUCTION="false"   # ganti "true" kalau sudah production

# Deploy functions
supabase functions deploy midtrans-snap
supabase functions deploy midtrans-webhook --no-verify-jwt
# --no-verify-jwt khusus webhook karena Midtrans tidak punya JWT,
# kita verifikasi signature manual di code.
```

## 4. Konfigurasi Webhook di Dashboard Midtrans

Webhook adalah cara Midtrans memberitahu sistem kita kalau pembayaran berhasil/gagal.

1. Buka **Settings → Configuration → Payment Notification URL**
2. Set URL:
   ```
   https://<your-project-ref>.supabase.co/functions/v1/midtrans-webhook
   ```
3. Save.

Test webhook dengan klik **Send Test Notification** — di logs edge function harusnya muncul request masuk.

## 5. Konfigurasi Finish/Error/Pending Redirect (Opsional)

Di **Settings → Configuration → Finish/Unfinish/Error Redirect URL**, set:
- Finish:   `https://yourdomain.com/dashboard/payments?status=success`
- Unfinish: `https://yourdomain.com/dashboard/payments?status=pending`
- Error:    `https://yourdomain.com/dashboard/payments?status=error`

Ini optional karena Snap popup sudah handle callback via `onSuccess/onPending/onError`.

## 6. Testing

Di sandbox, gunakan test credit card / VA:

| Method | Detail |
|---|---|
| Credit Card | `4811 1111 1111 1114`, CVV `123`, exp future, 3DS OTP `112233` |
| Bank Transfer | Pilih BCA/Mandiri VA, lihat VA number yang muncul, simulate di simulator |

Midtrans Simulator: [https://simulator.sandbox.midtrans.com](https://simulator.sandbox.midtrans.com)

## Flow End-to-End

```
User klik "Bayar"
  ↓
Frontend: paymentService.create() — insert record dengan status='pending'
  ↓
Frontend: midtransService.createSnapToken() — invoke edge function `midtrans-snap`
  ↓
Edge function `midtrans-snap`:
  - Validate body
  - POST ke Midtrans API dengan Server Key
  - Return snap_token ke frontend
  ↓
Frontend: midtransService.loadSnapScript() + window.snap.pay(token)
  ↓
User selesaikan pembayaran di popup Midtrans
  ↓
Midtrans → POST ke webhook endpoint `midtrans-webhook`
  ↓
Edge function `midtrans-webhook`:
  - Verify signature (sha512(order_id + status_code + gross_amount + server_key))
  - Update payments.status, midtrans_*
  - Kalau settled: recompute loans.remaining_amount, kalau 0 → status=completed
  - Insert notification ke user
  ↓
Frontend: onSuccess callback → update UI optimistically + load() lagi
```

## Troubleshooting

**"MIDTRANS_SERVER_KEY belum dikonfigurasi"** → Set lewat `supabase secrets set`, lalu redeploy function.

**Snap popup tidak muncul** → Cek browser console, pastikan client key valid & domain di-whitelist di dashboard Midtrans (Settings → Snap Preference → Allowed Origins).

**Webhook tidak dipanggil di local dev** → Pakai [ngrok](https://ngrok.com) untuk expose local edge function, atau test langsung di Midtrans dashboard simulator.

**Status payment stuck di "pending"** → Cek logs webhook (`supabase functions logs midtrans-webhook`). Common issue: signature verification failed karena server key beda environment (sandbox vs production).
