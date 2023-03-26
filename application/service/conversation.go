package service

import (
	"fiona_work_support/application/ai_connect"

	"github.com/gin-gonic/gin"
	"github.com/sashabaranov/go-openai"
)

func NewConversationService() ConversationService {
	return &conversationService{
		client: ai_connect.GetOpenAiClient(),
	}
}

type (
	ConversationService interface {
		ChatConversationStream(ctx *gin.Context, uuid, question string, token int) (err error)
	}
	conversationService struct {
		client *openai.Client
	}
)

func (c conversationService) ChatConversationStream(ctx *gin.Context, uuid, question string, token int) (err error) {

	// msgList := []openai.ChatCompletionMessage{{
	// 	Role:    openai.ChatMessageRoleSystem,
	// 	Content: characterSetting,
	// 	Name:    "system",
	// }}
	// for _, item := range chatList {
	// 	switch item.Role {
	// 	case openai.ChatMessageRoleAssistant, openai.ChatMessageRoleSystem, openai.ChatMessageRoleUser:
	// 	default:
	// 		item.Role = "third party"
	// 	}
	// 	msgList = append(msgList, openai.ChatCompletionMessage{
	// 		Role:    item.Role,
	// 		Content: item.Content,
	// 		Name:    item.Name,
	// 	})
	// }
	// maxToken := common.GetMaxToken(model)
	// msgList, length := common.GetConversationListByToken(msgList, maxToken-token)
	// if maxToken-token-length <= 0 {
	// 	return fmt.Errorf("会话长度不够")
	// }
	// if len(msgList) == 1 {
	// 	return fmt.Errorf("会话长度不够")
	// }
	// stream, err := c.client.CreateChatCompletionStream(context.Background(), openai.ChatCompletionRequest{
	// 	Model:     model,
	// 	Messages:  msgList,
	// 	MaxTokens: token,
	// })
	// if err != nil {
	// 	return fmt.Errorf("openai出错了(%v)", err)
	// }
	// defer stream.Close()
	// for {
	// 	response, err := stream.Recv()
	// 	if err != nil {
	// 		if errors.Is(err, io.EOF) {
	// 			return nil
	// 		}
	// 		return fmt.Errorf("openai出错了(%v)", err)
	// 	}
	// 	_, _ = ctx.Writer.WriteString(response.Choices[0].Delta.Content)
	// 	ctx.Writer.Flush()
	// }
	return nil
}
