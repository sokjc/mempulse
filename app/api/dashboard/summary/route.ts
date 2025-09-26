import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  // Check authentication
  const session = await auth()
  if (!session) {
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
      include: {
        questions: { orderBy: { order: 'asc' } }
      }
    })

    if (!survey) {
      return NextResponse.json({ message: 'Survey not found' }, { status: 404 })
    }

    // Get date ranges
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

    // Try to get data from DailySummary first
    const summaries = await prisma.dailySummary.findMany({
      where: {
        surveyId: survey.id,
        date: { gte: ninetyDaysAgo }
      },
      orderBy: { date: 'asc' }
    })

    // If we have summaries, use them
    if (summaries.length > 0) {
      const result = survey.questions.map(question => {
        const questionSummaries = summaries.filter(s => s.questionId === question.id)
        const last30Days = questionSummaries.filter(s => s.date >= thirtyDaysAgo)
        const last90Days = questionSummaries

        const aggregateData = (sums: typeof summaries) => {
          const counts: Record<string, number> = {}
          let total = 0

          sums.forEach(summary => {
            const data = summary.data as any
            if (data.counts) {
              Object.entries(data.counts).forEach(([option, count]) => {
                counts[option] = (counts[option] || 0) + (count as number)
                total += count as number
              })
            }
          })

          return { counts, total }
        }

        const thirtyDayData = aggregateData(last30Days)
        const ninetyDayData = aggregateData(last90Days)

        const timeseries = questionSummaries.map(s => ({
          date: s.date.toISOString().split('T')[0],
          data: s.data
        }))

        return {
          questionId: question.id,
          questionSlug: question.slug,
          questionText: question.text,
          thirtyDay: thirtyDayData,
          ninetyDay: ninetyDayData,
          timeseries
        }
      })

      return NextResponse.json({
        survey: { id: survey.id, slug: survey.slug, title: survey.title },
        data: result,
        lastUpdated: new Date().toISOString()
      })
    }

    // Otherwise, compute from raw responses
    const responses = await prisma.response.findMany({
      where: {
        surveyId: survey.id,
        createdAt: { gte: ninetyDaysAgo }
      },
      include: { answers: true }
    })

    const result = survey.questions.map(question => {
      const questionAnswers = responses.flatMap(r =>
        r.answers.filter(a => a.questionId === question.id)
      )

      const computeCounts = (answers: typeof questionAnswers) => {
        const counts: Record<string, number> = {}
        answers.forEach(answer => {
          counts[answer.value] = (counts[answer.value] || 0) + 1
        })
        return { counts, total: answers.length }
      }

      const last30Answers = questionAnswers.filter(a =>
        responses.find(r => r.id === a.responseId)!.createdAt >= thirtyDaysAgo
      )

      const thirtyDayData = computeCounts(last30Answers)
      const ninetyDayData = computeCounts(questionAnswers)

      // Group by day for timeseries
      const dailyGroups: Record<string, typeof questionAnswers> = {}
      questionAnswers.forEach(answer => {
        const response = responses.find(r => r.id === answer.responseId)!
        const date = response.createdAt.toISOString().split('T')[0]
        if (!dailyGroups[date]) dailyGroups[date] = []
        dailyGroups[date].push(answer)
      })

      const timeseries = Object.entries(dailyGroups)
        .map(([date, answers]) => ({
          date,
          data: computeCounts(answers)
        }))
        .sort((a, b) => a.date.localeCompare(b.date))

      return {
        questionId: question.id,
        questionSlug: question.slug,
        questionText: question.text,
        thirtyDay: thirtyDayData,
        ninetyDay: ninetyDayData,
        timeseries
      }
    })

    return NextResponse.json({
      survey: { id: survey.id, slug: survey.slug, title: survey.title },
      data: result,
      lastUpdated: new Date().toISOString()
    })
  } catch (error) {
    console.error('Dashboard summary error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}