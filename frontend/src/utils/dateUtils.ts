/**
 * حساب الوقت النسبي بالعربية
 * مثال: "منذ 5 دقائق"، "منذ ساعتين"، "منذ 3 أيام"
 */
export function getRelativeTime(date: string | Date): string {
  const now = new Date()
  const past = new Date(date)
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return 'منذ لحظات'
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    if (diffInMinutes === 1) return 'منذ دقيقة'
    if (diffInMinutes === 2) return 'منذ دقيقتين'
    if (diffInMinutes <= 10) return `منذ ${diffInMinutes} دقائق`
    return `منذ ${diffInMinutes} دقيقة`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    if (diffInHours === 1) return 'منذ ساعة'
    if (diffInHours === 2) return 'منذ ساعتين'
    if (diffInHours <= 10) return `منذ ${diffInHours} ساعات`
    return `منذ ${diffInHours} ساعة`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 30) {
    if (diffInDays === 1) return 'منذ يوم'
    if (diffInDays === 2) return 'منذ يومين'
    if (diffInDays <= 10) return `منذ ${diffInDays} أيام`
    return `منذ ${diffInDays} يوم`
  }

  const diffInMonths = Math.floor(diffInDays / 30)
  if (diffInMonths < 12) {
    if (diffInMonths === 1) return 'منذ شهر'
    if (diffInMonths === 2) return 'منذ شهرين'
    if (diffInMonths <= 10) return `منذ ${diffInMonths} أشهر`
    return `منذ ${diffInMonths} شهر`
  }

  const diffInYears = Math.floor(diffInMonths / 12)
  if (diffInYears === 1) return 'منذ سنة'
  if (diffInYears === 2) return 'منذ سنتين'
  return `منذ ${diffInYears} سنوات`
}

/**
 * تنسيق التاريخ والوقت بالعربية - التقويم الميلادي
 */
export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    calendar: 'gregory', // استخدام التقويم الميلادي
  })
}

/**
 * تنسيق التاريخ فقط بالعربية - التقويم الميلادي
 */
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    calendar: 'gregory', // استخدام التقويم الميلادي
  })
}

