import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'
import { genPageMetadata } from 'app/seo'
import { ResumeData } from '@/components/resume/types'
import ResumeClient from './ResumeClient'

export const metadata = genPageMetadata({ title: 'Resume' })

function loadResumeData(): ResumeData {
  const filePath = path.join(process.cwd(), 'data', 'resume.yaml')
  const fileContents = fs.readFileSync(filePath, 'utf8')
  return yaml.load(fileContents) as ResumeData
}

export default function ResumePage() {
  const data = loadResumeData()

  return <ResumeClient data={data} />
}
