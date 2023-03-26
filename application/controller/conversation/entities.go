package conversation

import "github.com/sashabaranov/go-openai"

type (
	ChatReq struct {
		CharacterSetting string                         `json:"character_setting,omitempty" validate:"required"`
		Model            string                         `json:"model,omitempty" validate:"required,checkModel"`
		Token            int                            `json:"token,omitempty" validate:"required,checkToken"`
		ConversationList []openai.ChatCompletionMessage `json:"conversation_list,omitempty" validate:"required,gt=0"`
	}
	ChatRsp struct {
		Answer openai.ChatCompletionMessage
	}
)
