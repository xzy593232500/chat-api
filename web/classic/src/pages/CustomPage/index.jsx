/*
Copyright (C) 2025 QuantumNous

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

import React, { useContext, useMemo } from 'react';
import { Empty } from '@douyinfe/semi-ui';
import {
  IllustrationConstruction,
  IllustrationConstructionDark,
} from '@douyinfe/semi-illustrations';
import { useTranslation } from 'react-i18next';
import { StatusContext } from '../../context/Status';

const defaultCustomPage = {
  enabled: false,
  title: '自定义页面',
  url: '',
  html: '',
  useHtml: false,
};

function parseCustomPage(rawConfig) {
  if (!rawConfig) {
    return defaultCustomPage;
  }

  try {
    const modules =
      typeof rawConfig === 'string' ? JSON.parse(rawConfig) : rawConfig;
    const raw = modules?.customPage;
    if (typeof raw === 'boolean') {
      return { ...defaultCustomPage, enabled: raw };
    }
    if (raw && typeof raw === 'object') {
      return { ...defaultCustomPage, ...raw };
    }
  } catch (error) {
    console.error('解析自定义页面配置失败:', error);
  }

  return defaultCustomPage;
}

export default function CustomPage() {
  const { t } = useTranslation();
  const [statusState] = useContext(StatusContext);
  const customPage = useMemo(
    () => parseCustomPage(statusState?.status?.HeaderNavModules),
    [statusState?.status?.HeaderNavModules],
  );

  const title = customPage.title?.trim() || t('自定义页面');
  const url = customPage.url?.trim() || '';
  const html = customPage.html?.trim() || '';

  if (!customPage.enabled) {
    return (
      <div className='mt-[60px] flex justify-center items-center h-screen p-8'>
        <Empty
          image={<IllustrationConstruction style={{ width: 150, height: 150 }} />}
          darkModeImage={
            <IllustrationConstructionDark style={{ width: 150, height: 150 }} />
          }
          description={t('管理员暂时未配置自定义页面')}
        />
      </div>
    );
  }

  if (!customPage.useHtml && url) {
    return (
      <div className='mt-[60px]'>
        <iframe
          src={url}
          title={title}
          style={{ width: '100%', height: 'calc(100vh - 60px)', border: 'none' }}
        />
      </div>
    );
  }

  return (
    <div className='mt-[60px] px-4 py-6'>
      <h1 className='mb-6 text-3xl font-semibold'>{title}</h1>
      {html ? (
        <div
          style={{ fontSize: 'larger' }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <div className='flex justify-center items-center h-[60vh] p-8'>
          <Empty
            image={
              <IllustrationConstruction style={{ width: 150, height: 150 }} />
            }
            darkModeImage={
              <IllustrationConstructionDark style={{ width: 150, height: 150 }} />
            }
            description={t('管理员暂时未配置自定义页面内容')}
          />
        </div>
      )}
    </div>
  );
}
