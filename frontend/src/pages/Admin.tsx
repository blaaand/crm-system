import { useEffect, useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import { authService } from '../services/authService'
import { TrashIcon, PencilIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { UserRole } from '../types'

export default function Admin() {
  const { hasAnyRole } = useAuthStore()
  const isAdmin = hasAnyRole([UserRole.ADMIN])
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'AGENT' | 'MANAGER' | 'ADMIN'>('AGENT')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [users, setUsers] = useState<any[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [searchPhone, setSearchPhone] = useState('')
  const [editingUser, setEditingUser] = useState<any | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  const handleCreate = async () => {
    if (!isAdmin) return
    setMessage(null)
    if (!name.trim() || !phone.trim() || !password.trim()) {
      setMessage('يرجى تعبئة جميع الحقول')
      return
    }
    setLoading(true)
    try {
      const res = await authService.adminCreateUser({ name, phone, email, password, role })
      toast.success(`تم إنشاء المستخدم: ${res.user.name}`)
      setName('')
      setPhone('')
      setEmail('')
      setPassword('')
      setRole('AGENT')
      await loadUsers()
    } catch (e: any) {
      const errorMsg = e?.response?.data?.message || 'حدث خطأ أثناء الإنشاء'
      setMessage(errorMsg)
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (userId: string, userName: string) => {
    if (!isAdmin) return
    if (!confirm(`هل أنت متأكد من حذف الموظف "${userName}"؟\nهذا الإجراء لا يمكن التراجع عنه.`)) {
      return
    }
    try {
      await authService.adminDeleteUser(userId)
      toast.success('تم حذف الموظف بنجاح')
      await loadUsers()
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'حدث خطأ أثناء الحذف')
    }
  }

  const handleEdit = (user: any) => {
    setEditingUser(user)
    setIsEditing(true)
  }

  const handleSaveEdit = async () => {
    if (!editingUser) return
    try {
      await authService.adminUpdateUser(editingUser.id, {
        role: editingUser.role,
        active: editingUser.active,
      })
      toast.success('تم تحديث بيانات الموظف بنجاح')
      setIsEditing(false)
      setEditingUser(null)
      await loadUsers()
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'حدث خطأ أثناء التعديل')
    }
  }

  const filteredUsers = users.filter((u) => {
    if (!searchPhone.trim()) return true
    return u.phone?.includes(searchPhone.trim())
  })

  const loadUsers = async () => {
    if (!isAdmin) return
    setLoadingUsers(true)
    try {
      const res = await authService.adminListUsers()
      setUsers(res.users)
    } finally {
      setLoadingUsers(false)
    }
  }

  useEffect(() => {
    loadUsers()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin])

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">لوحة الإدارة</h1>

      {!isAdmin ? (
        <div className="text-center py-12">
          <p className="text-gray-500">غير مصرح لك بالوصول</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-gray-900">إنشاء موظف جديد</h2>
              <p className="text-sm text-gray-500 mt-1">أدخل الاسم الكامل، رقم الجوال، كلمة المرور، والصلاحية</p>
            </div>
            <div className="card-body space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الاسم الكامل</label>
                <input className="input w-full" value={name} onChange={(e)=>setName(e.target.value)} placeholder="مثال: أحمد محمد" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">رقم الجوال</label>
                <input className="input w-full" value={phone} onChange={(e)=>setPhone(e.target.value)} placeholder="مثال: 05xxxxxxxx" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني (اختياري)</label>
                <input className="input w-full" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="مثال: user@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور</label>
                <input className="input w-full" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="••••••••" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الصلاحية</label>
                <select className="input w-full" value={role} onChange={(e)=>setRole(e.target.value as any)}>
                  <option value="AGENT">موظف عادي</option>
                  <option value="MANAGER">موظف مساعد</option>
                  <option value="ADMIN">موظف إداري</option>
                </select>
              </div>
              {message && <div className="text-sm text-gray-600">{message}</div>}
            </div>
            <div className="card-footer">
              <button className="btn-primary" onClick={handleCreate} disabled={loading}>
                {loading ? 'جاري الإنشاء...' : 'إنشاء الموظف'}
              </button>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-gray-900">الموظفون</h2>
              <p className="text-sm text-gray-500 mt-1">إدارة الموظفين: البحث، التعديل، والحذف</p>
            </div>
            <div className="card-body">
              {/* Search Bar */}
              <div className="mb-4">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    className="input w-full pr-10"
                    placeholder="ابحث برقم الجوال..."
                    value={searchPhone}
                    onChange={(e) => setSearchPhone(e.target.value)}
                  />
                </div>
              </div>

              {loadingUsers ? (
                <div className="text-gray-500 text-center py-8">جاري تحميل المستخدمين...</div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-gray-500 text-center py-8">
                  {searchPhone ? 'لم يتم العثور على موظفين بهذا الرقم' : 'لا يوجد مستخدمون'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الاسم</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الجوال</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الصلاحية</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{u.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-700" dir="ltr">{u.phone || '-'}</td>
                          <td className="px-4 py-3">
                            <select
                              className="input text-sm"
                              value={u.role}
                              onChange={async (e) => {
                                const role = e.target.value as 'ADMIN'|'MANAGER'|'AGENT'
                                try {
                                  await authService.adminUpdateUser(u.id, { role })
                                  setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, role } : x))
                                  toast.success('تم تحديث الصلاحية')
                                } catch (e: any) {
                                  toast.error('حدث خطأ أثناء التحديث')
                                }
                              }}
                            >
                              <option value="AGENT">موظف عادي</option>
                              <option value="MANAGER">موظف مساعد</option>
                              <option value="ADMIN">موظف إداري</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {u.active ? 'مفعل' : 'معطل'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                className="btn-outline text-xs p-2 hover:bg-blue-50 hover:text-blue-600"
                                onClick={() => handleEdit(u)}
                                title="تعديل"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button
                                className="btn-outline text-xs p-2 hover:bg-gray-50 hover:text-gray-700"
                                onClick={async () => {
                                  const active = !u.active
                                  try {
                                    await authService.adminUpdateUser(u.id, { active })
                                    setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, active } : x))
                                    toast.success(`تم ${active ? 'تفعيل' : 'تعطيل'} الحساب`)
                                  } catch (e: any) {
                                    toast.error('حدث خطأ أثناء التحديث')
                                  }
                                }}
                                title={u.active ? 'تعطيل' : 'تفعيل'}
                              >
                                {u.active ? '🔒' : '🔓'}
                              </button>
                              <button
                                className="btn-outline text-xs p-2 hover:bg-red-50 hover:text-red-600 text-red-600"
                                onClick={() => handleDelete(u.id, u.name)}
                                title="حذف"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Edit Modal */}
          {isEditing && editingUser && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">تعديل بيانات الموظف</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">الاسم</label>
                      <input
                        className="input w-full"
                        value={editingUser.name}
                        disabled
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">الجوال</label>
                      <input
                        className="input w-full"
                        value={editingUser.phone || '-'}
                        disabled
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">الصلاحية</label>
                      <select
                        className="input w-full"
                        value={editingUser.role}
                        onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                      >
                        <option value="AGENT">موظف عادي</option>
                        <option value="MANAGER">موظف مساعد</option>
                        <option value="ADMIN">موظف إداري</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">الحالة</label>
                      <select
                        className="input w-full"
                        value={editingUser.active ? 'true' : 'false'}
                        onChange={(e) => setEditingUser({ ...editingUser, active: e.target.value === 'true' })}
                      >
                        <option value="true">مفعل</option>
                        <option value="false">معطل</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button
                      className="btn-primary flex-1"
                      onClick={handleSaveEdit}
                    >
                      حفظ التغييرات
                    </button>
                    <button
                      className="btn-outline flex-1"
                      onClick={() => {
                        setIsEditing(false)
                        setEditingUser(null)
                      }}
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
