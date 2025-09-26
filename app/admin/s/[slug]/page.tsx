import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { notFound } from "next/navigation"
import { unstable_cache } from "next/cache"
import DashboardCharts from "./dashboard-charts"

const getSurveyData = unstable_cache(
  async (slug: string) => {
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/dashboard/summary?s=${slug}`, {
      headers: {
        'Cookie': '' // Auth is handled by middleware
      }
    })

    if (!response.ok) {
      if (response.status === 404) return null
      throw new Error('Failed to fetch survey data')
    }

    return response.json()
  },
  ['dashboard'],
  {
    revalidate: 60, // Cache for 1 minute
    tags: ['dashboard']
  }
)

export async function generateStaticParams() {
  return [{ slug: 'mempulse-1' }]
}

export default async function SurveyDashboard({ params }: { params: { slug: string } }) {
  const session = await auth()

  if (!session) {
    redirect("/auth/signin")
  }

  const data = await getSurveyData(params.slug)

  if (!data) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{data.survey.title}</h1>
          <p className="text-sm text-muted-foreground">
            Updated {new Date(data.lastUpdated).toLocaleString()}
          </p>
        </div>

        <DashboardCharts data={data} />
      </div>
    </div>
  )
}