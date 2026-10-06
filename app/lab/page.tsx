import Link from 'next/link'
import { notFound } from 'next/navigation'
import { allBlogs } from 'contentlayer/generated'
import { isPrivate } from '../../lib/profile'

export const metadata = { title: '개발 공간', robots: { index: false, follow: false } }

export default function Lab() {
  if (!isPrivate) notFound()
  const drafts = allBlogs.filter((post) => post.draft)
  return (
    <div className="space-y-8 py-6">
      <div className="space-y-3">
        <h1 className="text-4xl font-extrabold">개발 공간</h1>
        <p className="text-gray-500">작성 중인 글과 새로운 블로그 기능을 시험하는 공간입니다.</p>
      </div>
      <section className="rounded-xl border border-gray-200 p-6 dark:border-gray-700">
        <h2 className="text-2xl font-semibold">초안 미리보기</h2>
        {drafts.length ? (
          <ul className="mt-4 space-y-3">
            {drafts.map((post) => (
              <li key={post.slug}>
                <Link href={`/lab/drafts/${post.slug}`} className="text-primary-600">
                  {post.title} →
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-gray-500">작성 중인 초안이 없습니다.</p>
        )}
      </section>
      <section className="rounded-xl border border-gray-200 p-6 dark:border-gray-700">
        <h2 className="text-2xl font-semibold">아카이브 서재</h2>
        <p className="mt-3 text-gray-500">수집한 글을 검색하고 읽어보세요.</p>
        <Link href="/library" className="text-primary-600 mt-4 inline-block">
          서재 열기 →
        </Link>
      </section>
    </div>
  )
}
