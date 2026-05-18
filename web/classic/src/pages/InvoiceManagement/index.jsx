import React, { useEffect, useState } from 'react';
import { Badge, Button, Empty, Table, Toast, Typography } from '@douyinfe/semi-ui';
import { IconRefresh } from '@douyinfe/semi-icons';
import { FileText } from 'lucide-react';
import { API, timestamp2string } from '../../helpers';

const { Text } = Typography;

const labels = {
  title: '\u53d1\u7968\u7ba1\u7406',
  refresh: '\u5237\u65b0',
  amount: '\u5f00\u7968\u91d1\u989d',
  company: '\u5355\u4f4d\u540d\u79f0',
  taxNo: '\u7a0e\u53f7',
  status: '\u72b6\u6001',
  createdAt: '\u7533\u8bf7\u65f6\u95f4',
  action: '\u64cd\u4f5c',
  pending: '\u5f85\u5904\u7406',
  approved: '\u5df2\u5f00\u7968',
  rejected: '\u5df2\u9a73\u56de',
  noData: '\u6682\u65e0\u53d1\u7968\u7533\u8bf7',
  loadFail: '\u52a0\u8f7d\u53d1\u7968\u7533\u8bf7\u5931\u8d25',
};

const statusConfig = {
  pending: { text: labels.pending, type: 'warning' },
  approved: { text: labels.approved, type: 'success' },
  rejected: { text: labels.rejected, type: 'danger' },
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

function InvoiceManagement() {
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ p: String(page), page_size: String(pageSize) });
      const res = await API.get(`/api/user/invoice?${params.toString()}`);
      if (res.data?.success) {
        setInvoices(res.data.data?.items || []);
        setTotal(res.data.data?.total || 0);
      } else {
        Toast.error(res.data?.message || labels.loadFail);
      }
    } catch (error) {
      Toast.error(labels.loadFail);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [page, pageSize]);

  const columns = [
    { title: labels.amount, dataIndex: 'amount', render: (value) => <Text type='danger'>{money(value)}</Text> },
    { title: labels.company, dataIndex: 'company_name' },
    { title: labels.taxNo, dataIndex: 'tax_no' },
    { title: labels.status, dataIndex: 'status', render: statusBadge },
    { title: labels.createdAt, dataIndex: 'create_time', render: timestamp2string },
    { title: labels.action, render: () => <Text type='tertiary'>-</Text> },
  ];

  return (
    <div className='w-full mx-auto mt-[60px] px-4'>
      <div className='rounded-xl border border-semi-color-border bg-semi-color-bg-0 p-3 md:p-4'>
        <div className='mb-4 flex items-center justify-between gap-3'>
          <div className='flex items-center gap-2 text-base font-semibold text-semi-color-text-0'>
            <FileText size={18} />
            <span>{labels.title}</span>
          </div>
          <Button icon={<IconRefresh />} theme='light' type='primary' onClick={loadInvoices} loading={loading}>{labels.refresh}</Button>
        </div>
        <Table
          columns={columns}
          dataSource={invoices}
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
          empty={<Empty description={labels.noData} />}
        />
      </div>
    </div>
  );
}

export default InvoiceManagement;
