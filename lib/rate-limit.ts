const requestCounts = new Map<string, { count: number; resetTime: number }>()

export function rateLimit(
  ip: string,
  limit: number = 10,
  windowMs: number = 60000
): { success: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const record = requestCounts.get(ip)

  if (!record || now > record.resetTime) {
    const resetTime = now + windowMs
    requestCounts.set(ip, { count: 1, resetTime })
    return { success: true, remaining: limit - 1, resetTime }
  }

  if (record.count >= limit) {
    return { success: false, remaining: 0, resetTime: record.resetTime }
  }

  record.count++
  return { success: true, remaining: limit - record.count, resetTime: record.resetTime }
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [ip, record] of requestCounts.entries()) {
    if (now > record.resetTime + 60000) {
      requestCounts.delete(ip)
    }
  }
}, 60000)