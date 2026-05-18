import React, { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Checkbox,
  DatePicker,
  Empty,
  Form,
  Input,
  Modal,
  Select,
  Table,
  Toast,
  Typography,
} from '@douyinfe/semi-ui';
import { IconCopy, IconFile, IconSearch } from '@douyinfe/semi-icons';
import { Coins, ReceiptText } from 'lucide-react';
import { API, copy, timestamp2string } from '../../helpers';

const { Text } = Typography;
const MIN_INVOICE_AMOUNT = 500;
const DEFAULT_INVOICE_CONTENT = '“信息技术服务”技术服务费';

const labels = {
  title: '\u5145\u503c\u8d26\u5355',
  invoiceButton: '\u7533\u8bf7\u53d1\u7968',
  startTime: '\u5f00\u59cb\u65f6\u95f4',
  endTime: '\u7ed3\u675f\u65f6\u95f4',
  searchOrder: '\u641c\u7d22\u8ba2\u5355\u53f7',
  allStatus: '\u5168\u90e8\u72b6\u6001',
  orderNo: '\u8ba2\u5355\u53f7',
  paymentMethod: '\u652f\u4ed8\u65b9\u5f0f',
  quota: '\u5145\u503c\u989d\u5ea6',
  paidAmount: '\u652f\u4ed8\u91d1\u989d',
  status: '\u72b6\u6001',
  createdAt: '\u521b\u5efa\u65f6\u95f4',
  success: '\u6210\u529f',
  pending: '\u5f85\u652f\u4ed8',
  failed: '\u5931\u8d25',
  expired: '\u5df2\u8fc7\u671f',
  applied: '\u5df2\u7533\u8bf7',
  invoiceTitle: '\u7533\u8bf7\u5f00\u7968',
  chooseBill: '1. \u9009\u62e9\u53ef\u5f00\u7968\u8d26\u5355\uff08\u4ec5\u663e\u793a\u6210\u529f\u4e14\u672a\u5f00\u8fc7\u53d1\u7968\u7684\u5145\u503c\u8bb0\u5f55\uff09',
  fillTitle: '2. \u586b\u5199\u53d1\u7968\u62ac\u5934',
  selectedCount: '\u5df2\u9009',
  records: '\u7b14',
  invoiceAmount: '\u5f00\u7968\u91d1\u989d',
  company: '\u5355\u4f4d\u540d\u79f0',
  taxNo: '\u7eb3\u7a0e\u4eba\u8bc6\u522b\u53f7',
  content: '\u53d1\u7968\u5185\u5bb9',
  remark: '\u5f00\u7968\u5907\u6ce8',
  companyPlaceholder: '\u8bf7\u8f93\u5165\u5355\u4f4d\u5168\u79f0',
  taxNoPlaceholder: '\u8bf7\u8f93\u516518\u4f4d\u7edf\u4e00\u793e\u4f1a\u4fe1\u7528\u4ee3\u7801',
  contentPlaceholder: DEFAULT_INVOICE_CONTENT,
  remarkPlaceholder: '\u8bf7\u7b80\u8981\u8bf4\u660e\u7528\u9014',
  note: '\u7531\u4e8e\u6c47\u7387\u6ce2\u52a8\uff0c\u8d26\u5355\u91d1\u989d\u53ef\u80fd\u4e0e\u5b9e\u9645\u652f\u4ed8\u91d1\u989d\u5b58\u5728\u7ec6\u5fae\u5dee\u5f02\u3002\u5982\u6709\u5dee\u5f02\uff0c\u8bf7\u6839\u636e\u5b9e\u9645\u652f\u4ed8\u51ed\u8bc1\u4fee\u6539\u5f00\u7968\u91d1\u989d\u3002',
  minTip: '\u6700\u4f4e\u5f00\u7968\u91d1\u989d\u4e3a 500 \u5143\uff0c\u5f53\u524d\u5df2\u9009\u91d1\u989d\u4e0d\u8db3',
  cancel: '\u53d6\u6d88',
  submit: '\u63d0\u4ea4\u7533\u8bf7',
  submitSuccess: '\u53d1\u7968\u7533\u8bf7\u5df2\u63d0\u4ea4',
  noBills: '\u6682\u65e0\u5145\u503c\u8bb0\u5f55',
  noInvoiceableBills: '暂无可开票账单',
};

const paymentLabels = {
  alipay: '\u652f\u4ed8\u5b9d',
  wxpay: '\u5fae\u4fe1',
  stripe: 'Stripe',
  creem: 'Creem',
  waffo: 'Waffo',
  waffo_pancake: 'Waffo Pancake',
};

const statusConfig = {
  success: { text: labels.success, type: 'success' },
  pending: { text: labels.pending, type: 'warning' },
  failed: { text: labels.failed, type: 'danger' },
  expired: { text: labels.expired, type: 'danger' },
};

function money(value) {
  const n = Number(value || 0);
  return `\u00a5${n.toFixed(2)}`;
}

function statusBadge(status) {
  const config = statusConfig[status] || { text: status || '-', type: 'primary' };
  return (
    <span className='inline-flex items-center gap-2'>
      <Badge dot type={config.type} />
      <span>{config.text}</span>
    </span>
  );
}

function TopUpBills() {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [topups, setTopups] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('all');
  const [startAt, setStartAt] = useState(null);
  const [endAt, setEndAt] = useState(null);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceableTopups, setInvoiceableTopups] = useState([]);
  const [invoiceableTotal, setInvoiceableTotal] = useState(0);
  const [invoiceablePage, setInvoiceablePage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [form, setForm] = useState({
    company_name: '',
    tax_no: '',
    content: DEFAULT_INVOICE_CONTENT,
    remark: '',
  });

  const loadTopups = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ p: String(page), page_size: String(pageSize) });
      if (keyword) params.set('keyword', keyword);
      const res = await API.get(`/api/user/topup/self?${params.toString()}`);
      if (res.data?.success) {
        setTopups(res.data.data?.items || []);
        setTotal(res.data.data?.total || 0);
      } else {
        Toast.error(res.data?.message || '\u52a0\u8f7d\u8d26\u5355\u5931\u8d25');
      }
    } catch (error) {
      Toast.error('\u52a0\u8f7d\u8d26\u5355\u5931\u8d25');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTopups();
  }, [page, pageSize, keyword]);

  const loadInvoiceableTopups = async (targetPage = invoiceablePage) => {
    setInvoiceLoading(true);
    try {
      const params = new URLSearchParams({
        p: String(targetPage),
        page_size: '10',
        invoiceable: 'true',
      });
      const res = await API.get(`/api/user/topup/self?${params.toString()}`);
      if (res.data?.success) {
        setInvoiceableTopups(res.data.data?.items || []);
        setInvoiceableTotal(res.data.data?.total || 0);
        setInvoiceablePage(res.data.data?.page || targetPage);
      } else {
        Toast.error(res.data?.message || '\u52a0\u8f7d\u53ef\u5f00\u7968\u8d26\u5355\u5931\u8d25');
      }
    } catch (error) {
      Toast.error('\u52a0\u8f7d\u53ef\u5f00\u7968\u8d26\u5355\u5931\u8d25');
    } finally {
      setInvoiceLoading(false);
    }
  };

  const filteredTopups = useMemo(() => {
    return topups.filter((item) => {
      if (status !== 'all' && item.status !== status) return false;
      if (startAt && item.create_time * 1000 < new Date(startAt).getTime()) return false;
      if (endAt && item.create_time * 1000 > new Date(endAt).getTime()) return false;
      return true;
    });
  }, [topups, status, startAt, endAt]);

  const selectedRecords = useMemo(
    () => invoiceableTopups.filter((item) => selectedIds.includes(item.id)),
    [invoiceableTopups, selectedIds],
  );

  const selectedAmount = selectedRecords.reduce((sum, item) => sum + Number(item.money || 0), 0);
  const canSubmit =
    selectedIds.length > 0 &&
    selectedAmount >= MIN_INVOICE_AMOUNT &&
    form.company_name.trim() &&
    form.tax_no.trim();

  const openInvoiceModal = () => {
    setSelectedIds([]);
    setInvoiceablePage(1);
    setInvoiceOpen(true);
    loadInvoiceableTopups(1);
  };

  const toggleSelected = (record) => {
    if (record.status !== 'success' || record.invoice_status) return;
    setSelectedIds((prev) =>
      prev.includes(record.id) ? prev.filter((id) => id !== record.id) : [...prev, record.id],
    );
  };

  const submitInvoice = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await API.post('/api/user/invoice', {
        topup_ids: selectedIds,
        ...form,
        content: DEFAULT_INVOICE_CONTENT,
      });
      if (res.data?.success) {
        Toast.success(labels.submitSuccess);
        setInvoiceOpen(false);
        setSelectedIds([]);
        await loadTopups();
      } else {
        Toast.error(res.data?.message || '\u63d0\u4ea4\u5931\u8d25');
      }
    } catch (error) {
      Toast.error('\u63d0\u4ea4\u5931\u8d25');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: labels.orderNo,
      dataIndex: 'trade_no',
      render: (text) => (
        <span className='inline-flex items-center gap-1'>
          <span>{text}</span>
          <Button icon={<IconCopy />} size='small' theme='borderless' type='primary' onClick={() => copy(text)} />
        </span>
      ),
    },
    { title: labels.paymentMethod, dataIndex: 'payment_method', render: (text) => paymentLabels[text] || text || '-' },
    {
      title: labels.quota,
      dataIndex: 'amount',
      render: (value) => (
        <span className='inline-flex items-center gap-1'>
          <Coins size={15} />
          <span>{value}</span>
        </span>
      ),
    },
    { title: labels.paidAmount, dataIndex: 'money', render: (value) => <Text type='danger'>{money(value)}</Text> },
    { title: labels.status, dataIndex: 'status', render: statusBadge },
    { title: labels.createdAt, dataIndex: 'create_time', render: timestamp2string },
  ];

  const invoiceColumns = [
    {
      title: '\u4ea4\u6613\u53f7',
      dataIndex: 'trade_no',
      render: (text, record) => (
        <span className='inline-flex items-center gap-3'>
          <Checkbox
            checked={selectedIds.includes(record.id)}
            disabled={record.status !== 'success' || !!record.invoice_status}
            onChange={() => toggleSelected(record)}
          />
          <span>{text}</span>
        </span>
      ),
    },
    { title: labels.paymentMethod, dataIndex: 'payment_method', render: (text) => paymentLabels[text] || text || '-' },
    {
      title: '\u91d1\u989d',
      dataIndex: 'money',
      render: (value, record) => (
        <span className='inline-flex items-center gap-2'>
          <Text type='danger'>{money(value)}</Text>
          {record.invoice_status ? <Text type='tertiary'>{labels.applied}</Text> : null}
        </span>
      ),
    },
    { title: '\u5145\u503c\u65f6\u95f4', dataIndex: 'create_time', render: timestamp2string },
  ];

  return (
    <div className='w-full mx-auto mt-[60px] px-4'>
      <div className='rounded-xl border border-semi-color-border bg-semi-color-bg-0 p-3 md:p-4'>
        <div className='mb-4 flex items-center justify-between gap-3'>
          <div className='flex items-center gap-2 text-base font-semibold text-semi-color-text-0'>
            <ReceiptText size={18} />
            <span>{labels.title}</span>
          </div>
          <Button icon={<IconFile />} theme='light' onClick={openInvoiceModal}>{labels.invoiceButton}</Button>
        </div>

        <div className='mb-4 flex flex-wrap items-center gap-2'>
          <DatePicker type='dateTime' placeholder={labels.startTime} value={startAt} onChange={setStartAt} style={{ width: 160 }} />
          <span className='text-semi-color-text-2'>~</span>
          <DatePicker type='dateTime' placeholder={labels.endTime} value={endAt} onChange={setEndAt} style={{ width: 160 }} />
          <Input
            prefix={<IconSearch />}
            placeholder={labels.searchOrder}
            value={keyword}
            onChange={(value) => { setKeyword(value); setPage(1); }}
            showClear
            style={{ width: 220 }}
          />
          <Select value={status} onChange={setStatus} style={{ width: 140 }}>
            <Select.Option value='all'>{labels.allStatus}</Select.Option>
            <Select.Option value='success'>{labels.success}</Select.Option>
            <Select.Option value='pending'>{labels.pending}</Select.Option>
            <Select.Option value='failed'>{labels.failed}</Select.Option>
            <Select.Option value='expired'>{labels.expired}</Select.Option>
          </Select>
        </div>

        <Table
          columns={columns}
          dataSource={filteredTopups}
          loading={loading}
          rowKey='id'
          size='small'
          pagination={{
            currentPage: page,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOpts: [10, 20, 50, 100],
            onPageChange: setPage,
            onPageSizeChange: (size) => { setPageSize(size); setPage(1); },
          }}
          empty={<Empty description={labels.noBills} />}
        />
      </div>

      <Modal title={<span className='inline-flex items-center gap-2'><IconFile />{labels.invoiceTitle}</span>} visible={invoiceOpen} onCancel={() => setInvoiceOpen(false)} footer={null} width={720} centered>
        <div className='space-y-4'>
          <div>
            <div className='mb-2 font-semibold'>{labels.chooseBill}</div>
            <Table
              columns={invoiceColumns}
              dataSource={invoiceableTopups}
              rowKey='id'
              size='small'
              loading={invoiceLoading}
              pagination={{
                currentPage: invoiceablePage,
                pageSize: 10,
                total: invoiceableTotal,
                onPageChange: (nextPage) => {
                  setSelectedIds([]);
                  loadInvoiceableTopups(nextPage);
                },
              }}
              empty={<Empty description={labels.noInvoiceableBills} />}
            />
          </div>
          <div className='flex items-center justify-between rounded-lg border border-semi-color-border bg-semi-color-fill-0 px-4 py-4'>
            <span>{labels.selectedCount}: {selectedIds.length} {labels.records}</span>
            <span className='text-sm text-semi-color-text-0'>{labels.invoiceAmount}: <Text type='danger' strong className='!text-2xl'>{money(selectedAmount)}</Text></span>
          </div>
          <Text type='tertiary' size='small'>{labels.note}</Text>
          <div className='border-t border-semi-color-border pt-4'>
            <div className='mb-3 font-semibold'>{labels.fillTitle}</div>
            <Form layout='vertical'>
              <Form.Input field='company_name' label={<>{labels.company}<Text type='danger'> *</Text></>} placeholder={labels.companyPlaceholder} value={form.company_name} onChange={(value) => setForm((prev) => ({ ...prev, company_name: value }))} />
              <Form.Input field='tax_no' label={<>{labels.taxNo}<Text type='danger'> *</Text></>} placeholder={labels.taxNoPlaceholder} value={form.tax_no} onChange={(value) => setForm((prev) => ({ ...prev, tax_no: value }))} />
              <Form.Input field='content' label={labels.content} placeholder={labels.contentPlaceholder} value={DEFAULT_INVOICE_CONTENT} disabled />
              <Form.TextArea field='remark' label={labels.remark} placeholder={labels.remarkPlaceholder} maxCount={100} autosize={{ minRows: 3, maxRows: 4 }} value={form.remark} onChange={(value) => setForm((prev) => ({ ...prev, remark: value }))} />
            </Form>
          </div>
          <div className='flex items-center justify-between gap-3 border-t border-semi-color-border pt-5 pb-5'>
            <Text type='tertiary'>{selectedAmount < MIN_INVOICE_AMOUNT ? labels.minTip : ''}</Text>
            <div className='flex items-center gap-2'>
              <Button onClick={() => setInvoiceOpen(false)}>{labels.cancel}</Button>
              <Button type='primary' disabled={!canSubmit} loading={submitting} onClick={submitInvoice}>{labels.submit}</Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default TopUpBills;
