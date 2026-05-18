package model

import (
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"gorm.io/gorm"
)

const (
	InvoiceStatusPending   = "pending"
	InvoiceStatusIssued    = "issued"
	InvoiceStatusApproved  = "approved"
	InvoiceStatusRejected  = "rejected"
	InvoiceStatusWithdrawn = "withdrawn"
	MinInvoiceAmount       = 500
	DefaultInvoiceContent  = "“信息技术服务”技术服务费"
)

type TopUpInvoice struct {
	Id              int     `json:"id"`
	UserId          int     `json:"user_id" gorm:"index"`
	Username        string  `json:"username" gorm:"-"`
	DisplayName     string  `json:"display_name,omitempty" gorm:"-"`
	TopUpIds        string  `json:"topup_ids" gorm:"type:text"`
	TradeNos        string  `json:"trade_nos" gorm:"type:text"`
	Amount          float64 `json:"amount"`
	CompanyName     string  `json:"company_name" gorm:"type:varchar(255)"`
	TaxNo           string  `json:"tax_no" gorm:"type:varchar(64)"`
	Content         string  `json:"content" gorm:"type:varchar(255)"`
	Remark          string  `json:"remark" gorm:"type:varchar(255)"`
	Status          string  `json:"status" gorm:"type:varchar(32);default:pending"`
	InvoiceFilePath string  `json:"-" gorm:"type:varchar(512)"`
	InvoiceFileName string  `json:"invoice_file_name" gorm:"type:varchar(255)"`
	RejectReason    string  `json:"reject_reason" gorm:"type:varchar(255)"`
	ProcessedTime   int64   `json:"processed_time"`
	CreateTime      int64   `json:"create_time"`
	UpdateTime      int64   `json:"update_time"`
}

func encodeInvoiceTopUpIds(ids []int) string {
	parts := make([]string, 0, len(ids)+2)
	parts = append(parts, "")
	for _, id := range ids {
		parts = append(parts, fmt.Sprintf("%d", id))
	}
	parts = append(parts, "")
	return strings.Join(parts, ",")
}

func parseInvoiceTopUpIds(value string) []int {
	parts := strings.Split(value, ",")
	ids := make([]int, 0, len(parts))
	for _, part := range parts {
		id, err := strconv.Atoi(strings.TrimSpace(part))
		if err == nil && id > 0 {
			ids = append(ids, id)
		}
	}
	return ids
}

func attachInvoiceUsers(invoices []*TopUpInvoice) {
	userIds := make([]int, 0, len(invoices))
	seen := make(map[int]struct{})
	for _, invoice := range invoices {
		if invoice == nil || invoice.UserId <= 0 {
			continue
		}
		if _, ok := seen[invoice.UserId]; ok {
			continue
		}
		seen[invoice.UserId] = struct{}{}
		userIds = append(userIds, invoice.UserId)
	}
	if len(userIds) == 0 {
		return
	}

	var users []User
	if err := DB.Unscoped().Select("id, username, display_name").Where("id IN ?", userIds).Find(&users).Error; err != nil {
		return
	}

	userById := make(map[int]User, len(users))
	for _, user := range users {
		userById[user.Id] = user
	}
	for _, invoice := range invoices {
		user, ok := userById[invoice.UserId]
		if !ok {
			continue
		}
		invoice.Username = user.Username
		invoice.DisplayName = user.DisplayName
	}
}

func GetUserInvoices(userId int, pageInfo *common.PageInfo) (invoices []*TopUpInvoice, total int64, err error) {
	tx := DB.Begin()
	if tx.Error != nil {
		return nil, 0, tx.Error
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	if err = tx.Model(&TopUpInvoice{}).Where("user_id = ?", userId).Count(&total).Error; err != nil {
		tx.Rollback()
		return nil, 0, err
	}

	if err = tx.Where("user_id = ?", userId).Order("id desc").Limit(pageInfo.GetPageSize()).Offset(pageInfo.GetStartIdx()).Find(&invoices).Error; err != nil {
		tx.Rollback()
		return nil, 0, err
	}

	if err = tx.Commit().Error; err != nil {
		return nil, 0, err
	}

	return invoices, total, nil
}

func GetAllInvoices(pageInfo *common.PageInfo) (invoices []*TopUpInvoice, total int64, err error) {
	if err = DB.Model(&TopUpInvoice{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}
	if err = DB.Order("id desc").Limit(pageInfo.GetPageSize()).Offset(pageInfo.GetStartIdx()).Find(&invoices).Error; err != nil {
		return nil, 0, err
	}
	attachInvoiceUsers(invoices)
	return invoices, total, nil
}

func GetInvoiceById(id int) (*TopUpInvoice, error) {
	var invoice TopUpInvoice
	if err := DB.Where("id = ?", id).First(&invoice).Error; err != nil {
		return nil, err
	}
	attachInvoiceUsers([]*TopUpInvoice{&invoice})
	return &invoice, nil
}

func GetUserInvoiceById(userId int, id int) (*TopUpInvoice, error) {
	var invoice TopUpInvoice
	if err := DB.Where("id = ? AND user_id = ?", id, userId).First(&invoice).Error; err != nil {
		return nil, err
	}
	return &invoice, nil
}

func AttachInvoiceStatusToTopUps(userId int, topups []*TopUp) error {
	if len(topups) == 0 {
		return nil
	}
	topupById := make(map[int]*TopUp, len(topups))
	for _, topup := range topups {
		if topup != nil {
			topupById[topup.Id] = topup
		}
	}

	var invoices []*TopUpInvoice
	if err := DB.Where("user_id = ?", userId).Find(&invoices).Error; err != nil {
		return err
	}
	for _, invoice := range invoices {
		for _, topUpId := range parseInvoiceTopUpIds(invoice.TopUpIds) {
			if topup, ok := topupById[topUpId]; ok {
				topup.InvoiceStatus = invoice.Status
			}
		}
	}
	return nil
}

func CreateTopUpInvoice(userId int, topUpIds []int, companyName, taxNo, content, remark string) (*TopUpInvoice, error) {
	if len(topUpIds) == 0 {
		return nil, errors.New("请选择需要开票的充值账单")
	}
	if strings.TrimSpace(companyName) == "" {
		return nil, errors.New("请填写单位名称")
	}
	if strings.TrimSpace(taxNo) == "" {
		return nil, errors.New("请填写纳税人识别号")
	}

	seen := make(map[int]struct{}, len(topUpIds))
	ids := make([]int, 0, len(topUpIds))
	for _, id := range topUpIds {
		if id <= 0 {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		ids = append(ids, id)
	}
	if len(ids) == 0 {
		return nil, errors.New("请选择有效的充值账单")
	}

	var invoice *TopUpInvoice
	err := DB.Transaction(func(tx *gorm.DB) error {
		var topups []*TopUp
		if err := tx.Where("user_id = ? AND status = ? AND id IN ?", userId, common.TopUpStatusSuccess, ids).Find(&topups).Error; err != nil {
			return err
		}
		if len(topups) != len(ids) {
			return errors.New("只能选择已成功支付的本人充值账单")
		}

		for _, id := range ids {
			var duplicateCount int64
			if err := tx.Model(&TopUpInvoice{}).
				Where("user_id = ? AND top_up_ids LIKE ?", userId, fmt.Sprintf("%%,%d,%%", id)).
				Count(&duplicateCount).Error; err != nil {
				return err
			}
			if duplicateCount > 0 {
				return errors.New("选中的充值账单已申请过发票")
			}
		}

		amount := 0.0
		tradeNos := make([]string, 0, len(topups))
		for _, topup := range topups {
			amount += topup.Money
			tradeNos = append(tradeNos, topup.TradeNo)
		}
		if amount < MinInvoiceAmount {
			return fmt.Errorf("最低开票金额为 %d 元", MinInvoiceAmount)
		}

		tradeNoBytes, err := json.Marshal(tradeNos)
		if err != nil {
			return err
		}

		now := common.GetTimestamp()
		invoice = &TopUpInvoice{
			UserId:      userId,
			TopUpIds:    encodeInvoiceTopUpIds(ids),
			TradeNos:    string(tradeNoBytes),
			Amount:      amount,
			CompanyName: strings.TrimSpace(companyName),
			TaxNo:       strings.TrimSpace(taxNo),
			Content:     DefaultInvoiceContent,
			Remark:      strings.TrimSpace(remark),
			Status:      InvoiceStatusPending,
			CreateTime:  now,
			UpdateTime:  now,
		}
		return tx.Create(invoice).Error
	})
	if err != nil {
		return nil, err
	}

	return invoice, nil
}

func WithdrawTopUpInvoice(userId int, id int) error {
	return DB.Transaction(func(tx *gorm.DB) error {
		var invoice TopUpInvoice
		if err := tx.Where("id = ? AND user_id = ?", id, userId).First(&invoice).Error; err != nil {
			return err
		}
		if invoice.Status != InvoiceStatusPending {
			return errors.New("只有待开票的申请可以撤回")
		}
		now := common.GetTimestamp()
		return tx.Model(&invoice).Updates(map[string]interface{}{
			"status":         InvoiceStatusWithdrawn,
			"update_time":    now,
			"processed_time": now,
		}).Error
	})
}

func RejectTopUpInvoice(id int, reason string) error {
	reason = strings.TrimSpace(reason)
	if reason == "" {
		return errors.New("请填写驳回原因")
	}

	return DB.Transaction(func(tx *gorm.DB) error {
		var invoice TopUpInvoice
		if err := tx.Where("id = ?", id).First(&invoice).Error; err != nil {
			return err
		}
		if invoice.Status != InvoiceStatusPending {
			return errors.New("只有待开票的申请可以驳回")
		}
		now := common.GetTimestamp()
		return tx.Model(&invoice).Updates(map[string]interface{}{
			"status":         InvoiceStatusRejected,
			"reject_reason":  reason,
			"update_time":    now,
			"processed_time": now,
		}).Error
	})
}

func MarkTopUpInvoiceIssued(id int, filePath string, fileName string) (*TopUpInvoice, error) {
	var updated TopUpInvoice
	err := DB.Transaction(func(tx *gorm.DB) error {
		var invoice TopUpInvoice
		if err := tx.Where("id = ?", id).First(&invoice).Error; err != nil {
			return err
		}
		if invoice.Status == InvoiceStatusRejected || invoice.Status == InvoiceStatusWithdrawn {
			return errors.New("已驳回或已撤回的申请不能上传发票")
		}
		now := common.GetTimestamp()
		if err := tx.Model(&invoice).Updates(map[string]interface{}{
			"status":            InvoiceStatusIssued,
			"invoice_file_path": filePath,
			"invoice_file_name": fileName,
			"reject_reason":     "",
			"update_time":       now,
			"processed_time":    now,
		}).Error; err != nil {
			return err
		}
		updated = invoice
		return tx.Where("id = ?", id).First(&updated).Error
	})
	if err != nil {
		return nil, err
	}
	return &updated, nil
}
