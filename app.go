package main

import (
	"context"
	"fiona_work_support/model/dao"
	"fiona_work_support/model/entities"
	"fmt"
	"github.com/pkg/errors"
	"github.com/sashabaranov/go-openai"
	"github.com/wailsapp/wails/v2/pkg/menu"
	"github.com/wailsapp/wails/v2/pkg/menu/keys"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	"gorm.io/gorm"
	"log"
	"net/http"
	"net/url"
	"time"
)

// App struct
type App struct {
	ctx          context.Context
	client       *openai.Client
	openaiConfig openai.ClientConfig
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
	// 设置主题
	runtime.WindowSetSystemDefaultTheme(a.ctx)

	//设置菜单
	mainMenu := menu.NewMenu()
	//应用菜单
	appMenu := menu.AppMenu()
	//编辑菜单
	editMenu := menu.EditMenu()
	//菜单加入根
	mainMenu.Items = append(mainMenu.Items, appMenu, editMenu)
	//自定义设置菜单
	settingMenu := mainMenu.AddSubmenu("设置")
	settingMenu.AddText("设置ApiKey", keys.CmdOrCtrl("o"), func(data *menu.CallbackData) {
		runtime.LogInfof(ctx, "[menu] menu was selected:%q", data.MenuItem.Label)
		str, err := runtime.ClipboardGetText(ctx)
		if err != nil {
			runtime.MessageDialog(ctx, runtime.MessageDialogOptions{
				Type:    runtime.ErrorDialog,
				Title:   "错误",
				Message: "从剪切板中获取apikey失败",
			})
			return
		}
		runtime.LogInfof(ctx, "[menu] get clipboard context:%q", str)
		var proxy http.RoundTripper
		if a.openaiConfig.HTTPClient != nil {
			proxy = a.openaiConfig.HTTPClient.Transport
		}
		config := openai.DefaultConfig(str)
		config.HTTPClient.Transport = proxy
		a.openaiConfig = config
		a.client = openai.NewClientWithConfig(a.openaiConfig)
	})
	settingMenu.AddText("设置代理", keys.CmdOrCtrl("p"), func(data *menu.CallbackData) {
		if a.openaiConfig.HTTPClient == nil {
			runtime.MessageDialog(ctx, runtime.MessageDialogOptions{
				Type:    runtime.ErrorDialog,
				Title:   "错误",
				Message: fmt.Sprintf("请先配置Apikey"),
			})
		}
		runtime.LogInfof(ctx, "[menu] menu was selected:%q", data.MenuItem.Label)
		str, err := runtime.ClipboardGetText(ctx)
		if err != nil {
			runtime.MessageDialog(ctx, runtime.MessageDialogOptions{
				Type:    runtime.ErrorDialog,
				Title:   "错误",
				Message: fmt.Sprintf("从剪切板中获取代理失败(%v)", err),
			})
			return
		}
		runtime.LogInfof(ctx, "[menu] get clipboard context:%q", str)
		proxy, err := url.Parse(str)
		if err != nil {
			runtime.MessageDialog(ctx, runtime.MessageDialogOptions{
				Type:    runtime.ErrorDialog,
				Title:   "错误",
				Message: fmt.Sprintf("错误的代理:%q(%v)", str, err),
			})
			return
		}

		a.openaiConfig.HTTPClient.Transport = &http.Transport{
			Proxy:                 http.ProxyURL(proxy),
			MaxIdleConnsPerHost:   10,
			ResponseHeaderTimeout: time.Second * time.Duration(60),
		}
		a.client = openai.NewClientWithConfig(a.openaiConfig)
	})
	runtime.MenuSetApplicationMenu(ctx, mainMenu)
	conversationList = make(map[string]Conversation)
}

func (a *App) Conversation(uuid, title, question string) (result string) {
	messageDao := dao.NewMessageDao()
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
	messageDao.NewMessageBatch(conversation.id, uuid, conversation.list[len(conversation.list)-2:])
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
	conversationDao := dao.NewConversationDao()
	messageDao := dao.NewMessageDao()
	var currentConversation entities.Conversation
	if conversation, exists = conversationList[uuid]; !exists {
		total, cL, err := conversationDao.GetList("", uuid, 0, 1, 1)
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			runtime.MessageDialog(a.ctx, runtime.MessageDialogOptions{
				Type:    runtime.ErrorDialog,
				Title:   "错误",
				Message: "创建会话失败",
			})
			return conversation, err
		}
		if errors.Is(err, gorm.ErrRecordNotFound) || total == 0 {
			currentConversation, _ = conversationDao.NewOne(uuid, title)
		}
		if currentConversation.ID == 0 {
			currentConversation = cL[0]
		}
		msgList, err := messageDao.GetMessageListByUUID(uuid)
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
			messageDao.NewMessageBatch(currentConversation.ID, uuid, conversation.list)
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
	conversationDao := dao.NewConversationDao()
	_, conversationList, err := conversationDao.GetList("", "", 0, 1, 100)
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
