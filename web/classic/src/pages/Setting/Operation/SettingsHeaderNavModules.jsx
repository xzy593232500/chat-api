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

import React, { useEffect, useState, useContext } from 'react';
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  Row,
  Switch,
  TextArea,
  Typography,
} from '@douyinfe/semi-ui';
import { API, showError, showSuccess } from '../../../helpers';
import { useTranslation } from 'react-i18next';
import { StatusContext } from '../../../context/Status';

const { Text } = Typography;

const DEFAULT_HEADER_NAV_MODULES = {
  home: true,
  console: true,
  pricing: {
    enabled: true,
    requireAuth: false,
  },
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

function normalizeHeaderNavModules(modules = {}) {
  const normalized = {
    ...DEFAULT_HEADER_NAV_MODULES,
    ...modules,
    pricing: {
      ...DEFAULT_HEADER_NAV_MODULES.pricing,
      ...(typeof modules.pricing === 'object' ? modules.pricing : {}),
    },
    customPage: {
      ...DEFAULT_HEADER_NAV_MODULES.customPage,
      ...(typeof modules.customPage === 'object' ? modules.customPage : {}),
    },
  };

  if (typeof modules.pricing === 'boolean') {
    normalized.pricing.enabled = modules.pricing;
  }

  if (typeof modules.customPage === 'boolean') {
    normalized.customPage.enabled = modules.customPage;
  }

  delete normalized.gptImage;
  return normalized;
}

export default function SettingsHeaderNavModules(props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [statusState, statusDispatch] = useContext(StatusContext);
  const [headerNavModules, setHeaderNavModules] = useState(
    DEFAULT_HEADER_NAV_MODULES,
  );

  function handleHeaderNavModuleChange(moduleKey) {
    return (checked) => {
      const newModules = { ...headerNavModules };
      if (moduleKey === 'pricing') {
        newModules.pricing = {
          ...newModules.pricing,
          enabled: checked,
        };
      } else {
        newModules[moduleKey] = checked;
      }
      setHeaderNavModules(newModules);
    };
  }

  function handlePricingAuthChange(checked) {
    setHeaderNavModules({
      ...headerNavModules,
      pricing: {
        ...headerNavModules.pricing,
        requireAuth: checked,
      },
    });
  }

  function handleCustomPageChange(field, value) {
    setHeaderNavModules({
      ...headerNavModules,
      customPage: {
        ...headerNavModules.customPage,
        [field]: value,
      },
    });
  }

  function resetHeaderNavModules() {
    setHeaderNavModules(DEFAULT_HEADER_NAV_MODULES);
    showSuccess(t('已重置为默认配置'));
  }

  async function onSubmit() {
    setLoading(true);
    try {
      const normalized = normalizeHeaderNavModules(headerNavModules);
      const serialized = JSON.stringify(normalized);
      const res = await API.put('/api/option/', {
        key: 'HeaderNavModules',
        value: serialized,
      });
      const { success, message } = res.data;
      if (success) {
        showSuccess(t('保存成功'));

        statusDispatch({
          type: 'set',
          payload: {
            ...statusState.status,
            HeaderNavModules: serialized,
          },
        });

        if (props.refresh) {
          await props.refresh();
        }
      } else {
        showError(message);
      }
    } catch (error) {
      showError(t('保存失败，请重试'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (props.options && props.options.HeaderNavModules) {
      try {
        const modules = JSON.parse(props.options.HeaderNavModules);
        setHeaderNavModules(normalizeHeaderNavModules(modules));
      } catch (error) {
        setHeaderNavModules(DEFAULT_HEADER_NAV_MODULES);
      }
    }
  }, [props.options]);

  const moduleConfigs = [
    {
      key: 'home',
      title: t('首页'),
      description: t('用户主页，展示系统信息'),
    },
    {
      key: 'console',
      title: t('控制台'),
      description: t('用户控制面板，管理账户'),
    },
    {
      key: 'pricing',
      title: t('模型广场'),
      description: t('模型定价和模型列表'),
    },
    {
      key: 'docs',
      title: t('文档'),
      description: t('系统文档和帮助信息'),
    },
    {
      key: 'about',
      title: t('关于'),
      description: t('关于系统的详细信息'),
    },
  ];

  const customPageEnabled = headerNavModules.customPage?.enabled || false;
  const customPageUseHtml = headerNavModules.customPage?.useHtml || false;

  return (
    <Card>
      <Form.Section
        text={t('顶栏管理')}
        extraText={t('控制顶栏模块显示状态，全局生效')}
      >
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          {moduleConfigs.map((module) => (
            <Col key={module.key} xs={24} sm={12} md={6} lg={6} xl={6}>
              <Card
                style={{
                  borderRadius: '8px',
                  border: '1px solid var(--semi-color-border)',
                  transition: 'all 0.2s ease',
                  background: 'var(--semi-color-bg-1)',
                  minHeight: '80px',
                }}
                bodyStyle={{ padding: '16px' }}
                hoverable
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    height: '100%',
                  }}
                >
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div
                      style={{
                        fontWeight: '600',
                        fontSize: '14px',
                        color: 'var(--semi-color-text-0)',
                        marginBottom: '4px',
                      }}
                    >
                      {module.title}
                    </div>
                    <Text
                      type='secondary'
                      size='small'
                      style={{
                        fontSize: '12px',
                        color: 'var(--semi-color-text-2)',
                        lineHeight: '1.4',
                        display: 'block',
                      }}
                    >
                      {module.description}
                    </Text>
                  </div>
                  <div style={{ marginLeft: '16px' }}>
                    <Switch
                      checked={
                        module.key === 'pricing'
                          ? headerNavModules.pricing?.enabled
                          : headerNavModules[module.key]
                      }
                      onChange={handleHeaderNavModuleChange(module.key)}
                      size='default'
                    />
                  </div>
                </div>

                {module.key === 'pricing' && headerNavModules.pricing?.enabled && (
                  <div
                    style={{
                      borderTop: '1px solid var(--semi-color-border)',
                      marginTop: '12px',
                      paddingTop: '12px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div style={{ flex: 1, textAlign: 'left' }}>
                        <div
                          style={{
                            fontWeight: '500',
                            fontSize: '12px',
                            color: 'var(--semi-color-text-1)',
                            marginBottom: '2px',
                          }}
                        >
                          {t('需要登录访问')}
                        </div>
                        <Text
                          type='secondary'
                          size='small'
                          style={{
                            fontSize: '11px',
                            color: 'var(--semi-color-text-2)',
                            lineHeight: '1.4',
                            display: 'block',
                          }}
                        >
                          {t('开启后未登录用户无法访问模型广场')}
                        </Text>
                      </div>
                      <div style={{ marginLeft: '16px' }}>
                        <Switch
                          checked={headerNavModules.pricing?.requireAuth || false}
                          onChange={handlePricingAuthChange}
                          size='default'
                        />
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            </Col>
          ))}
        </Row>

        <Card
          style={{
            borderRadius: '8px',
            border: '1px solid var(--semi-color-border)',
            background: 'var(--semi-color-bg-1)',
            marginBottom: '24px',
          }}
          bodyStyle={{ padding: '16px' }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '16px',
              marginBottom: '16px',
            }}
          >
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 600, fontSize: 16 }}>
                {t('自定义页面')}
              </div>
              <Text type='secondary'>
                {t('可自定义导航名称、跳转链接，或使用站内 HTML 页面')}
              </Text>
            </div>
            <Switch
              checked={customPageEnabled}
              onChange={(checked) => handleCustomPageChange('enabled', checked)}
            />
          </div>

          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <div style={{ marginBottom: 8 }}>{t('导航名称')}</div>
              <Input
                value={headerNavModules.customPage?.title || ''}
                placeholder={t('自定义页面')}
                disabled={!customPageEnabled}
                onChange={(value) => handleCustomPageChange('title', value)}
              />
            </Col>
            <Col xs={24} md={12}>
              <div style={{ marginBottom: 8 }}>{t('跳转链接')}</div>
              <Input
                value={headerNavModules.customPage?.url || ''}
                placeholder='https://example.com'
                disabled={!customPageEnabled || customPageUseHtml}
                onChange={(value) => handleCustomPageChange('url', value)}
              />
            </Col>
          </Row>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px dashed var(--semi-color-border)',
              marginTop: 16,
              paddingTop: 16,
            }}
          >
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 500 }}>{t('使用 HTML 页面')}</div>
              <Text type='secondary'>
                {t('开启后点击导航会打开站内页面并渲染下面的 HTML')}
              </Text>
            </div>
            <Switch
              checked={customPageUseHtml}
              disabled={!customPageEnabled}
              onChange={(checked) => handleCustomPageChange('useHtml', checked)}
            />
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={{ marginBottom: 8 }}>{t('HTML 内容')}</div>
            <TextArea
              value={headerNavModules.customPage?.html || ''}
              placeholder='<section><h1>My Page</h1></section>'
              rows={8}
              disabled={!customPageEnabled || !customPageUseHtml}
              onChange={(value) => handleCustomPageChange('html', value)}
            />
          </div>
        </Card>

        <div
          style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-start',
            alignItems: 'center',
            paddingTop: '8px',
            borderTop: '1px solid var(--semi-color-border)',
          }}
        >
          <Button
            size='default'
            type='tertiary'
            onClick={resetHeaderNavModules}
            style={{
              borderRadius: '6px',
              fontWeight: '500',
            }}
          >
            {t('重置为默认')}
          </Button>
          <Button
            size='default'
            type='primary'
            onClick={onSubmit}
            loading={loading}
            style={{
              borderRadius: '6px',
              fontWeight: '500',
              minWidth: '100px',
            }}
          >
            {t('保存设置')}
          </Button>
        </div>
      </Form.Section>
    </Card>
  );
}
