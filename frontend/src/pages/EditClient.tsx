import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from 'react-query'
import { useNavigate, useParams, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { clientsService } from '../services/clientsService'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

const clientSchema = z.object({
  name: z.string().min(2, 'الاسم يجب أن يكون حرفين على الأقل'),
  phonePrimary: z.string().min(10, 'رقم الهاتف غير صحيح'),
  city: z.string().optional(),
  notes: z.string().optional(),
})

type ClientForm = z.infer<typeof clientSchema>

export default function EditClient() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: client, isLoading } = useQuery(
    ['client', id],
    () => clientsService.getClient(id!),
    { enabled: !!id }
  )

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ClientForm>({
    resolver: zodResolver(clientSchema),
  })

  useEffect(() => {
    if (client) {
      reset({
        name: client.name,
        phonePrimary: client.phonePrimary,
        city: client.city || '',
        notes: client.notes || '',
      })
    }
  }, [client, reset])

  const updateClientMutation = useMutation(
    (data: ClientForm) => clientsService.updateClient(id!, data),
    {
      onSuccess: () => {
        toast.success('تم تحديث بيانات العميل بنجاح')
        navigate(`/clients/${id}`)
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.message || 'حدث خطأ أثناء تحديث بيانات العميل')
      },
    }
  )

  const onSubmit = (data: ClientForm) => {
    if (!id) return
    updateClientMutation.mutate(data)
  }

  if (isLoading || !client) {
    return <div className="text-center py-8">جاري التحميل...</div>
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <Link
          to={`/clients/${id}`}
          className="btn-outline inline-flex items-center text-sm"
        >
          <ArrowLeftIcon className="h-4 w-4 ml-1" />
          العودة لتفاصيل العميل
        </Link>
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="card">
          <div className="card-header">
            <h1 className="text-xl font-bold text-gray-900">تعديل بيانات العميل</h1>
            <p className="mt-1 text-sm text-gray-600">{client.name}</p>
          </div>
          <div className="card-body">
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-6"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الاسم <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('name')}
                  type="text"
                  className="input"
                  placeholder="أدخل اسم العميل"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  رقم الجوال (يجب أن لا يتكرر) <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('phonePrimary')}
                  type="tel"
                  className="input"
                  placeholder="05xxxxxxxx"
                />
                {errors.phonePrimary && (
                  <p className="mt-1 text-sm text-red-600">{errors.phonePrimary.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  المدينة
                </label>
                <input
                  {...register('city')}
                  type="text"
                  className="input"
                  placeholder="الرياض، جدة، الدمام..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ملاحظة
                </label>
                <textarea
                  {...register('notes')}
                  rows={3}
                  className="input"
                  placeholder="أي ملاحظات إضافية..."
                />
              </div>

              <div className="flex justify-end gap-3">
                <Link
                  to={`/clients/${id}`}
                  className="btn-outline"
                >
                  إلغاء
                </Link>
                <button
                  type="submit"
                  disabled={isSubmitting || updateClientMutation.isLoading}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting || updateClientMutation.isLoading
                    ? 'جاري الحفظ...'
                    : 'حفظ التعديلات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}


