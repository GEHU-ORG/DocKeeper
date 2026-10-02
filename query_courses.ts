import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const courses = await prisma.course.findMany()
  console.log(courses)
}
main().catch(console.error).finally(() => prisma.$disconnect())
