import React, { useEffect, useRef, useState } from 'react';
import {
  Button,
  Empty,
  Modal,
  Table,
  TextArea,
  Toast,
  Tooltip,
  Typography,
} from '@douyinfe/semi-ui';
import { IconDownload, IconRefresh } from '@douyinfe/semi-icons';
import { ReceiptText, Upload } from 'lucide-react';
import { API, timestamp2string } from '../../helpers';

const { Text } = Typography;

const labels = {
  title: '发票统计',
  refresh: '刷新',
  user: '用户',
  amount: '开票金额',
  company: '单位名称',
  taxNo: '税号',
  content: '发票内容',
  remark: '\u5f00\u7968\u5907\u6ce8',
  status: '状态',
  createdAt: '申请时间',
  processedAt: '处理时间',
  file: '发票文件',
  action: '操作',
  pending: '待开票',
  issued: '已开票',
  rejected: '已驳回',
  withdrawn: '已撤回',
  upload: '上传发票',
  replace: '重新上传',
  reject: '驳回',
  rejectReason: '驳回原因',
  rejectPlaceholder: '请输入驳回原因，客户可在发票管理页面查看',
  rejectSuccess: '发票申请已驳回',
  uploadSuccess: '发票文件已上传',
  download: '下载',
  noData: '暂无发票申请',
  loadFail: '加载发票统计失败',
};

const statusConfig = {
  pending: { text: labels.pending, color: '#d97706' },
  issued: { text: labels.issued, color: '#16a34a' },
  approved: { text: labels.issued, color: '#16a34a' },
  rejected: { text: labels.rejected, color: '#dc2626' },
  withdrawn: { text: labels.withdrawn, color: '#dc2626' },
};

function money(value) {
  const n = Number(value || 0);
  return `¥${n.toFixed(2)}`;
}

function statusText(status) {
  const config = statusConfig[status] || { text: status || '-', color: 'var(--semi-color-text-2)' };
  return <span style={{ color: config.color, fontWeight: 600 }}>{config.text}</span>;
}

function renderRemark(value) {
  const text = String(value || '').trim();
  if (!text) {
    return <Text type='tertiary'>-</Text>;
  }
  const shortText = text.length > 18 ? `${text.slice(0, 18)}...` : text;
  return (
    <Tooltip content={text}>
      <Text>{shortText}</Text>
    </Tooltip>
  );
}

const DOWNLOAD_FAIL_TEXT = '\u4e0b\u8f7d\u5931\u8d25';

function getFileNameFromDisposition(disposition, fallback) {
  if (!disposition) return fallback;

  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch (error) {
      return fallback;
    }
  }

  const fileNameMatch = disposition.match(/filename="?([^";]+)"?/i);
  return fileNameMatch?.[1] || fallback;
}

async function downloadInvoiceFile(url, fallbackName) {
  const res = await API.get(url, {
    responseType: 'blob',
    disableDuplicate: true,
    skipErrorHandler: true,
  });

  const contentType = res.headers?.['content-type'] || '';
  if (contentType.includes('application/json')) {
    let message = DOWNLOAD_FAIL_TEXT;
    try {
      const text = await res.data.text();
      const data = JSON.parse(text);
      message = data.message || message;
    } catch (error) {
      // keep fallback message
    }
    Toast.error(message);
    return;
  }

  const blob = res.data instanceof Blob ? res.data : new Blob([res.data], { type: contentType || 'application/octet-stream' });
  const href = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = getFileNameFromDisposition(res.headers?.['content-disposition'], fallbackName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(href), 1000);
}

function AdminInvoices() {
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [uploadingId, setUploadingId] = useState(null);
  const [uploadTarget, setUploadTarget] = useState(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const fileInputRef = useRef(null);
  const uploadTargetRef = useRef(null);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ p: String(page), page_size: String(pageSize) });
      const res = await API.get(`/api/invoice?${params.toString()}`);
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

  const openUpload = (record) => {
    uploadTargetRef.current = record;
    setUploadTarget(record);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const uploadInvoiceFile = async (event) => {
    const file = event.target.files?.[0];
    const target = uploadTargetRef.current || uploadTarget;
    if (!file || !target) return;

    setUploadingId(target.id);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await API.post(`/api/invoice/${target.id}/file`, formData);
      if (res.data?.success) {
        Toast.success(labels.uploadSuccess);
        loadInvoices();
      } else {
        Toast.error(res.data?.message || '上传失败');
      }
    } catch (error) {
      Toast.error('上传失败');
    } finally {
      setUploadingId(null);
      setUploadTarget(null);
      uploadTargetRef.current = null;
    }
  };

  const openReject = (record) => {
    setRejectTarget(record);
    setRejectReason('');
    setRejectOpen(true);
  };

  const submitReject = async () => {
    if (!rejectTarget) return;
    const reason = rejectReason.trim();
    if (!reason) {
      Toast.warning('请填写驳回原因');
      return;
    }

    setRejecting(true);
    try {
      const res = await API.post(`/api/invoice/${rejectTarget.id}/reject`, { reason });
      if (res.data?.success) {
        Toast.success(labels.rejectSuccess);
        setRejectOpen(false);
        loadInvoices();
      } else {
        Toast.error(res.data?.message || '驳回失败');
      }
    } catch (error) {
      Toast.error('驳回失败');
    } finally {
      setRejecting(false);
    }
  };

  const downloadInvoice = async (record) => {
    try {
      await downloadInvoiceFile(
        `/api/invoice/${record.id}/download`,
        record.invoice_file_name || `invoice-${record.id}`,
      );
    } catch (error) {
      Toast.error(DOWNLOAD_FAIL_TEXT);
    }
  };

  const columns = [
    {
      title: labels.user,
      dataIndex: 'username',
      render: (value, record) => value || record.display_name || `ID ${record.user_id}`,
    },
    { title: labels.amount, dataIndex: 'amount', render: (value) => <Text type='danger'>{money(value)}</Text> },
    { title: labels.company, dataIndex: 'company_name' },
    { title: labels.taxNo, dataIndex: 'tax_no' },
    { title: labels.content, dataIndex: 'content' },
    { title: labels.remark, dataIndex: 'remark', render: renderRemark },
    { title: labels.status, dataIndex: 'status', render: statusText },
    { title: labels.createdAt, dataIndex: 'create_time', render: timestamp2string },
    {
      title: labels.processedAt,
      dataIndex: 'processed_time',
      render: (value) => (value ? timestamp2string(value) : <Text type='tertiary'>-</Text>),
    },
    {
      title: labels.file,
      dataIndex: 'invoice_file_name',
      render: (value, record) =>
        value ? (
          <Button size='small' icon={<IconDownload />} theme='borderless' onClick={() => downloadInvoice(record)}>
            {labels.download}
          </Button>
        ) : (
          <Text type='tertiary'>-</Text>
        ),
    },
    {
      title: labels.action,
      render: (_, record) => {
        if (record.status === 'withdrawn') {
          return <Text type='tertiary'>-</Text>;
        }
        if (record.status === 'rejected') {
          return record.reject_reason ? (
            <Tooltip content={record.reject_reason}>
              <Text type='danger'>{labels.rejectReason}</Text>
            </Tooltip>
          ) : (
            <Text type='danger'>{labels.rejected}</Text>
          );
        }

        return (
          <div className='flex items-center gap-2'>
            <Button
              size='small'
              icon={<Upload size={14} />}
              type='primary'
              theme='light'
              loading={uploadingId === record.id}
              onClick={() => openUpload(record)}
            >
              {record.invoice_file_name ? labels.replace : labels.upload}
            </Button>
            {record.status === 'pending' ? (
              <Button size='small' type='danger' theme='borderless' onClick={() => openReject(record)}>
                {labels.reject}
              </Button>
            ) : null}
          </div>
        );
      },
    },
  ];

  return (
    <div className='w-full mx-auto mt-[60px] px-4'>
      <div className='rounded-xl border border-semi-color-border bg-semi-color-bg-0 p-3 md:p-4'>
        <div className='mb-4 flex items-center justify-between gap-3'>
          <div className='flex items-center gap-2 text-base font-semibold text-semi-color-text-0'>
            <ReceiptText size={18} />
            <span>{labels.title}</span>
          </div>
          <Button icon={<IconRefresh />} theme='light' type='primary' onClick={loadInvoices} loading={loading}>
            {labels.refresh}
          </Button>
        </div>
        <input ref={fileInputRef} type='file' accept='.pdf,.ofd,.jpg,.jpeg,.png,.zip' className='hidden' onChange={uploadInvoiceFile} />
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

      <Modal
        title={labels.reject}
        visible={rejectOpen}
        onCancel={() => setRejectOpen(false)}
        onOk={submitReject}
        confirmLoading={rejecting}
        okText={labels.reject}
        centered
      >
        <TextArea
          autosize={{ minRows: 4, maxRows: 6 }}
          maxCount={200}
          placeholder={labels.rejectPlaceholder}
          value={rejectReason}
          onChange={setRejectReason}
        />
      </Modal>
    </div>
  );
}

export default AdminInvoices;
