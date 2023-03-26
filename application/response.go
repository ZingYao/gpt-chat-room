package application

import (
	"github.com/gin-gonic/gin"
)

func ReturnJson(ctx *gin.Context, msg string, err error, data ...interface{}) {
	rspMap := map[string]interface{}{
		"ret": 0,
		"msg": msg,
	}
	if err != nil {
		rspMap["ret"] = 1
		rspMap["msg"] = err.Error()
	}
	switch len(data) {
	case 0:
		rspMap["data"] = nil
	case 1:
		rspMap["data"] = data[0]
	case 2:
		rspMap["data"] = data
	}
	ctx.JSON(200, rspMap)
	ctx.Abort()
}
