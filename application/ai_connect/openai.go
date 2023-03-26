package ai_connect

import (
	"github.com/sashabaranov/go-openai"
)

var client *openai.Client

func SetClient(c *openai.Client) {
	client = c
}

func GetOpenAiClient() *openai.Client {
	return client
}
