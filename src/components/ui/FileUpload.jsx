import { useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, X, FileText, Image, AlertCircle, CheckCircle } from 'lucide-react'
import { cn } from '../../lib/utils'
import { documentService } from '../../services'

const ACCEPTED_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/webp'],
  document: ['image/jpeg', 'image/png', 'application/pdf'],
  all: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
}

const MAX_SIZE_MB = 5

export function FileUpload({
  label,
  hint,
  accept = 'image',
  bucket = 'documents',
  path,
  onUploaded,
  required,
  className,
  value,
}) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(value || null)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const acceptedMimes = ACCEPTED_TYPES[accept] || ACCEPTED_TYPES.image
  const acceptStr = acceptedMimes.join(',')

  const handleFile = useCallback(
    async (file) => {
      setError(null)
      if (!file) return

      if (!acceptedMimes.includes(file.type)) {
        setError('Format file tidak didukung.')
        return
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setError(`Ukuran file maksimal ${MAX_SIZE_MB}MB.`)
        return
      }

      // Show local preview
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => setPreview(e.target.result)
        reader.readAsDataURL(file)
      } else {
        setPreview('pdf')
      }

      if (!path) {
        // If no upload path, just call back with the file
        onUploaded?.(file, null)
        setSuccess(true)
        return
      }

      setUploading(true)
      const uploadPath = `${path}/${Date.now()}-${file.name.replace(/\s+/g, '_')}`
      const { url, error: uploadError } = await documentService.upload(file, bucket, uploadPath)
      setUploading(false)

      if (uploadError) {
        setError('Upload gagal. Silakan coba lagi.')
        return
      }

      setSuccess(true)
      onUploaded?.(file, url)
    },
    [acceptedMimes, path, bucket, onUploaded]
  )

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  const onInputChange = (e) => handleFile(e.target.files[0])

  const clearFile = () => {
    setPreview(null)
    setSuccess(false)
    setError(null)
    onUploaded?.(null, null)
  }

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label className="label-field">
          {label}
          {required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
      )}

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'relative border-2 border-dashed rounded-xl transition-all duration-200 overflow-hidden',
          dragging ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-slate-50/50',
          preview ? 'p-0' : 'p-8',
          error && 'border-red-300 bg-red-50/30',
          success && !error && 'border-emerald-300'
        )}
      >
        <AnimatePresence mode="wait">
          {preview ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative"
            >
              {preview === 'pdf' ? (
                <div className="flex items-center gap-3 p-4">
                  <FileText size={32} className="text-red-500 flex-shrink-0" />
                  <span className="text-sm text-slate-700 font-500">Dokumen PDF terupload</span>
                </div>
              ) : (
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full max-h-48 object-cover rounded-xl"
                />
              )}
              <button
                type="button"
                onClick={clearFile}
                className="absolute top-2 right-2 w-6 h-6 bg-slate-900/70 rounded-full flex items-center justify-center text-white hover:bg-slate-900 transition-colors"
              >
                <X size={12} />
              </button>
              {success && (
                <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-emerald-600 text-white text-xs px-2 py-1 rounded-full">
                  <CheckCircle size={10} />
                  Terupload
                </div>
              )}
            </motion.div>
          ) : (
            <motion.label
              key="upload"
              htmlFor={`file-${label}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3 cursor-pointer text-center"
            >
              <div className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center transition-colors',
                dragging ? 'bg-emerald-100' : 'bg-slate-100'
              )}>
                {uploading ? (
                  <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                ) : accept === 'image' ? (
                  <Image size={20} className={dragging ? 'text-emerald-600' : 'text-slate-400'} />
                ) : (
                  <Upload size={20} className={dragging ? 'text-emerald-600' : 'text-slate-400'} />
                )}
              </div>
              <div>
                <p className="text-sm font-500 text-slate-600">
                  {uploading ? 'Mengupload...' : 'Klik untuk upload atau drag & drop'}
                </p>
                {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
                <p className="text-xs text-slate-400 mt-0.5">
                  {accept === 'image' ? 'JPG, PNG, WebP' : 'JPG, PNG, PDF'} · Maks {MAX_SIZE_MB}MB
                </p>
              </div>
              <input
                id={`file-${label}`}
                type="file"
                accept={acceptStr}
                onChange={onInputChange}
                className="hidden"
                disabled={uploading}
              />
            </motion.label>
          )}
        </AnimatePresence>
      </div>

      {error && (
        <p className="flex items-center gap-1.5 text-xs text-red-500 font-500">
          <AlertCircle size={12} />
          {error}
        </p>
      )}
    </div>
  )
}
