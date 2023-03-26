package router

import (
	//初始化openai连接
	"fiona_work_support/application/controller/conversation"
	"github.com/gin-gonic/gin"
)

func RegisterConversationRouter(group *gin.RouterGroup) {
	conversationController := conversation.NewConversationController()
	group.POST("/chat/stream", conversationController.ChatConversationStream)
}
