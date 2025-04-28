'use client'

import { KBarSearchProvider } from 'pliny/search/KBar'
import { useRouter } from 'next/navigation'
import { CoreContent } from 'pliny/utils/contentlayer'
import { Blog } from 'contentlayer/generated'
import siteMetadata from '@/data/siteMetadata'

export const SearchProvider = ({ children }) => {
  const router = useRouter()
  const searchPath =
    siteMetadata.search?.provider === 'kbar'
      ? siteMetadata.search?.kbarConfig?.searchDocumentsPath
      : 'search.json'

  return (
    <KBarSearchProvider
      kbarConfig={{
        searchDocumentsPath: searchPath,
        defaultActions: [
          // {
          //   id: 'homepage',
          //   name: 'Homepage',
          //   keywords: '',
          //   shortcut: ['h', 'h'],
          //   section: 'Home',
          //   perform: () => router.push('/'),
          // },
          // {
          //   id: 'projects',
          //   name: 'Projects',
          //   keywords: '',
          //   shortcut: ['p'],
          //   section: 'Home',
          //   perform: () => router.push('/projects'),
          // },
        ],
        onSearchDocumentsLoad(json) {
          return json.map((post: CoreContent<Blog>) => {
            // externalUrl이 있으면 해당 링크로 이동
            return {
              id: post.path,
              name: post.title + (post.externalUrl ? ' ↗' : ''),
              keywords: post?.summary || '',
              section: 'Blog',
              subtitle: post.tags?.join(', ') || '',
              perform: () => {
                if (post.externalUrl) {
                  window.open(post.externalUrl, '_blank', 'noopener,noreferrer')
                } else {
                  router.push('/' + post.path)
                }
              },
            }
          })
        },
      }}
    >
      {children}
    </KBarSearchProvider>
  )
}

export default SearchProvider
