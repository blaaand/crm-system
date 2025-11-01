import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useMutation } from 'react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { clientsService } from '../services/clientsService'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

const clientSchema = z.object({
  name: z.string().min(2, 'الاسم يجب أن يكون حرفين على الأقل'),
  phonePrimary: z.string().min(10, 'رقم الهاتف غير صحيح'),
  city: z.string().optional(),
  notes: z.string().optional(),
})

type ClientForm = z.infer<typeof clientSchema>

export default function NewClient() {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClientForm>({
    resolver: zodResolver(clientSchema),
  })

  const createClientMutation = useMutation(
    (data: ClientForm) => clientsService.createClient(data),
    {
      onSuccess: (client) => {
        toast.success('تم إضافة العميل بنجاح')
        navigate(`/clients/${client.id}`)
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'حدث خطأ أثناء إضافة العميل')
      },
      onSettled: () => {
        setIsSubmitting(false)
      },
    }
  )

  const onSubmit = (data: ClientForm) => {
    setIsSubmitting(true)
    createClientMutation.mutate(data)
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          to="/clients"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="h-4 w-4 ml-1" />
          العودة للعملاء
        </Link>
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="card">
          <div className="card-header">
            <h1 className="text-xl font-bold text-gray-900">إضافة عميل جديد</h1>
          </div>
          <div className="card-body">
            <form 
              onSubmit={handleSubmit(onSubmit)} 
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'BUTTON') {
                  e.preventDefault()
                }
              }}
              className="space-y-6"
            >
              {/* الاسم */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  الاسم <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('name')}
                  type="text"
                  className="input"
                  placeholder="أدخل اسم العميل"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                    }
                  }}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              {/* رقم الجوال */}
              <div>
                <label htmlFor="phonePrimary" className="block text-sm font-medium text-gray-700 mb-2">
                  رقم الجوال (يجب أن لا يتكرر) <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('phonePrimary')}
                  type="tel"
                  className="input"
                  placeholder="05xxxxxxxx"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                    }
                  }}
                />
                {errors.phonePrimary && (
                  <p className="mt-1 text-sm text-red-600">{errors.phonePrimary.message}</p>
                )}
              </div>

              {/* المدينة */}
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                  المدينة
                </label>
                <input
                  {...register('city')}
                  type="text"
                  className="input"
                  placeholder="الرياض، جدة، الدمام..."
                />
                {errors.city && (
                  <p className="mt-1 text-sm text-red-600">{errors.city.message}</p>
                )}
              </div>

              {/* الملاحظات */}
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                  ملاحظة
                </label>
                <textarea
                  {...register('notes')}
                  rows={3}
                  className="input"
                  placeholder="أي ملاحظات إضافية..."
                />
                {errors.notes && (
                  <p className="mt-1 text-sm text-red-600">{errors.notes.message}</p>
                )}
              </div>

              {/* الأزرار */}
              <div className="flex justify-end gap-3">
                <Link
                  to="/clients"
                  className="btn-outline"
                >
                  إلغاء
                </Link>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'جاري الإضافة...' : 'إضافة العميل'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

