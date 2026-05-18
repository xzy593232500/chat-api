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

import { useMemo } from 'react';

const defaultModules = {
  home: true,
  console: true,
  pricing: true,
  docs: true,
  about: true,
  customPage: {
    enabled: false,
    title: '自定义页面',
    url: '',
    html: '',
    useHtml: false,
  },
};

const isExternalHref = (href) =>
  /^(https?:)?\/\//i.test(href) || /^(mailto|tel):/i.test(href);

function normalizeModules(headerNavModules) {
  const modules = {
    ...defaultModules,
    ...(headerNavModules || {}),
    customPage: {
      ...defaultModules.customPage,
      ...(typeof headerNavModules?.customPage === 'object'
        ? headerNavModules.customPage
        : {}),
    },
  };

  if (typeof headerNavModules?.customPage === 'boolean') {
    modules.customPage.enabled = headerNavModules.customPage;
  }

  return modules;
}

export const useNavigation = (t, docsLink, headerNavModules) => {
  const mainNavLinks = useMemo(() => {
    const modules = normalizeModules(headerNavModules);
    const customPage = modules.customPage;
    const customPageTitle = customPage.title?.trim() || t('自定义页面');
    const customPageUrl = customPage.url?.trim() || '';
    const customPageHref =
      customPage.useHtml || !customPageUrl ? '/custom-page' : customPageUrl;

    const allLinks = [
      {
        text: t('首页'),
        itemKey: 'home',
        to: '/',
      },
      {
        text: t('控制台'),
        itemKey: 'console',
        to: '/console',
      },
      {
        text: t('模型广场'),
        itemKey: 'pricing',
        to: '/pricing',
      },
      ...(docsLink
        ? [
            {
              text: t('文档'),
              itemKey: 'docs',
              isExternal: true,
              externalLink: docsLink,
            },
          ]
        : []),
      ...(customPage.enabled
        ? [
            {
              text: customPageTitle,
              itemKey: 'customPage',
              to: customPageHref,
              isExternal: isExternalHref(customPageHref),
              externalLink: customPageHref,
            },
          ]
        : []),
      {
        text: t('关于'),
        itemKey: 'about',
        to: '/about',
      },
    ];

    return allLinks.filter((link) => {
      if (link.itemKey === 'docs') {
        return docsLink && modules.docs;
      }
      if (link.itemKey === 'pricing') {
        return typeof modules.pricing === 'object'
          ? modules.pricing.enabled
          : modules.pricing;
      }
      if (link.itemKey === 'customPage') {
        return modules.customPage?.enabled;
      }
      return modules[link.itemKey] !== false;
    });
  }, [t, docsLink, headerNavModules]);

  return {
    mainNavLinks,
  };
};
