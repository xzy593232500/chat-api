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
    InvoiceStatusPending  = "pending"
    InvoiceStatusApproved = "approved"
    InvoiceStatusRejected = "rejected"
    MinInvoiceAmount      = 500
)

type TopUpInvoice struct {
    Id          int     `json:"id"`
    UserId      int     `json:"user_id" gorm:"index"`
    TopUpIds    string  `json:"topup_ids" gorm:"type:text"`
    TradeNos    string  `json:"trade_nos" gorm:"type:text"`
    Amount      float64 `json:"amount"`
    CompanyName string  `json:"company_name" gorm:"type:varchar(255)"`
    TaxNo       string  `json:"tax_no" gorm:"type:varchar(64)"`
    Content     string  `json:"content" gorm:"type:varchar(255)"`
    Remark      string  `json:"remark" gorm:"type:varchar(255)"`
    Status      string  `json:"status" gorm:"type:varchar(32);default:pending"`
    CreateTime  int64   `json:"create_time"`
    UpdateTime  int64   `json:"update_time"`
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
        return nil, errors.New("\u8bf7\u9009\u62e9\u9700\u8981\u5f00\u7968\u7684\u5145\u503c\u8d26\u5355")
    }
    if strings.TrimSpace(companyName) == "" {
        return nil, errors.New("\u8bf7\u586b\u5199\u5355\u4f4d\u540d\u79f0")
    }
    if strings.TrimSpace(taxNo) == "" {
        return nil, errors.New("\u8bf7\u586b\u5199\u7eb3\u7a0e\u4eba\u8bc6\u522b\u53f7")
    }
    if strings.TrimSpace(content) == "" {
        return nil, errors.New("\u8bf7\u586b\u5199\u53d1\u7968\u5185\u5bb9")
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
        return nil, errors.New("\u8bf7\u9009\u62e9\u6709\u6548\u7684\u5145\u503c\u8d26\u5355")
    }

    var invoice *TopUpInvoice
    err := DB.Transaction(func(tx *gorm.DB) error {
        var topups []*TopUp
        if err := tx.Where("user_id = ? AND status = ? AND id IN ?", userId, common.TopUpStatusSuccess, ids).Find(&topups).Error; err != nil {
            return err
        }
        if len(topups) != len(ids) {
            return errors.New("\u53ea\u80fd\u9009\u62e9\u5df2\u6210\u529f\u652f\u4ed8\u7684\u672c\u4eba\u5145\u503c\u8d26\u5355")
        }

        for _, id := range ids {
            var duplicateCount int64
            if err := tx.Model(&TopUpInvoice{}).
                Where("user_id = ? AND top_up_ids LIKE ?", userId, fmt.Sprintf("%%,%d,%%", id)).
                Count(&duplicateCount).Error; err != nil {
                return err
            }
            if duplicateCount > 0 {
                return errors.New("\u9009\u4e2d\u7684\u5145\u503c\u8d26\u5355\u5df2\u7533\u8bf7\u8fc7\u53d1\u7968")
            }
        }

        amount := 0.0
        tradeNos := make([]string, 0, len(topups))
        for _, topup := range topups {
            amount += topup.Money
            tradeNos = append(tradeNos, topup.TradeNo)
        }
        if amount < MinInvoiceAmount {
            return fmt.Errorf("\u6700\u4f4e\u5f00\u7968\u91d1\u989d\u4e3a %d \u5143", MinInvoiceAmount)
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
            Content:     strings.TrimSpace(content),
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
