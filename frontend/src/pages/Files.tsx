import { useState } from 'react'
import { useQuery } from 'react-query'
import { 
  DocumentArrowUpIcon, 
  DocumentArrowDownIcon,
  XMarkIcon,
  DocumentIcon,
  PhotoIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { useAuthStore } from '../stores/authStore'
import { generateEradExcel, generateOfferExcel, generateCarHandoverExcel } from '../utils/excelExport'
import { requestsService } from '../services/requestsService'
import { banksService } from '../services/banksService'
import { inventoryService } from '../services/inventoryService'
import { filesService, SystemFile } from '../services/filesService'

interface FileItem {
  id: string
  name: string
  type: 'excel' | 'pdf' | 'image'
  category: 'template' | 'uploaded'
  templateType?: 'erad' | 'offer' | 'handover'
  file?: File
  url?: string
}

export default function Files() {
  const { hasAnyRole } = useAuthStore()
  const canUpload = hasAnyRole(['ADMIN', 'MANAGER'])
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [newFileName, setNewFileName] = useState('')
  const [newFile, setNewFile] = useState<File | null>(null)
  
  // Load requests data (keeping for other features if needed)
  const { data: requestsData } = useQuery('requests', () => requestsService.getRequests({ page: 1, limit: 100 }))
  const { data: banksData } = useQuery('banks', banksService.getBanks)
  const { data: inventoryData } = useQuery(
    'inventory',
    async () => {
      try {
        const result = await inventoryService.getInventory()
        return result
      } catch (error) {
        return { headers: [], data: [] }
      }
    }
  )
  const { data: savedFiles, refetch: refetchFiles } = useQuery('system-files', filesService.getFiles)

  // Initialize file list with templates
  const [files, setFiles] = useState<FileItem[]>([
    {
      id: 'erad-template',
      name: 'تحميل تحليل إيراد',
      type: 'excel',
      category: 'template',
      templateType: 'erad',
    },
    {
      id: 'offer-template',
      name: 'تحميل عرض سعر',
      type: 'excel',
      category: 'template',
      templateType: 'offer',
    },
    {
      id: 'handover-template',
      name: 'تحميل سند تسليم سيارة',
      type: 'excel',
      category: 'template',
      templateType: 'handover',
    },
  ])

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'excel':
        return <DocumentArrowDownIcon className="h-12 w-12 text-green-600" />
      case 'pdf':
        return <DocumentIcon className="h-12 w-12 text-red-600" />
      case 'image':
        return <PhotoIcon className="h-12 w-12 text-blue-600" />
      default:
        return <DocumentIcon className="h-12 w-12 text-gray-600" />
    }
  }

  const getFileTypeLabel = (type: string) => {
    switch (type) {
      case 'excel':
        return 'Excel'
      case 'pdf':
        return 'PDF'
      case 'image':
        return 'صورة'
      default:
        return 'ملف'
    }
  }

  const handleTemplateDownload = async (templateType: string) => {
    try {
      let templatePath = ''
      let fileName = ''
      if (templateType === 'erad') {
        templatePath = '/templates/erad.xlsx'
        fileName = 'تحليل_إيراد.xlsx'
      } else if (templateType === 'offer') {
        templatePath = '/templates/offer.xlsx'
        fileName = 'عرض_سعر.xlsx'
      } else if (templateType === 'handover') {
        templatePath = '/templates/car-handover-receipt.xlsx'
        fileName = 'سند_تسليم_سيارة.xlsx'
      }
      
      const response = await fetch(templatePath)
      if (!response.ok) throw new Error('تعذر تحميل الملف')
      const blob = await response.blob()
      
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success('تم تحميل الملف')
    } catch (error: any) {
      toast.error(error?.message || 'تعذر تحميل الملف')
    }
  }

  const handleUploadFile = async () => {
    if (!newFileName.trim()) {
      toast.error('يرجى إدخال اسم الملف')
      return
    }
    if (!newFile) {
      toast.error('يرجى اختيار ملف')
      return
    }

    try {
      const fileType = newFile.type.includes('image') ? 'image' : newFile.type.includes('pdf') ? 'pdf' : 'excel'
      
      // Save file to backend
      await filesService.saveFile(newFile, newFileName, fileType)
      
      // Refresh files list
      refetchFiles()
      
      setShowUploadModal(false)
      setNewFileName('')
      setNewFile(null)
      toast.success('تم حفظ الملف بنجاح')
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'تعذر حفظ الملف')
    }
  }

  const handleDeleteFile = (id: string) => {
    if (!canUpload) {
      toast.error('ليس لديك صلاحية لحذف الملفات')
      return
    }
    if (confirm('هل أنت متأكد من حذف هذا الملف؟')) {
      const file = files.find(f => f.id === id)
      if (file?.url) {
        URL.revokeObjectURL(file.url)
      }
      setFiles(files.filter(f => f.id !== id))
      toast.success('تم حذف الملف')
    }
  }

  const handleDownloadFile = async (file: FileItem | SystemFile) => {
    // Check if it's a saved file (has id property from SystemFile)
    if ('id' in file && !('category' in file)) {
      // It's a SystemFile
      try {
        const blob = await filesService.downloadFile(file.id)
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = file.name
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
        toast.success('تم تحميل الملف')
      } catch (error: any) {
        toast.error(error?.response?.data?.message || 'تعذر تحميل الملف')
      }
    } else if ((file as FileItem).category === 'template') {
      handleTemplateDownload((file as FileItem).templateType!)
    } else if ((file as FileItem).file) {
      const url = URL.createObjectURL((file as FileItem).file!)
      const a = document.createElement('a')
      a.href = url
      a.download = (file as FileItem).name
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    }
  }

  const handleDeleteSavedFile = async (fileId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الملف؟')) {
      return
    }
    try {
      await filesService.deleteFile(fileId)
      refetchFiles()
      toast.success('تم حذف الملف')
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'تعذر حذف الملف')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">الملفات</h1>
        {canUpload && (
          <button
            onClick={() => setShowUploadModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <DocumentArrowUpIcon className="h-5 w-5" />
            إرفاق ملف
          </button>
        )}
      </div>

      {/* Files Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {files.map((file) => (
          <div key={file.id} className="card hover:shadow-lg transition-shadow">
            <div className="card-body text-center">
              <div className="flex justify-center mb-4">
                {file.type === 'image' && file.url ? (
                  <img src={file.url} alt={file.name} className="h-32 w-full object-cover rounded-lg" />
                ) : (
                  getFileIcon(file.type)
                )}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{file.name}</h3>
              <div className="flex items-center justify-center gap-2 mb-4">
                <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                  {getFileTypeLabel(file.type)}
                </span>
                {file.category === 'template' && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                    قالب
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                {file.category === 'template' ? (
                  <button
                    onClick={() => handleTemplateDownload(file.templateType!)}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                    title="تحميل الملف الأصلي"
                  >
                    <DocumentArrowDownIcon className="h-4 w-4" />
                    تحميل
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => handleDownloadFile(file)}
                      className="btn-primary flex-1 flex items-center justify-center gap-2"
                    >
                      <DocumentArrowDownIcon className="h-4 w-4" />
                      تحميل
                    </button>
                    {file.category === 'uploaded' && canUpload && (
                      <button
                        onClick={() => handleDeleteFile(file.id)}
                        className="btn-danger p-2"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {/* Saved Files from Database */}
        {savedFiles?.map((file) => (
          <div key={file.id} className="card hover:shadow-lg transition-shadow">
            <div className="card-body text-center">
              <div className="flex justify-center mb-4">
                {getFileIcon(file.fileType)}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{file.name}</h3>
              <div className="flex items-center justify-center gap-2 mb-4">
                <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                  {getFileTypeLabel(file.fileType)}
                </span>
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                  محفوظ
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDownloadFile(file)}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  <DocumentArrowDownIcon className="h-4 w-4" />
                  تحميل
                </button>
                {canUpload && (
                  <button
                    onClick={() => handleDeleteSavedFile(file.id)}
                    className="btn-danger p-2"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">إرفاق ملف</h3>
              <button
                onClick={() => {
                  setShowUploadModal(false)
                  setNewFileName('')
                  setNewFile(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم الملف</label>
                <input
                  type="text"
                  className="input w-full"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder="اسم الملف"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اختر ملف</label>
                <input
                  type="file"
                  className="input w-full"
                  onChange={(e) => setNewFile(e.target.files?.[0] || null)}
                  accept=".xlsx,.xls,.pdf,.jpg,.jpeg,.png"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowUploadModal(false)
                  setNewFileName('')
                  setNewFile(null)
                }}
                className="btn-outline"
              >
                إلغاء
              </button>
              <button
                onClick={handleUploadFile}
                className="btn-primary"
              >
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

