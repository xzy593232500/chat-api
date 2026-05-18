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

import React from 'react';
import { Button, Modal } from '@douyinfe/semi-ui';

const UsersActions = ({ setShowAddUser, selectedUserIds = [], batchDeleteUsers, loading, t }) => {
  // Add new user
  const handleAddUser = () => {
    setShowAddUser(true);
  };

  const handleBatchDelete = () => {
    Modal.confirm({
      title: t('确定要批量注销选中的用户吗？'),
      content: t('剩余额度为 0 的用户会从数据库中删除；仍有余额的用户会保留为已注销状态，可稍后恢复。'),
      type: 'danger',
      onOk: batchDeleteUsers,
    });
  };

  return (
    <div className='flex gap-2 w-full md:w-auto order-2 md:order-1'>
      <Button className='w-full md:w-auto' onClick={handleAddUser} size='small'>
        {t('添加用户')}
      </Button>
      <Button
        className='w-full md:w-auto'
        type='danger'
        theme='light'
        size='small'
        disabled={selectedUserIds.length === 0}
        loading={loading}
        onClick={handleBatchDelete}
      >
        {t('批量注销')}{selectedUserIds.length > 0 ? ` (${selectedUserIds.length})` : ''}
      </Button>
    </div>
  );
};

export default UsersActions;
