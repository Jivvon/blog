'use client'

import { useCallback } from 'react'
import AwesomeCV from '@/components/resume/AwesomeCV'
import { ResumeData } from '@/components/resume/types'

export default function ResumeClient({ data }: { data: ResumeData }) {
  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  return (
    <>
      <div className="acv-download-btn mb-4 flex justify-center gap-3 print:hidden">
        <a
          href="/resume.pdf"
          download={`${data.personal.firstName}_${data.personal.lastName}_Resume.pdf`}
          className="inline-flex items-center rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
        >
          Download PDF
        </a>
        <button
          onClick={handlePrint}
          className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Print
        </button>
      </div>
      <div className="acv-resume-wrapper">
        <AwesomeCV data={data} />
      </div>
    </>
  )
}
