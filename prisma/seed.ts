import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create the mempulse-1 survey
  const survey = await prisma.survey.upsert({
    where: { slug: 'mempulse-1' },
    update: {},
    create: {
      slug: 'mempulse-1',
      title: 'Memphis Pulse Survey',
      description: 'Quick pulse check on how Memphians feel about their city and life',
      isActive: true,
      questions: {
        create: [
          {
            slug: 'stay-memphis',
            text: 'If you could move today, would you stay in Memphis?',
            type: 'single',
            order: 1,
            options: ['Yes', 'No']
          },
          {
            slug: 'stay-us',
            text: 'If you could move today, would you stay in the U.S.?',
            type: 'single',
            order: 2,
            options: ['Yes', 'No']
          },
          {
            slug: 'like-job',
            text: 'Do you like your job?',
            type: 'single',
            order: 3,
            options: ['Yes', 'No']
          },
          {
            slug: 'work-mode',
            text: 'Would you change whether you work from home or from the office?',
            type: 'single',
            order: 4,
            options: ['Keep as-is', 'Switch to WFH', 'Switch to Office', 'Hybrid', 'Not sure']
          }
        ]
      }
    }
  })

  console.log({ survey })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })