package middleware

import (
	"fiona_work_support/config"
	"github.com/gin-gonic/gin"
	"net/http"
)

func RequestFilter(ctx *gin.Context) {
	auth := ctx.GetHeader("Authorization")
	if auth != config.GetRequestKey() {
		ctx.Status(http.StatusForbidden)
		return
	}
	ctx.Next()
}
