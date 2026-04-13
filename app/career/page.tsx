'use client'

import { useEffect } from 'react'
import { allCareers } from 'contentlayer/generated'
import { MDXLayoutRenderer } from 'pliny/mdx-components'
import { coreContent } from 'pliny/utils/contentlayer'

export default function CareerPage() {
  const career = allCareers.find((p) => p.slug === 'default')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('mermaid').then((m) => {
        m.default.initialize({ startOnLoad: false, theme: 'default' })
        const elements = document.querySelectorAll('.language-mermaid')
        let shouldRun = false
        elements.forEach((el) => {
          if (el.parentElement && el.parentElement.tagName === 'PRE') {
            el.parentElement.classList.add('mermaid')
            el.parentElement.textContent = el.textContent // remove <code> wrapping
            el.parentElement.style.textAlign = 'center'
            el.parentElement.style.backgroundColor = 'transparent'
            shouldRun = true
          }
        })
        if (shouldRun) {
          m.default.run()
        }
      })
    }
  }, [career])

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
          <div className="pt-4 pb-2">
            <a
              href="/career.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-primary-500 hover:bg-primary-600 focus-visible:outline-primary-500 inline-flex items-center rounded-lg px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <svg
                className="mr-2 h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z"
                  clipRule="evenodd"
                />
              </svg>
              경력기술서 PDF 다운로드
            </a>
          </div>
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
