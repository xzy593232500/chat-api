/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { Construction } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PublicLayout } from '@/components/layout'
import { useStatus } from '@/hooks/use-status'
import { parseHeaderNavModulesFromStatus } from '@/lib/nav-modules'

function EmptyCustomPageState() {
  const { t } = useTranslation()

  return (
    <div className='flex min-h-[60vh] items-center justify-center p-8'>
      <div className='max-w-2xl space-y-4 text-center'>
        <div className='flex justify-center'>
          <Construction className='text-muted-foreground h-20 w-20' />
        </div>
        <h2 className='text-2xl font-bold'>{t('Custom Page')}</h2>
        <p className='text-muted-foreground'>
          {t('The administrator has not configured custom page content yet.')}
        </p>
      </div>
    </div>
  )
}

export function CustomPage() {
  const { t } = useTranslation()
  const { status } = useStatus()
  const modules = parseHeaderNavModulesFromStatus(
    status as Record<string, unknown> | null
  )
  const customPage = modules.customPage
  const title = customPage.title.trim() || t('Custom Page')
  const url = customPage.url.trim()
  const html = customPage.html.trim()

  if (!customPage.enabled) {
    return (
      <PublicLayout>
        <EmptyCustomPageState />
      </PublicLayout>
    )
  }

  if (!customPage.useHtml && url) {
    return (
      <PublicLayout showMainContainer={false}>
        <iframe
          src={url}
          className='h-[calc(100vh-3.5rem)] w-full border-0'
          title={title}
        />
      </PublicLayout>
    )
  }

  return (
    <PublicLayout>
      <div className='mx-auto max-w-6xl px-4 py-8'>
        <h1 className='mb-6 text-3xl font-bold'>{title}</h1>
        {html ? (
          <div
            className='prose prose-neutral dark:prose-invert max-w-none'
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <EmptyCustomPageState />
        )}
      </div>
    </PublicLayout>
  )
}
