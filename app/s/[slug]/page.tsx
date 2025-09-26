import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import SurveyForm from "./survey-form"

export default async function SurveyPage({ params }: { params: { slug: string } }) {
  const survey = await prisma.survey.findUnique({
    where: {
      slug: params.slug,
      isActive: true
    },
    include: {
      questions: {
        orderBy: { order: 'asc' }
      }
    }
  })

  if (!survey) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{survey.title}</h1>
          {survey.description && (
            <p className="text-zinc-400">{survey.description}</p>
          )}
        </div>

        <SurveyForm survey={survey} />
      </div>
    </div>
  )
}