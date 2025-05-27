'use client'

import { ReactNode } from 'react'
import type { Resume } from 'contentlayer/generated'
import SocialIcon from '@/components/social-icons'
import Image from '@/components/Image'

interface Props {
  children: ReactNode
  content: Omit<Resume, '_id' | '_raw' | 'body'>
}

export default function ResumeLayout({ children, content }: Props) {
  const { name, avatar, occupation, company, email, twitter, bluesky, linkedin, github } = content

  return (
    <>
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {/* <div className="space-y-2 pt-6 pb-8 md:space-y-5">
          <h1 className="text-3xl leading-9 font-extrabold tracking-tight text-gray-900 sm:text-4xl sm:leading-10 md:text-6xl md:leading-14 dark:text-gray-100">
            Resume
          </h1>
        </div> */}
        <div className="space-y-6">
          <div className="flex flex-col items-center pt-8">
            {avatar && (
              <Image
                src={avatar}
                alt="avatar"
                width={192}
                height={192}
                className="h-48 w-48 rounded-full"
              />
            )}
            <h1 className="pt-4 pb-2 text-4xl leading-8 font-bold tracking-tight">{name}</h1>
            <div className="text-gray-500 dark:text-gray-400">{occupation}</div>
            <div className="text-gray-500 dark:text-gray-400">{company}</div>
            <div className="flex space-x-3 pt-6">
              <SocialIcon kind="mail" href={`mailto:${email}`} />
              <SocialIcon kind="github" href={github} />
              <SocialIcon kind="linkedin" href={linkedin} />
              <SocialIcon kind="x" href={twitter} />
              <SocialIcon kind="bluesky" href={bluesky} />
            </div>
          </div>
          <div className="prose resume-content dark:prose-invert max-w-none pt-2 pb-8">
            {children}
          </div>
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

        :global(.dark) .prose.resume-content h1 {
          border-bottom-color: #4b5563;
        }
      `}</style>
    </>
  )
}
