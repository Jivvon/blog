'use client'

import React, { useEffect, useRef, useState } from 'react'
import { allCareers } from 'contentlayer/generated'
import { MDXLayoutRenderer } from 'pliny/mdx-components'
import { coreContent } from 'pliny/utils/contentlayer'

function Mermaid({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('mermaid').then(async (m) => {
        m.default.initialize({ startOnLoad: false, theme: 'default' })
        try {
          const id = `mermaid-${Math.random().toString(36).substring(7)}`
          // Mermaid parses actual <br> elements poorly if passed from React stringification,
          // so ensure the string uses explicit newlines or literal <br/> string
          // We will render it using mermaid API
          const { svg } = await m.default.render(id, chart)
          if (ref.current) {
            ref.current.innerHTML = svg
          }
        } catch (e) {
          console.error('Mermaid render error', e)
        }
      })
    }
  }, [chart])

  return <div ref={ref} className="my-8 flex justify-center text-black dark:text-white" />
}

const mdxComponents = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pre: (props: any) => {
    // Find if the inner code block is a mermaid block
    const isMermaid = props.children?.props?.className?.includes('language-mermaid')

    if (isMermaid) {
      // Extract the raw string from props.children.props.children
      // Sometimes it's a single string, sometimes an array
      const codeChild = props.children.props.children
      let chartString = ''

      if (typeof codeChild === 'string') {
        chartString = codeChild
      } else if (Array.isArray(codeChild)) {
        chartString = codeChild
          .map((c: unknown) =>
            typeof c === 'string'
              ? c
              : (c as Record<string, unknown>)?.props
                ? ((c as Record<string, Record<string, unknown>>).props.children as string) || ''
                : ''
          )
          .join('')
      } else if (codeChild?.props?.children) {
        chartString = codeChild.props.children
      }

      return <Mermaid chart={chartString} />
    }

    // Otherwise fallback to default pre
    return <pre {...props} />
  },
}

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
          <MDXLayoutRenderer code={career.body.code} components={mdxComponents} />
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
