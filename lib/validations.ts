import { z } from 'zod'

export const surveySubmissionSchema = z.object({
  surveySlug: z.string().min(1),
  respondentName: z.string().optional(),
  respondentEmail: z.string().email().optional().or(z.literal('')),
  consent: z.boolean().refine(val => val === true, {
    message: "You must consent to data collection"
  }),
  answers: z.record(z.string(), z.string()).refine(
    (answers) => Object.keys(answers).length > 0,
    { message: "At least one answer is required" }
  )
})

export type SurveySubmission = z.infer<typeof surveySubmissionSchema>