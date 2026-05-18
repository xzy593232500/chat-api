package controller

import (
	"errors"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
)

const invoiceUploadDir = "/data/invoices"

type CreateTopUpInvoiceRequest struct {
	TopUpIds    []int  `json:"topup_ids" binding:"required"`
	CompanyName string `json:"company_name" binding:"required"`
	TaxNo       string `json:"tax_no" binding:"required"`
	Content     string `json:"content"`
	Remark      string `json:"remark"`
}

type RejectTopUpInvoiceRequest struct {
	Reason string `json:"reason" binding:"required"`
}

func GetUserInvoices(c *gin.Context) {
	userId := c.GetInt("id")
	pageInfo := common.GetPageQuery(c)

	invoices, total, err := model.GetUserInvoices(userId, pageInfo)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(invoices)
	common.ApiSuccess(c, pageInfo)
}

func CreateTopUpInvoice(c *gin.Context) {
	userId := c.GetInt("id")
	var req CreateTopUpInvoiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}

	invoice, err := model.CreateTopUpInvoice(
		userId,
		req.TopUpIds,
		req.CompanyName,
		req.TaxNo,
		req.Content,
		req.Remark,
	)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	common.ApiSuccess(c, invoice)
}

func WithdrawTopUpInvoice(c *gin.Context) {
	userId := c.GetInt("id")
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}

	if err = model.WithdrawTopUpInvoice(userId, id); err != nil {
		common.ApiError(c, err)
		return
	}

	common.ApiSuccess(c, nil)
}

func GetAllInvoices(c *gin.Context) {
	pageInfo := common.GetPageQuery(c)

	invoices, total, err := model.GetAllInvoices(pageInfo)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(invoices)
	common.ApiSuccess(c, pageInfo)
}

func AdminRejectInvoice(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}

	var req RejectTopUpInvoiceRequest
	if err = c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}

	if err = model.RejectTopUpInvoice(id, req.Reason); err != nil {
		common.ApiError(c, err)
		return
	}

	common.ApiSuccess(c, nil)
}

func sanitizeInvoiceFileName(name string) string {
	name = filepath.Base(strings.TrimSpace(name))
	name = strings.ReplaceAll(name, "\\", "_")
	if name == "" || name == "." || name == string(filepath.Separator) {
		return "invoice"
	}
	return name
}

func validateInvoiceUploadFile(name string, size int64) error {
	if size <= 0 {
		return errors.New("发票文件不能为空")
	}
	if size > 20*1024*1024 {
		return errors.New("发票文件不能超过 20MB")
	}

	switch strings.ToLower(filepath.Ext(name)) {
	case ".pdf", ".ofd", ".jpg", ".jpeg", ".png", ".zip":
		return nil
	default:
		return errors.New("仅支持上传 PDF、OFD、图片或 ZIP 发票文件")
	}
}

func AdminUploadInvoiceFile(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}

	file, err := c.FormFile("file")
	if err != nil {
		common.ApiError(c, errors.New("请选择要上传的发票文件"))
		return
	}

	fileName := sanitizeInvoiceFileName(file.Filename)
	if err = validateInvoiceUploadFile(fileName, file.Size); err != nil {
		common.ApiError(c, err)
		return
	}

	if err = os.MkdirAll(invoiceUploadDir, 0755); err != nil {
		common.ApiError(c, err)
		return
	}

	ext := strings.ToLower(filepath.Ext(fileName))
	dst := filepath.Join(invoiceUploadDir, fmt.Sprintf("invoice-%d-%d%s", id, common.GetTimestamp(), ext))
	if err = c.SaveUploadedFile(file, dst); err != nil {
		common.ApiError(c, err)
		return
	}

	invoice, err := model.MarkTopUpInvoiceIssued(id, dst, fileName)
	if err != nil {
		_ = os.Remove(dst)
		common.ApiError(c, err)
		return
	}

	common.ApiSuccess(c, invoice)
}

func sendInvoiceAttachment(c *gin.Context, invoice *model.TopUpInvoice) {
	if invoice == nil {
		common.ApiError(c, errors.New("发票申请不存在"))
		return
	}
	if invoice.Status != model.InvoiceStatusIssued && invoice.Status != model.InvoiceStatusApproved {
		common.ApiError(c, errors.New("发票尚未开具，暂不能下载"))
		return
	}
	if invoice.InvoiceFilePath == "" {
		common.ApiError(c, errors.New("管理员尚未上传发票文件"))
		return
	}
	if _, err := os.Stat(invoice.InvoiceFilePath); err != nil {
		common.ApiError(c, errors.New("发票文件不存在或已被移动"))
		return
	}
	fileName := invoice.InvoiceFileName
	if fileName == "" {
		fileName = filepath.Base(invoice.InvoiceFilePath)
	}
	c.FileAttachment(invoice.InvoiceFilePath, fileName)
}

func DownloadUserTopUpInvoice(c *gin.Context) {
	userId := c.GetInt("id")
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}

	invoice, err := model.GetUserInvoiceById(userId, id)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	sendInvoiceAttachment(c, invoice)
}

func AdminDownloadInvoice(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}

	invoice, err := model.GetInvoiceById(id)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	sendInvoiceAttachment(c, invoice)
}
