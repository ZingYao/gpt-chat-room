package common

import (
	"github.com/sashabaranov/go-openai"
	"strings"
	"unicode/utf8"
)

func GetConversationListByToken(msgList []openai.ChatCompletionMessage, token int) ([]openai.ChatCompletionMessage, int) {
	var strList []string
	for _, item := range msgList {
		strList = append(strList, item.Content)
	}
	length := utf8.RuneCountInString(strings.Join(strList, ""))
	for i := 1; i <= len(strList); i++ {
		length = utf8.RuneCountInString(strings.Join(append(strList[i:], strList[0]), ""))
		if length <= token {
			return append(msgList[0:1], msgList[i:]...), length
		}
	}
	return msgList, length
}

func GetMaxToken(model string) int {
	maxToken := 0
	switch model {
	case openai.GPT432K0314, openai.GPT432K:
		maxToken = 32768
	case openai.GPT40314, openai.GPT4:
		maxToken = 8192
	case openai.GPT3Dot5Turbo0301, openai.GPT3Dot5Turbo, openai.GPT3TextDavinci003, openai.GPT3TextDavinci002:
		maxToken = 4097
	}
	return maxToken
}
