import React from 'react';
import { Modal } from '@douyinfe/semi-ui';

const EnableDisableUserModal = ({
  visible,
  onCancel,
  onConfirm,
  user,
  action,
  t,
}) => {
  const isDisable = action === 'disable';
  const isRestore = action === 'restore';
  const modalTitle = isRestore
    ? t('\u786e\u5b9a\u8981\u6062\u590d\u6b64\u7528\u6237\u5417\uff1f')
    : isDisable
      ? t('\u786e\u5b9a\u8981\u7981\u7528\u6b64\u7528\u6237\u5417\uff1f')
      : t('\u786e\u5b9a\u8981\u542f\u7528\u6b64\u7528\u6237\u5417\uff1f');
  const modalContent = isRestore
    ? t('\u6062\u590d\u540e\u8be5\u7528\u6237\u53ef\u4ee5\u91cd\u65b0\u767b\u5f55\u548c\u4f7f\u7528\u8d26\u6237\u3002')
    : isDisable
      ? t('\u6b64\u64cd\u4f5c\u5c06\u7981\u7528\u7528\u6237\u8d26\u6237')
      : t('\u6b64\u64cd\u4f5c\u5c06\u542f\u7528\u7528\u6237\u8d26\u6237');

  return (
    <Modal
      title={modalTitle}
      visible={visible}
      onCancel={onCancel}
      onOk={onConfirm}
      type='warning'
    >
      {modalContent}
    </Modal>
  );
};

export default EnableDisableUserModal;
