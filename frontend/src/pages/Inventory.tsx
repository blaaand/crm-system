import React, { useState, useEffect, useRef } from 'react'
import { DocumentArrowUpIcon, /* XMarkIcon, */ MagnifyingGlassIcon, TrashIcon, CheckIcon, ArrowDownTrayIcon, XCircleIcon } from '@heroicons/react/24/outline'
import * as XLSX from 'xlsx'
import { useAuthStore } from '../stores/authStore'
import { inventoryService } from '../services/inventoryService'
import toast from 'react-hot-toast'
import { UserRole } from '../types'
// import { processInventoryData } from '../utils/inventoryParser' // Disabled - manual entry only

// interface InventoryItem {
//   groupName: string
//   specifications: string
//   color: string
//   sellingPrice: number
//   itemName: string
//   itemNumber: string
//   supplier: string
//   warehouse: string
//   carStatus: string
//   costPrice: number
//   costWarehouse: string
//   costAgent: string
//   model: string
//   costColor: string
//   costChassisNumber: string
//   costCarBrand: string
// }

type InventoryRow = Record<string, any>

export default function Inventory() {
  const { hasAnyRole } = useAuthStore()
  const canEdit = hasAnyRole([UserRole.ADMIN, UserRole.MANAGER])
  const topScrollRef = useRef<HTMLDivElement>(null)
  const bottomScrollRef = useRef<HTMLDivElement>(null)
  const [contentWidth, setContentWidth] = useState<number>(0)
  const [headers, setHeaders] = useState<string[]>([])
  const [inventoryData, setInventoryData] = useState<InventoryRow[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterColor, setFilterColor] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCompany, setFilterCompany] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [uploadedBy, setUploadedBy] = useState<string>('')
  const [loadingInventory, setLoadingInventory] = useState(true)
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set())
  const [selectedItemDetails, setSelectedItemDetails] = useState<InventoryRow | null>(null)

  // Load saved inventory from API on mount
  useEffect(() => {
    const loadInventory = async () => {
      setLoadingInventory(true)
      try {
        const result = await inventoryService.getInventory()
        if (result.headers.length > 0 && result.data.length > 0) {
          setHeaders(result.headers)
          setInventoryData(result.data)
          if (result.uploadedBy) {
            setUploadedBy(result.uploadedBy)
          }
        }
      } catch (error) {
        console.error('Error loading inventory:', error)
        // Fallback to localStorage if API fails (backward compatibility)
        const savedHeaders = localStorage.getItem('inventoryHeaders')
        const savedData = localStorage.getItem('inventoryData')
        if (savedData && savedHeaders) {
          setHeaders(JSON.parse(savedHeaders))
          setInventoryData(JSON.parse(savedData))
        }
      } finally {
        setLoadingInventory(false)
      }
    }
    loadInventory()
  }, [])

  // Sync top/bottom horizontal scrollbars
  useEffect(() => {
    const top = topScrollRef.current
    const bottom = bottomScrollRef.current
    if (!top || !bottom) return

    const onTopScroll = () => {
      bottom.scrollLeft = top.scrollLeft
    }
    const onBottomScroll = () => {
      top.scrollLeft = bottom.scrollLeft
    }
    top.addEventListener('scroll', onTopScroll)
    bottom.addEventListener('scroll', onBottomScroll)

    return () => {
      top.removeEventListener('scroll', onTopScroll)
      bottom.removeEventListener('scroll', onBottomScroll)
    }
  }, [inventoryData, headers])

  // Measure content width for top scroller
  useEffect(() => {
    const bottom = bottomScrollRef.current
    if (!bottom) return
    // slight delay to ensure layout
    const id = window.requestAnimationFrame(() => {
      setContentWidth(bottom.scrollWidth)
    })
    return () => window.cancelAnimationFrame(id)
  }, [inventoryData, headers])

  const handleClearInventory = async () => {
    if (!canEdit) return
    if (!confirm('هل أنت متأكد من حذف المخزون؟ هذا الإجراء لا يمكن التراجع عنه.')) {
      return
    }
    try {
      await inventoryService.clearInventory()
      setInventoryData([])
      setHeaders([])
      setSelectedFile(null)
      setSearchTerm('')
      setFilterColor('')
      setFilterStatus('')
      // Clear localStorage as well for backward compatibility
      localStorage.removeItem('inventoryData')
      localStorage.removeItem('inventoryHeaders')
      toast.success('تم حذف المخزون بنجاح')
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'حدث خطأ أثناء حذف المخزون')
    }
  }

  const handleSaveInventory = async () => {
    if (!canEdit) return
    setIsSaving(true)
    try {
      // Add company and category columns if they don't exist (empty - manual entry)
      const newHeaders = [...headers]
      const newData = [...inventoryData]
      
      const hasCompany = headers.some(h => h === 'الشركة' || h.includes('شركة'))
      const hasCategory = headers.some(h => h === 'الفئة' || h.includes('فئة'))
      
      if (!hasCompany) {
        newHeaders.push('الشركة')
        newData.forEach(row => {
          row['الشركة'] = row['الشركة'] || ''
        })
      }
      
      if (!hasCategory) {
        newHeaders.push('الفئة')
        newData.forEach(row => {
          row['الفئة'] = row['الفئة'] || ''
        })
      }
      
      const result = await inventoryService.saveInventory(newHeaders, newData)
      
      // Update local state
      setHeaders(newHeaders)
      setInventoryData(newData)
      
      // Also save to localStorage for backward compatibility
      localStorage.setItem('inventoryHeaders', JSON.stringify(newHeaders))
      localStorage.setItem('inventoryData', JSON.stringify(newData))
      
      if (result.inventory?.uploadedBy) {
        setUploadedBy(result.inventory.uploadedBy)
      }
      toast.success(`تم حفظ ${newData.length} سيارة في المخزون بنجاح!`)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'حدث خطأ أثناء حفظ المخزون')
    } finally {
      setIsSaving(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!canEdit) return
    const file = event.target.files?.[0]
    if (!file) return

    setSelectedFile(file)

    // Read Excel file using xlsx library
    const reader = new FileReader()
    reader.onload = (e) => {
      const data = e.target?.result
      const workbook = XLSX.read(data as string, { type: 'binary' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]

      // Read as array-of-arrays to preserve exact headers and order
      const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: '' }) as any
      if (!rows || rows.length < 2) {
        setHeaders([])
        setInventoryData([])
        return
      }
      const headerRow = (rows[0] as any[]).map(h => (h ?? '').toString())
      const dataRows = rows.slice(1)
      const mapped: InventoryRow[] = dataRows.map(r => {
        const obj: InventoryRow = {}
        headerRow.forEach((h, idx) => {
          obj[h] = r[idx] ?? ''
        })
        return obj
      })
      // Replace current data with new file content, do NOT save yet
      setHeaders(headerRow)
      setInventoryData(mapped)
    }

    reader.readAsBinaryString(file)
  }

  const filteredData = inventoryData.filter((row) => {
    const text = headers.map(h => String(row[h] ?? '')).join(' ').toLowerCase()
    const matchesSearch = text.includes(searchTerm.toLowerCase())
    const matchesColor = !filterColor || headers.some(h => h.includes('لون') && row[h] === filterColor)
    const matchesStatus = !filterStatus || headers.some(h => h.includes('حالة') && row[h] === filterStatus)
    
    // Filter by company
    const companyHeader = headers.find(h => h === 'الشركة' || h.includes('شركة'))
    const matchesCompany = !filterCompany || (companyHeader && row[companyHeader] === filterCompany)
    
    // Filter by category (only if company is selected)
    const categoryHeader = headers.find(h => h === 'الفئة' || h.includes('فئة'))
    const matchesCategory = !filterCategory || (categoryHeader && row[categoryHeader] === filterCategory)
    
    return matchesSearch && matchesColor && matchesStatus && matchesCompany && matchesCategory
  })

  // Reset selection when filters change
  useEffect(() => {
    setSelectedItems(new Set())
  }, [searchTerm, filterColor, filterStatus, filterCompany, filterCategory])
  
  // Reset category filter when company changes
  useEffect(() => {
    setFilterCategory('')
  }, [filterCompany])

  const uniqueColors = Array.from(new Set(inventoryData.flatMap(row => headers.filter(h=>h.includes('لون')).map(h => row[h])))).filter(Boolean) as string[]
  const uniqueStatuses = Array.from(new Set(inventoryData.flatMap(row => headers.filter(h=>h.includes('حالة')).map(h => row[h])))).filter(Boolean) as string[]
  
  // Get unique companies and categories
  const companyHeader = headers.find(h => h === 'الشركة' || h.includes('شركة'))
  const categoryHeader = headers.find(h => h === 'الفئة' || h.includes('فئة'))
  const uniqueCompanies = Array.from(new Set(inventoryData.map(row => companyHeader ? row[companyHeader] : '').filter(Boolean))).sort() as string[]
  const uniqueCategories = Array.from(new Set(
    inventoryData
      .filter(row => !filterCompany || (companyHeader && row[companyHeader] === filterCompany))
      .map(row => categoryHeader ? row[categoryHeader] : '')
      .filter(Boolean)
  )).sort() as string[]

  // Handle item selection
  const toggleItemSelection = (index: number) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedItems(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedItems.size === filteredData.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(filteredData.map((_, index) => index)))
    }
  }

  // Export selected items to Excel
  const handleExportSelected = () => {
    if (selectedItems.size === 0) {
      toast.error('لم يتم تحديد أي عناصر للتصدير')
      return
    }

    const selectedRows = Array.from(selectedItems).map(index => filteredData[index])
    
    // Find selling price and cost price columns
    const sellingPriceHeader = headers.find(h => h.includes('سعر') && h.includes('بيع')) || headers.find(h => h.includes('بيع'))
    const costPriceHeader = headers.find(h => h.includes('تكلفة') || h.includes('شراء')) || headers.find(h => h.includes('تكلفة'))

    // Prepare data with selling price and cost price side by side
    const exportHeaders = [...headers]
    
    // Reorder headers to put cost price next to selling price if both exist
    if (sellingPriceHeader && costPriceHeader) {
      const sellingIndex = exportHeaders.indexOf(sellingPriceHeader)
      const costIndex = exportHeaders.indexOf(costPriceHeader)
      
      // Remove cost price from its position
      exportHeaders.splice(costIndex, 1)
      
      // Insert cost price right after selling price
      exportHeaders.splice(sellingIndex + 1, 0, costPriceHeader)
    }

    // Create worksheet
    const worksheetData = [
      exportHeaders,
      ...selectedRows.map(row => exportHeaders.map(h => row[h] ?? ''))
    ]

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'المخزون')

    // Export
    XLSX.writeFile(workbook, `مخزون_محدد_${new Date().toISOString().split('T')[0]}.xlsx`)
    toast.success(`تم تصدير ${selectedItems.size} عنصر بنجاح`)
  }

  // Handle row click to show details
  const handleRowClick = (row: InventoryRow) => {
    setSelectedItemDetails(row)
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📦 المخزون</h1>
          <p className="mt-2 text-sm text-gray-600">إدارة مخزون السيارات والمتعلقات</p>
        </div>
        
        <label className={`btn-primary cursor-pointer inline-flex items-center ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}>
          <DocumentArrowUpIcon className="h-5 w-5 ml-2" />
          رفع ملف Excel
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileUpload}
            className="hidden"
            disabled={!canEdit}
          />
        </label>
      </div>

      {selectedFile && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center">
            <DocumentArrowUpIcon className="h-6 w-6 text-green-600 ml-3" />
            <div>
              <p className="font-semibold text-green-900">تم رفع الملف: {selectedFile.name}</p>
              <p className="text-sm text-green-700">
                {inventoryData.length} سيارة في المخزون
                {uploadedBy && ` • تم الرفع بواسطة: ${uploadedBy}`}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSaveInventory}
              disabled={isSaving || !canEdit}
              className={`btn-primary inline-flex items-center disabled:opacity-50 ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <CheckIcon className="h-5 w-5 ml-2" />
              {isSaving ? 'جاري الحفظ...' : 'حفظ المخزون'}
            </button>
            <button
              onClick={handleClearInventory}
              className={`btn-danger inline-flex items-center ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={!canEdit}
            >
              <TrashIcon className="h-5 w-5 ml-2" />
              حذف المخزون
            </button>
          </div>
        </div>
      )}

      {inventoryData.length > 0 && (
        <div className="card mb-6">
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="البحث في المخزون..."
                  className="input w-full pr-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              {/* Company Filter */}
              {companyHeader && (
                <select
                  className="input"
                  value={filterCompany}
                  onChange={(e) => setFilterCompany(e.target.value)}
                >
                  <option value="">جميع الشركات</option>
                  {uniqueCompanies.map((company) => (
                    <option key={company} value={company}>{company}</option>
                  ))}
                </select>
              )}
              
              {/* Category Filter - only shown if company is selected */}
              {categoryHeader && filterCompany && (
                <select
                  className="input"
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  <option value="">جميع الفئات</option>
                  {uniqueCategories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              )}
              
              <select
                className="input"
                value={filterColor}
                onChange={(e) => setFilterColor(e.target.value)}
              >
                <option value="">جميع الألوان</option>
                {uniqueColors.map((color) => (
                  <option key={color} value={color}>{color}</option>
                ))}
              </select>
              
              <select
                className="input"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">جميع الحالات</option>
                {uniqueStatuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            {/* Selection and Export Controls */}
            <div className="flex items-center justify-between gap-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleSelectAll}
                  className="btn-outline text-sm"
                >
                  {selectedItems.size === filteredData.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                </button>
                <span className="text-sm text-gray-600">
                  {selectedItems.size > 0 && `تم تحديد ${selectedItems.size} من ${filteredData.length}`}
                </span>
              </div>
              {selectedItems.size > 0 && (
                <button
                  onClick={handleExportSelected}
                  className="btn-primary inline-flex items-center text-sm"
                >
                  <ArrowDownTrayIcon className="h-4 w-4 ml-2" />
                  استخراج المحدد ({selectedItems.size})
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {inventoryData.length > 0 && (
        <div className="card">
          {/* Top horizontal scroller under headers */}
          <div ref={topScrollRef} className="overflow-x-auto">
            <div style={{ width: contentWidth || undefined }} className="h-3" />
          </div>
          <div ref={bottomScrollRef} className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-primary-500/10 to-primary-400/10">
                <tr>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider w-12">
                    <input
                      type="checkbox"
                      checked={selectedItems.size === filteredData.length && filteredData.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                  </th>
                  {(() => {
                    // Reorder headers to put cost price next to selling price in header too
                    const sellingPriceHeader = headers.find(h => h.includes('سعر') && h.includes('بيع')) || headers.find(h => h.includes('بيع'))
                    const costPriceHeader = headers.find(h => h.includes('تكلفة') || h.includes('شراء')) || headers.find(h => h.includes('تكلفة'))
                    const reorderedHeaders = [...headers]
                    if (sellingPriceHeader && costPriceHeader) {
                      const sellingIndex = reorderedHeaders.indexOf(sellingPriceHeader)
                      const costIndex = reorderedHeaders.indexOf(costPriceHeader)
                      if (costIndex !== sellingIndex + 1) {
                        reorderedHeaders.splice(costIndex, 1)
                        reorderedHeaders.splice(sellingIndex + 1, 0, costPriceHeader)
                      }
                    }
                    return reorderedHeaders
                  })().map((h, idx) => {
                    const sellingPriceHeader = headers.find(h2 => h2.includes('سعر') && h2.includes('بيع')) || headers.find(h2 => h2.includes('بيع'))
                    const costPriceHeader = headers.find(h2 => h2.includes('تكلفة') || h2.includes('شراء')) || headers.find(h2 => h2.includes('تكلفة'))
                    const isSellingPrice = sellingPriceHeader === h
                    const isCostPrice = costPriceHeader === h
                    return (
                      <th
                        key={h}
                        className={`px-6 py-3 text-right text-xs font-bold uppercase tracking-wider ${idx === 0 ? 'min-w-[220px]' : 'min-w-[160px]'} ${isSellingPrice ? 'text-green-700' : isCostPrice ? 'text-blue-700' : 'text-gray-700'}`}
                      >
                        {h}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.map((row, index) => {
                  const isSelected = selectedItems.has(index)
                  // Find headers
                  const sellingPriceHeader = headers.find(h => h.includes('سعر') && h.includes('بيع')) || headers.find(h => h.includes('بيع'))
                  const costPriceHeader = headers.find(h => h.includes('تكلفة') || h.includes('شراء')) || headers.find(h => h.includes('تكلفة'))
                  
                  // Reorder headers to put cost price next to selling price
                  const reorderedHeaders = [...headers]
                  if (sellingPriceHeader && costPriceHeader) {
                    const sellingIndex = reorderedHeaders.indexOf(sellingPriceHeader)
                    const costIndex = reorderedHeaders.indexOf(costPriceHeader)
                    if (costIndex !== sellingIndex + 1) {
                      reorderedHeaders.splice(costIndex, 1)
                      reorderedHeaders.splice(sellingIndex + 1, 0, costPriceHeader)
                    }
                  }
                  
                  return (
                    <tr 
                      key={index} 
                      className={`hover:bg-gray-50 transition-colors cursor-pointer ${isSelected ? 'bg-blue-50' : ''}`}
                      onClick={() => handleRowClick(row)}
                    >
                      <td 
                        className="px-4 py-4 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleItemSelection(index)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                      </td>
                      {reorderedHeaders.map((h, idx) => {
                        const value = String(row[h] ?? '-')
                        const isStatus = h.includes('حالة')
                        const isSellingPrice = sellingPriceHeader === h
                        const isCostPrice = costPriceHeader === h
                        
                        let content: string | React.ReactNode = value
                        if (isStatus) {
                          content = (
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                value.includes('غير محجوزة')
                                  ? 'bg-green-100 text-green-800'
                                  : value.includes('محجوزة')
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {value}
                            </span>
                          )
                        } else if (isSellingPrice || isCostPrice) {
                          // Format numbers
                          const numValue = parseFloat(value)
                          if (!isNaN(numValue)) {
                            content = numValue.toLocaleString('ar-SA')
                          }
                        }
                        
                        return (
                          <td
                            key={h}
                            className={`px-6 py-4 whitespace-nowrap text-sm text-gray-700 ${idx === 0 ? 'min-w-[220px]' : 'min-w-[160px]'} ${isSellingPrice || isCostPrice ? 'font-semibold' : ''} ${isSellingPrice ? 'text-green-700' : ''} ${isCostPrice ? 'text-blue-700' : ''}`}
                          >
                            {content}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loadingInventory && inventoryData.length === 0 && !selectedFile && (
        <div className="card">
          <div className="card-body text-center py-12">
            <DocumentArrowUpIcon className="mx-auto h-16 w-16 text-gray-400" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900">ابدأ برفع ملف المخزون</h3>
            <p className="mt-2 text-sm text-gray-600">ارفع ملف Excel لمخزون السيارات لعرض البيانات</p>
            <label className={`mt-6 btn-primary cursor-pointer inline-flex items-center ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <DocumentArrowUpIcon className="h-5 w-5 ml-2" />
              رفع ملف Excel
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
                disabled={!canEdit}
              />
            </label>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedItemDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">تفاصيل السيارة</h3>
              <button
                onClick={() => setSelectedItemDetails(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="overflow-y-auto p-6">
              {(() => {
                // Find specific headers
                const getHeaderValue = (searchTerms: string[]) => {
                  const header = headers.find(h => searchTerms.some(term => h.includes(term)))
                  return header ? String(selectedItemDetails[header] ?? '-') : '-'
                }
                
                const groupName = getHeaderValue(['اسم المجموعة', 'المجموعة'])
                const itemName = getHeaderValue(['اسم الصنف', 'الصنف'])
                const costBrand = getHeaderValue(['التكلفة.ماركة السيارة', 'ماركة', 'الماركة'])
                const costAgent = getHeaderValue(['التكلفة.الوكيل', 'الوكيل'])
                const color = getHeaderValue(['اللون'])
                const model = getHeaderValue(['الموديل', 'موديل'])
                const specifications = getHeaderValue(['الموصفات', 'المواصفات'])
                const itemNumber = getHeaderValue(['رقم الصنف', 'رقم'])
                const supplier = getHeaderValue(['المورد'])
                const warehouse = getHeaderValue(['المستودع'])
                const sellingPrice = getHeaderValue(['سعر البيع', 'بيع'])
                const costPrice = getHeaderValue(['سعر التكلفة', 'التكلفة', 'تكلفة'])
                const carStatus = getHeaderValue(['حالة السيارة', 'الحالة', 'حالة'])
                
                // Get remaining headers (excluding the ones we've already displayed)
                const displayedHeaders = new Set([
                  ...headers.filter(h => h.includes('اسم المجموعة') || h.includes('المجموعة')),
                  ...headers.filter(h => h.includes('اسم الصنف') || h.includes('الصنف')),
                  ...headers.filter(h => h.includes('التكلفة.ماركة') || h.includes('ماركة')),
                  ...headers.filter(h => h.includes('التكلفة.الوكيل') || h.includes('الوكيل')),
                  ...headers.filter(h => h.includes('اللون')),
                  ...headers.filter(h => h.includes('الموديل') || h.includes('موديل')),
                  ...headers.filter(h => h.includes('الموصفات') || h.includes('المواصفات')),
                  ...headers.filter(h => h.includes('رقم الصنف') || h.includes('رقم')),
                  ...headers.filter(h => h.includes('المورد')),
                  ...headers.filter(h => h.includes('المستودع')),
                  ...headers.filter(h => h.includes('سعر البيع') || h.includes('بيع')),
                  ...headers.filter(h => h.includes('سعر التكلفة') || h.includes('التكلفة') || h.includes('تكلفة')),
                  ...headers.filter(h => h.includes('حالة السيارة') || h.includes('الحالة') || h.includes('حالة')),
                ])
                
                const remainingHeaders = headers.filter(h => !displayedHeaders.has(h))
                
                return (
                <div className="space-y-4">
                  {/* Row 1: اسم المجموعة | اسم الصنف */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border bg-gray-50 border-gray-200">
                      <div className="text-xs font-medium text-gray-500 mb-1">اسم المجموعة</div>
                      <div className="text-sm font-semibold text-gray-900">{groupName}</div>
                    </div>
                    <div className="p-4 rounded-lg border bg-gray-50 border-gray-200">
                      <div className="text-xs font-medium text-gray-500 mb-1">اسم الصنف</div>
                      <div className="text-sm font-semibold text-gray-900">{itemName}</div>
                    </div>
                  </div>

                  {/* Row 2: التكلفة.ماركة السيارة | التكلفة.الوكيل */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border bg-blue-50 border-blue-200">
                      <div className="text-xs font-medium text-gray-500 mb-1">التكلفة.ماركة السيارة</div>
                      <div className="text-sm font-semibold text-blue-700">{costBrand}</div>
                    </div>
                    <div className="p-4 rounded-lg border bg-blue-50 border-blue-200">
                      <div className="text-xs font-medium text-gray-500 mb-1">التكلفة.الوكيل</div>
                      <div className="text-sm font-semibold text-blue-700">{costAgent}</div>
                    </div>
                  </div>

                  {/* Row 3: اللون | الموديل */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border bg-gray-50 border-gray-200">
                      <div className="text-xs font-medium text-gray-500 mb-1">اللون</div>
                      <div className="text-sm font-semibold text-gray-900">{color}</div>
                    </div>
                    <div className="p-4 rounded-lg border bg-gray-50 border-gray-200">
                      <div className="text-xs font-medium text-gray-500 mb-1">الموديل</div>
                      <div className="text-sm font-semibold text-gray-900">{model}</div>
                    </div>
                  </div>

                  {/* Row 4: الموصفات | رقم الصنف */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border bg-gray-50 border-gray-200">
                      <div className="text-xs font-medium text-gray-500 mb-1">الموصفات</div>
                      <div className="text-sm font-semibold text-gray-900">{specifications}</div>
                    </div>
                    <div className="p-4 rounded-lg border bg-gray-50 border-gray-200">
                      <div className="text-xs font-medium text-gray-500 mb-1">رقم الصنف</div>
                      <div className="text-sm font-semibold text-gray-900">{itemNumber}</div>
                    </div>
                  </div>

                  {/* Row 5: المورد | المستودع */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border bg-gray-50 border-gray-200">
                      <div className="text-xs font-medium text-gray-500 mb-1">المورد</div>
                      <div className="text-sm font-semibold text-gray-900">{supplier}</div>
                    </div>
                    <div className="p-4 rounded-lg border bg-gray-50 border-gray-200">
                      <div className="text-xs font-medium text-gray-500 mb-1">المستودع</div>
                      <div className="text-sm font-semibold text-gray-900">{warehouse}</div>
                    </div>
                  </div>

                  {/* Row 6: سعر البيع | سعر التكلفة */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border bg-green-50 border-green-200">
                      <div className="text-xs font-medium text-gray-500 mb-1">سعر البيع</div>
                      <div className="text-sm font-semibold text-green-700">
                        {!isNaN(parseFloat(sellingPrice)) ? parseFloat(sellingPrice).toLocaleString('ar-SA') + ' ريال' : sellingPrice}
                      </div>
                    </div>
                    <div className="p-4 rounded-lg border bg-blue-50 border-blue-200">
                      <div className="text-xs font-medium text-gray-500 mb-1">سعر التكلفة</div>
                      <div className="text-sm font-semibold text-blue-700">
                        {!isNaN(parseFloat(costPrice)) ? parseFloat(costPrice).toLocaleString('ar-SA') + ' ريال' : costPrice}
                      </div>
                    </div>
                  </div>

                  {/* Row 7: حالة السيارة */}
                  <div className="grid grid-cols-1 gap-4">
                    <div className="p-4 rounded-lg border bg-gray-50 border-gray-200">
                      <div className="text-xs font-medium text-gray-500 mb-1">حالة السيارة</div>
                      <div className="text-sm font-semibold">
                        {carStatus.includes('غير محجوزة') || carStatus.includes('متاحة') ? (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold inline-block bg-green-100 text-green-800">
                            {carStatus}
                          </span>
                        ) : carStatus.includes('محجوزة') || carStatus.includes('محجوز') ? (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold inline-block bg-red-100 text-red-800">
                            {carStatus}
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold inline-block bg-gray-100 text-gray-700">
                            {carStatus}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* باقي التفاصيل */}
                  {remainingHeaders.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <h4 className="text-sm font-bold text-gray-700 mb-4">باقي التفاصيل</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {remainingHeaders.map((header, idx) => {
                          const value = String(selectedItemDetails[header] ?? '-')
                          return (
                            <div key={idx} className="p-3 rounded-lg border bg-gray-50 border-gray-200">
                              <div className="text-xs font-medium text-gray-500 mb-1">{header}</div>
                              <div className="text-sm text-gray-900">{value}</div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
                )
              })()}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setSelectedItemDetails(null)}
                className="btn-outline"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

