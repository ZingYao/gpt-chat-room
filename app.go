package main

import (
	"context"
	"fiona_work_support/config"
	"fiona_work_support/model/dao"
	"fiona_work_support/model/entities"
	"fmt"
	"github.com/pkg/errors"
	"github.com/sashabaranov/go-openai"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	"gorm.io/gorm"
	"log"
	"net/http"
	"net/url"
)

// App struct
type App struct {
	ctx             context.Context
	client          *openai.Client
	config          entities.Config
	userName        string
	messageDao      dao.MessageDao
	conversationDao dao.ConversationDao
	configDao       dao.ConfigDao
}

var conversationList map[string]Conversation

type Conversation struct {
	id   uint
	list []openai.ChatCompletionMessage
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	var err error
	// 设置主题
	runtime.WindowSetSystemDefaultTheme(a.ctx)
	conversationList = make(map[string]Conversation)
	a.configDao = dao.NewConfigDao()
	a.messageDao = dao.NewMessageDao()
	a.conversationDao = dao.NewConversationDao()
	a.userName = config.GetUserName()
	a.config, err = a.configDao.GetConfig(a.userName)
	if err != nil {
		panic(err)
	}
	a.reloadClient()
}

func (a *App) reloadClient() {
	openaiConfig := openai.DefaultConfig(a.config.ApiKey)
	proxy, err := url.Parse(a.config.ProxyAddr)
	if err == nil {
		openaiConfig.HTTPClient.Transport = &http.Transport{
			Proxy: http.ProxyURL(proxy),
		}
	} else {

		runtime.LogWarningf(a.ctx, "proxy %s parse failed %v", a.config.ProxyAddr, err)
	}
	a.client = openai.NewClientWithConfig(openaiConfig)
}

func (a *App) Conversation(uuid, title, question string) (result string) {
	var conversation Conversation
	if a.client == nil {
		runtime.MessageDialog(a.ctx, runtime.MessageDialogOptions{
			Type:    runtime.ErrorDialog,
			Title:   "配置出错",
			Message: fmt.Sprintf("请先配置ApiKey"),
		})
		return "请配置ApiKey后再试~"
	}
	conversation, err := a.getConversation(uuid, title)
	if err != nil {
		runtime.MessageDialog(a.ctx, runtime.MessageDialogOptions{
			Type:    runtime.ErrorDialog,
			Title:   "出错了",
			Message: fmt.Sprintf("获取会话出错(%v)", err),
		})
		return ""
	}
	conversation.list = append(conversation.list, openai.ChatCompletionMessage{
		Role:    openai.ChatMessageRoleUser,
		Content: question,
		Name:    "Fiona",
	})
	rsp, err := a.client.CreateChatCompletion(
		a.ctx,
		openai.ChatCompletionRequest{
			Model:     openai.GPT3Dot5Turbo,
			Messages:  conversation.list,
			MaxTokens: 1024,
		},
	)
	if err != nil {
		runtime.MessageDialog(a.ctx, runtime.MessageDialogOptions{
			Type:    runtime.ErrorDialog,
			Title:   "请求出错",
			Message: fmt.Sprintf("出错了(%v)", err),
		})
		log.Printf("[error] request to gpt-3 has an error(%v)", err)
		return ""
	}
	answer := rsp.Choices[0].Message
	answer.Name = "zing"
	conversation.list = append(conversation.list, answer)
	conversationList[uuid] = conversation
	a.messageDao.NewMessageBatch(conversation.id, uuid, conversation.list[len(conversation.list)-2:])
	fmt.Printf("question:%s\nanswer:%s\n", question, answer.Content)
	return answer.Content
}

func (a *App) MessageDialog(msgType, title, msg string) error {
	var dialogType runtime.DialogType
	switch msgType {
	case "error":
		dialogType = runtime.ErrorDialog
	default:
		runtime.LogError(a.ctx, fmt.Sprintf("unsupport type:%s", msgType))
	}
	_, err := runtime.MessageDialog(a.ctx, runtime.MessageDialogOptions{
		Type:    dialogType,
		Title:   title,
		Message: msg,
	})
	return err
}

func (a *App) getConversation(uuid, title string) (conversation Conversation, err error) {
	var exists bool
	var currentConversation entities.Conversation
	if conversation, exists = conversationList[uuid]; !exists {
		total, cL, err := a.conversationDao.GetList("", uuid, 0, 1, 1)
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			runtime.MessageDialog(a.ctx, runtime.MessageDialogOptions{
				Type:    runtime.ErrorDialog,
				Title:   "错误",
				Message: "创建会话失败",
			})
			return conversation, err
		}
		if errors.Is(err, gorm.ErrRecordNotFound) || total == 0 {
			currentConversation, _ = a.conversationDao.NewOne(uuid, title)
		}
		if currentConversation.ID == 0 {
			currentConversation = cL[0]
		}
		msgList, err := a.messageDao.GetMessageListByUUID(uuid)
		if err != nil || len(msgList) == 0 {
			conversation = Conversation{
				id: currentConversation.ID,
				list: []openai.ChatCompletionMessage{
					{
						Role:    openai.ChatMessageRoleSystem,
						Content: "所有的答复都使用markdown格式，尽可能多的使用emoji，emoji请直接发表情不要发送简码",
						Name:    "Administrator",
					},
				},
			}
			a.messageDao.NewMessageBatch(currentConversation.ID, uuid, conversation.list)
		} else {
			var l []openai.ChatCompletionMessage
			for _, item := range msgList {
				l = append(l, openai.ChatCompletionMessage{
					Role:    item.Role,
					Content: item.Content,
					Name:    item.Name,
				})
			}
			conversation = Conversation{
				id:   currentConversation.ID,
				list: l,
			}
		}
	}
	conversationList[uuid] = conversation
	return conversation, nil
}

func (a *App) GetMessageList(uuid, title string) []openai.ChatCompletionMessage {
	conversation, err := a.getConversation(uuid, title)
	if err != nil {
		runtime.MessageDialog(a.ctx, runtime.MessageDialogOptions{
			Type:    runtime.ErrorDialog,
			Title:   "出错了",
			Message: fmt.Sprintf("获取会话出错(%v)", err),
		})
		return make([]openai.ChatCompletionMessage, 0)
	}
	return conversation.list
}

func (a *App) GetConversationList() []entities.Conversation {
	_, conversationList, err := a.conversationDao.GetList("", "", 0, 1, 100)
	if err != nil {
		runtime.MessageDialog(a.ctx, runtime.MessageDialogOptions{
			Type:    runtime.ErrorDialog,
			Title:   "出错了",
			Message: fmt.Sprintf("获取会话列表出错(%v)", err),
		})
		return make([]entities.Conversation, 0)
	}
	return conversationList
}

func (a *App) GetConfig() entities.Config {
	return a.config
}

func (a *App) SetApiKey(apiKey string) bool {
	err := a.configDao.SetConfig(a.userName, entities.Config{ApiKey: apiKey})
	if err != nil {
		return false
	}
	a.config.ApiKey = apiKey
	a.reloadClient()
	return true
}

func (a *App) SetProxy(proxyAddr string) bool {
	err := a.configDao.SetConfig(a.userName, entities.Config{ProxyAddr: proxyAddr})
	if err != nil {
		return false
	}
	a.config.ProxyAddr = proxyAddr
	a.reloadClient()
	return true
}
