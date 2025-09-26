import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { surveySubmissionSchema } from '@/lib/validations'
import { rateLimit } from '@/lib/rate-limit'
import { revalidateTag } from 'next/cache'

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ||
               req.headers.get('x-real-ip') ||
               'unknown'

    const { success, remaining } = rateLimit(ip, 10, 60000)

    if (!success) {
      return NextResponse.json(
        { message: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: { 'X-RateLimit-Remaining': remaining.toString() }
        }
      )
    }

    // Parse and validate request body
    const body = await req.json()
    const validation = surveySubmissionSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { message: 'Invalid submission', errors: validation.error.flatten() },
        { status: 400 }
      )
    }

    const data = validation.data

    // Verify survey exists and is active
    const survey = await prisma.survey.findUnique({
      where: { slug: data.surveySlug, isActive: true },
      include: { questions: true }
    })

    if (!survey) {
      return NextResponse.json(
        { message: 'Survey not found or inactive' },
        { status: 404 }
      )
    }

    // Create response and answers in transaction
    const response = await prisma.$transaction(async (tx) => {
      // Create the response
      const newResponse = await tx.response.create({
        data: {
          surveyId: survey.id,
          respondentName: data.respondentName || null,
          respondentEmail: data.respondentEmail || null,
          ipAddress: ip,
          userAgent: req.headers.get('user-agent') || null
        }
      })

      // Create answers for each question
      const answerPromises = survey.questions.map((question) => {
        const answer = data.answers[question.slug]
        if (answer) {
          return tx.answer.create({
            data: {
              responseId: newResponse.id,
              questionId: question.id,
              value: answer
            }
          })
        }
        return null
      })

      await Promise.all(answerPromises.filter(Boolean))

      return newResponse
    })

    // Trigger revalidation for the dashboard
    revalidateTag(`dashboard:${data.surveySlug}`)

    return NextResponse.json(
      { ok: true, responseId: response.id },
      {
        status: 200,
        headers: { 'X-RateLimit-Remaining': remaining.toString() }
      }
    )
  } catch (error) {
    console.error('Survey submission error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}