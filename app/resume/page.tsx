import { Resume, allResumes } from 'contentlayer/generated'
import { MDXLayoutRenderer } from 'pliny/mdx-components'
import ResumeLayout from '@/layouts/ResumeLayout' // FIXME
import { coreContent } from 'pliny/utils/contentlayer'
import { genPageMetadata } from 'app/seo'
import { notFound } from 'next/navigation'
import { isPrivate } from '../../lib/profile'

export const metadata = genPageMetadata({ title: 'Resume' })

export default function Page() {
  if (!isPrivate) notFound()
  const resume = allResumes.find((p) => p.slug === 'main') as Resume
  const mainContent = coreContent(resume)

  return (
    <>
      <ResumeLayout content={mainContent}>
        <MDXLayoutRenderer code={resume.body.code} />
      </ResumeLayout>
    </>
  )
}
