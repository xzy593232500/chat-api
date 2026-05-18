package controller

import (
    "net/http"

    "github.com/QuantumNous/new-api/common"
    "github.com/QuantumNous/new-api/model"
    "github.com/gin-gonic/gin"
)

type CreateTopUpInvoiceRequest struct {
    TopUpIds    []int  `json:"topup_ids" binding:"required"`
    CompanyName string `json:"company_name" binding:"required"`
    TaxNo       string `json:"tax_no" binding:"required"`
    Content     string `json:"content" binding:"required"`
    Remark      string `json:"remark"`
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
