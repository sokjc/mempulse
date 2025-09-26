'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Survey, Question } from '@prisma/client'
import { surveySubmissionSchema, type SurveySubmission } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent } from '@/components/ui/card'

interface SurveyFormProps {
  survey: Survey & { questions: Question[] }
}

export default function SurveyForm({ survey }: SurveyFormProps) {
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<SurveySubmission>({
    resolver: zodResolver(surveySubmissionSchema),
    defaultValues: {
      surveySlug: survey.slug,
      answers: {},
      consent: false
    }
  })

  const consent = watch('consent')

  const onSubmit = async (data: SurveySubmission) => {
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (response.ok) {
        setIsSubmitted(true)
      } else {
        const error = await response.json()
        alert(error.message || 'Something went wrong')
      }
    } catch (error) {
      alert('Failed to submit survey')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">Thank You!</h2>
            <p className="text-zinc-400">Your response has been recorded.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {survey.questions.map((question) => (
        <Card key={question.id} className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <Label className="text-base font-medium">
                {question.text}
              </Label>

              {question.type === 'single' && question.options && (
                <RadioGroup
                  onValueChange={(value) => setValue(`answers.${question.slug}`, value)}
                  className="space-y-2"
                >
                  {(question.options as string[]).map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <RadioGroupItem
                        value={option}
                        id={`${question.slug}-${option}`}
                        className="border-zinc-600 text-zinc-100"
                      />
                      <Label
                        htmlFor={`${question.slug}-${option}`}
                        className="cursor-pointer text-sm"
                      >
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name (optional)</Label>
              <Input
                id="name"
                {...register('respondentName')}
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
                placeholder="Your name"
              />
            </div>

            <div>
              <Label htmlFor="email">Email (optional)</Label>
              <Input
                id="email"
                type="email"
                {...register('respondentEmail')}
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
                placeholder="your@email.com"
              />
              {errors.respondentEmail && (
                <p className="text-red-500 text-sm mt-1">{errors.respondentEmail.message}</p>
              )}
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="consent"
                checked={consent}
                onCheckedChange={(checked) => setValue('consent', checked as boolean)}
                className="border-zinc-600 data-[state=checked]:bg-zinc-100 data-[state=checked]:text-zinc-900 mt-1"
              />
              <Label htmlFor="consent" className="text-sm text-zinc-300 cursor-pointer">
                I consent to the collection and use of my responses and optional personal information
                for research and analysis purposes. Data will be handled securely and in accordance
                with privacy regulations.
              </Label>
            </div>
            {errors.consent && (
              <p className="text-red-500 text-sm">{errors.consent.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {errors.answers && (
        <p className="text-red-500 text-sm">{errors.answers.message}</p>
      )}

      <div className="sticky bottom-0 bg-zinc-950 py-4 border-t border-zinc-800">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-12 text-base font-medium bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Survey'}
        </Button>
      </div>
    </form>
  )
}