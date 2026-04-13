'use client'

import { allCareers } from 'contentlayer/generated'
import { MDXLayoutRenderer } from 'pliny/mdx-components'
import { coreContent } from 'pliny/utils/contentlayer'

export default function CareerPage() {
  const career = allCareers.find((p) => p.slug === 'default')

  if (!career) {
    return <div className="mt-24 text-center">No career document found.</div>
  }

  const mainContent = coreContent(career)

  return (
    <>
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        <div className="space-y-4 pt-6 pb-8 md:space-y-5">
          <h1 className="text-3xl leading-9 font-extrabold tracking-tight text-gray-900 sm:text-4xl sm:leading-10 md:text-6xl md:leading-14 dark:text-gray-100">
            Career
          </h1>
          <p className="text-lg leading-7 text-gray-500 dark:text-gray-400">
            <a
              href="/career.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-500 hover:text-primary-600 dark:hover:text-primary-400 decoration-primary-500 underline underline-offset-4"
            >
              📄 경력기술서 PDF 다운로드
            </a>
          </p>
        </div>
        <div className="prose resume-content dark:prose-invert max-w-none pt-8 pb-8">
          <MDXLayoutRenderer code={career.body.code} />
        </div>
      </div>

      <style jsx global>{`
        .prose.resume-content h2 {
          border-bottom: 2.5px solid #d1d5db;
          font-weight: 900;
          padding-bottom: 0.5rem;
          margin-top: 3rem;
          margin-bottom: 1rem;
        }

        .prose.resume-content h3 {
          font-weight: 700;
        }

        /* 불렛 포인트 간격 조정 */
        .prose.resume-content ul li {
          margin-top: 0.25rem;
          margin-bottom: 0.25rem;
        }

        .prose.resume-content ol li {
          margin-top: 0.25rem;
          margin-bottom: 0.25rem;
        }

        /* 중첩된 리스트의 간격도 조정 */
        .prose.resume-content ul li ul li,
        .prose.resume-content ol li ol li {
          margin-top: 0.125rem;
          margin-bottom: 0.125rem;
        }

        :global(.dark) .prose.resume-content h1,
        :global(.dark) .prose.resume-content h2 {
          border-bottom-color: #4b5563;
        }
      `}</style>
    </>
  )
}
