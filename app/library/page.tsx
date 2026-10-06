import Link from 'next/link'
import { notFound } from 'next/navigation'
import { isPrivate } from '../../lib/profile'
import { readArchive } from '../../lib/archive'
import { searchPosts } from '../../lib/archive-format.mjs'

export const dynamic = 'force-dynamic'
export const metadata = { title: '서재', robots: { index: false, follow: false } }

export default async function Library({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; order?: string; page?: string }>
}) {
  if (!isPrivate) notFound()
  const params = await searchParams
  const query = typeof params.q === 'string' ? params.q.slice(0, 200) : ''
  const order = params.order === 'oldest' ? 'oldest' : 'newest'
  const index = await readArchive()
  const matches = searchPosts(index.posts, query, order)
  const totalPages = Math.max(1, Math.ceil(matches.length / 20))
  const page = Math.min(totalPages, Math.max(1, Number.parseInt(params.page || '1', 10) || 1))
  const pageHref = (number: number) =>
    `/library?${new URLSearchParams({ q: query, order, page: String(number) })}`
  return (
    <div className="space-y-8 py-6">
      <div className="space-y-3 border-b border-gray-200 pb-8 dark:border-gray-700">
        <p className="text-primary-600 dark:text-primary-400 text-sm font-medium">
          나만의 아카이브
        </p>
        <h1 className="text-4xl font-extrabold tracking-tight">서재</h1>
        <p className="text-gray-600 dark:text-gray-400">
          실리콘밸리 생존자의 무료 공개 글을 모아 읽는 공간입니다.
        </p>
        <p className="text-sm text-gray-500">
          {index.posts.length}개의 글
          {index.capturedAt
            ? ` · 마지막 수집 ${new Date(index.capturedAt).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })}`
            : ''}
        </p>
      </div>
      <form className="flex flex-wrap gap-3" action="/library" role="search">
        <label htmlFor="archive-search" className="sr-only">
          제목과 본문 검색
        </label>
        <input
          id="archive-search"
          name="q"
          defaultValue={query}
          placeholder="제목과 본문에서 찾기"
          maxLength={200}
          className="min-w-48 flex-1 rounded-lg border border-gray-300 bg-transparent px-4 py-3 dark:border-gray-700"
        />
        <label htmlFor="archive-order" className="sr-only">
          정렬
        </label>
        <select
          id="archive-order"
          name="order"
          defaultValue={order}
          className="rounded-lg border border-gray-300 bg-white px-3 dark:border-gray-700 dark:bg-gray-950"
        >
          <option value="newest">최신 글부터</option>
          <option value="oldest">오래된 글부터</option>
        </select>
        <button
          className="bg-primary-600 rounded-lg px-5 py-3 font-medium text-white"
          type="submit"
        >
          검색
        </button>
      </form>
      {index.posts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-8 dark:border-gray-700">
          <h2 className="text-xl font-semibold">아직 저장된 글이 없습니다</h2>
          <p className="mt-2 text-gray-500">
            글 수집이 완료되면 이곳에서 원문과 이미지를 함께 읽을 수 있습니다.
          </p>
          <a
            href={index.publication.baseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 mt-4 inline-block"
          >
            원문 사이트 방문하기 ↗
          </a>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500">
            {matches.length}개의 글{query ? ` · “${query}” 검색 결과` : ''}
          </p>
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {matches.slice((page - 1) * 20, page * 20).map((post) => (
              <li key={post.id} className="py-6">
                <p className="text-sm text-gray-500">
                  <time dateTime={post.publishedAt}>
                    {new Date(post.publishedAt).toLocaleDateString('ko-KR', {
                      timeZone: 'Asia/Seoul',
                    })}
                  </time>{' '}
                  · {post.author}
                </p>
                <h2 className="mt-2 text-2xl font-semibold">
                  <Link href={`/library/${post.id}`} className="hover:text-primary-600">
                    {post.title}
                  </Link>
                </h2>
                <p className="mt-3 line-clamp-3 text-gray-600 dark:text-gray-400">{post.excerpt}</p>
              </li>
            ))}
          </ul>
          <nav aria-label="서재 페이지" className="flex justify-between">
            {page > 1 ? <Link href={pageHref(page - 1)}>← 이전</Link> : <span />}
            <span className="text-gray-500">
              {page} / {totalPages}
            </span>
            {page < totalPages ? <Link href={pageHref(page + 1)}>다음 →</Link> : <span />}
          </nav>
        </>
      )}
    </div>
  )
}
