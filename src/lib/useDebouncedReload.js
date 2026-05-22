// src/lib/useDebouncedReload.js
//
// Hook untuk handle realtime reload tanpa race condition dan tanpa double-render.
//
// Masalah yang dipecahkan:
//   1. Realtime emit banyak event berdekatan (INSERT + UPDATE webhook) →
//      kalau langsung call load() setiap event, render terjadi 3-4× berurutan.
//   2. `loadingRef.current` guard menolak panggilan kedua → event terlewat,
//      UI tidak sinkron sampai user refresh manual.
//
// Solusi:
//   - DEBOUNCE: tunggu sebentar (200ms default) sebelum benar-benar load,
//     biar banyak event yang berdekatan di-coalesce jadi satu reload.
//   - QUEUED RELOAD: kalau load sedang berjalan dan ada event baru,
//     tandai "harus reload sekali lagi setelah selesai" — tidak ada event
//     yang hilang.
//   - SAFE UNMOUNT: kalau component unmount sebelum debounce timeout, batalkan.

import { useCallback, useEffect, useRef } from 'react'

/**
 * @param {() => Promise<void>} loadFn - fungsi load yang akan dipanggil
 * @param {number} delayMs - debounce delay
 * @returns {() => void} - schedule sebuah reload (debounced + queued)
 */
export function useDebouncedReload(loadFn, delayMs = 200) {
    const loadingRef = useRef(false)
    const pendingRef = useRef(false)
    const timeoutRef = useRef(null)
    const mountedRef = useRef(true)
    // Ref ke fungsi terbaru — supaya tidak stale ketika dependency loadFn berubah
    const loadFnRef = useRef(loadFn)

    useEffect(() => {
        loadFnRef.current = loadFn
    }, [loadFn])

    useEffect(() => {
        mountedRef.current = true
        return () => {
            mountedRef.current = false
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
                timeoutRef.current = null
            }
        }
    }, [])

    const runLoad = useCallback(async () => {
        // Kalau sudah ada load berjalan, mark pending — bakal di-reload lagi setelah selesai
        if (loadingRef.current) {
            pendingRef.current = true
            return
        }
        loadingRef.current = true
        try {
            await loadFnRef.current()
        } catch (err) {
            console.error('[useDebouncedReload] load error:', err)
        } finally {
            loadingRef.current = false
            // Kalau ada event baru masuk saat load tadi jalan, run lagi (sekali)
            if (pendingRef.current && mountedRef.current) {
                pendingRef.current = false
                // Jalankan lagi tanpa debounce — sudah keburu — tapi tetap async biar tidak deep recursion
                Promise.resolve().then(runLoad)
            }
        }
    }, [])

    const scheduleReload = useCallback(() => {
        if (!mountedRef.current) return
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        timeoutRef.current = setTimeout(() => {
            timeoutRef.current = null
            if (mountedRef.current) runLoad()
        }, delayMs)
    }, [delayMs, runLoad])

    return scheduleReload
}   