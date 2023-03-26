package conversation

import (
	"fiona_work_support/application"
	"fiona_work_support/application/service"

	"github.com/gin-gonic/gin"
)

func NewConversationController() Controller {
	return &controller{
		conversationService: service.NewConversationService(),
	}
}

type (
	Controller interface {
		ChatConversationStream(ctx *gin.Context)
	}
	controller struct {
		conversationService service.ConversationService
	}
)

func (l controller) ChatConversationStream(ctx *gin.Context) {
	var param = ChatReq{}
	var err error
	if err = ctx.BindJSON(&param); err != nil {
		application.ReturnJson(ctx, "", err)
		return
	}
	ctx.Header("Content-Type", "text/event-stream")
	ctx.Header("Cache-Control", "no-cache")
	ctx.Header("Connection", "keep-alive")
	err = l.conversationService.ChatConversationStream(ctx, param.UUID, param.Question, param.Token)
	if err != nil {
		ctx.String(200, err.Error())
		return
	}
}
