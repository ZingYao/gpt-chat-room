package conversation

import "github.com/sashabaranov/go-openai"

type (
	ChatReq struct {
		UUID     string `json:"uuid,omitempty" validate:"required"`
		Question string `json:"model,omitempty" validate:"required,checkModel"`
		Token    int    `json:"token,omitempty" validate:"required,checkToken"`
	}
	ChatRsp struct {
		Answer openai.ChatCompletionMessage
	}
)
