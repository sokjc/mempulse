import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { revalidateTag } from 'next/cache'

export async function POST(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`

  if (authHeader !== expectedToken) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = req.nextUrl.searchParams
  const surveySlug = searchParams.get('s')

  if (!surveySlug) {
    return NextResponse.json(
      { message: 'Survey slug parameter required' },
      { status: 400 }
    )
  }

  try {
    // Get survey with questions
    const survey = await prisma.survey.findUnique({
      where: { slug: surveySlug },
      include: { questions: true }
    })

    if (!survey) {
      return NextResponse.json({ message: 'Survey not found' }, { status: 404 })
    }

    // Get responses for last 120 days
    const cutoffDate = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000)

    const responses = await prisma.response.findMany({
      where: {
        surveyId: survey.id,
        createdAt: { gte: cutoffDate }
      },
      include: { answers: true }
    })

    // Group responses by date and question
    const dailyData: Record<string, Record<string, any[]>> = {}

    responses.forEach(response => {
      const dateKey = response.createdAt.toISOString().split('T')[0]
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = {}
      }

      response.answers.forEach(answer => {
        if (!dailyData[dateKey][answer.questionId]) {
          dailyData[dateKey][answer.questionId] = []
        }
        dailyData[dateKey][answer.questionId].push(answer.value)
      })
    })

    // Create or update DailySummary records
    const summaryPromises: Promise<any>[] = []

    for (const [dateStr, questions] of Object.entries(dailyData)) {
      const date = new Date(dateStr)

      for (const [questionId, values] of Object.entries(questions)) {
        // Calculate counts
        const counts: Record<string, number> = {}
        values.forEach(value => {
          counts[value] = (counts[value] || 0) + 1
        })

        const data = {
          counts,
          total: values.length,
          // For yes/no questions, calculate percentage
          mean: ['Yes', 'No'].every(opt => opt in counts)
            ? counts['Yes'] / values.length
            : undefined
        }

        summaryPromises.push(
          prisma.dailySummary.upsert({
            where: {
              surveyId_questionId_date: {
                surveyId: survey.id,
                questionId,
                date
              }
            },
            update: { data },
            create: {
              surveyId: survey.id,
              questionId,
              date,
              data
            }
          })
        )
      }
    }

    await Promise.all(summaryPromises)

    // Clean up old summaries (older than 120 days)
    await prisma.dailySummary.deleteMany({
      where: {
        surveyId: survey.id,
        date: { lt: cutoffDate }
      }
    })

    // Trigger revalidation
    revalidateTag(`dashboard:${surveySlug}`)

    return NextResponse.json({
      ok: true,
      message: `Rollup completed for ${surveySlug}`,
      daysProcessed: Object.keys(dailyData).length
    })
  } catch (error) {
    console.error('Rollup error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}