package main

import (
	"context"
	"fiona_work_support/common"
	"fiona_work_support/config"
	"fiona_work_support/model/dao"
	"fiona_work_support/model/entities"
	"fmt"
	"github.com/google/uuid"
	"github.com/pkg/errors"
	"github.com/sashabaranov/go-openai"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	"gorm.io/gorm"
	"io"
	"io/ioutil"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"
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
	id    uint
	model string
	list  []openai.ChatCompletionMessage
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
	config.SetRequestKey(uuid.New().String())
}

func (a *App) reloadClient() {
	openaiConfig := openai.DefaultConfig(a.config.ApiKey)
	if a.config.ProxyAddr != "" {
		proxy, err := url.Parse(a.config.ProxyAddr)
		if err == nil {
			openaiConfig.HTTPClient.Transport = &http.Transport{
				Proxy: http.ProxyURL(proxy),
			}
		} else {
			runtime.LogWarningf(a.ctx, "proxy %s parse failed %v", a.config.ProxyAddr, err)
		}
	}
	a.client = openai.NewClientWithConfig(openaiConfig)
}

func (a *App) OpenAiChat(uuid, question string, token int) (result string) {
	// 判断是否已经配置了OpenAI的apiKey，如果没有则提示用户需要配置
	if a.client == nil {
		runtime.MessageDialog(a.ctx, runtime.MessageDialogOptions{
			Type:    runtime.ErrorDialog,
			Title:   "配置出错",
			Message: fmt.Sprintf("请先配置ApiKey"),
		})
		return "请配置ApiKey后再试~"
	}

	// 获取本次会话的历史记录
	conversation, err := a.getConversation(uuid)
	if err != nil {
		return ""
	}

	// 将用户的问题添加到历史记录列表中
	conversation.list = append(conversation.list, openai.ChatCompletionMessage{
		Role:    openai.ChatMessageRoleUser,
		Content: question,
		Name:    "user",
	})

	var length int
	// 获取当前模型的最大token数量
	maxToken := common.GetMaxToken(conversation.model)
	// 根据历史记录的长度以及请求的token数量获取历史记录列表
	conversation.list, length = common.GetConversationListByToken(conversation.list, maxToken-token)

	// 如果获取到的历史记录过短，则返回错误信息
	if maxToken-token-length <= 0 {
		return "会话响应长度过短"
	}

	// 如果历史记录过长，则返回错误信息
	if len(conversation.list) == 1 {
		return "会话过长，请新建会话后重试"
	}

	// 连接OpenAI Chat Completion API，并发送请求，等待响应
	stream, err := a.client.CreateChatCompletionStream(
		a.ctx,
		openai.ChatCompletionRequest{
			Model:     openai.GPT3Dot5Turbo, // 模型选择
			Messages:  conversation.list,    // 历史记录列表
			MaxTokens: 1024,                 // 最大token数量
		},
	)
	if err != nil {
		// 如果连接或请求出错，则弹出错误提示框
		runtime.MessageDialog(a.ctx, runtime.MessageDialogOptions{
			Type:    runtime.ErrorDialog,
			Title:   "请求出错",
			Message: fmt.Sprintf("出错了(%v)", err),
		})
		log.Printf("[error] request to gpt-3 has an error(%v)", err)
		return ""
	}
	defer stream.Close()

	var msg string
	// 开启goroutine来定时发送消息
	go func() {
		for {
			runtime.EventsEmit(a.ctx, "stream-msg", msg) // 触发事件传递消息
			if err != nil {
				return
			}
			time.Sleep(300 * time.Millisecond)
		}
	}()

	// 获取OpenAI API的响应
	for {
		var response openai.ChatCompletionStreamResponse
		response, err = stream.Recv()
		if err != nil {
			if errors.Is(err, io.EOF) {
				break
			}
			return fmt.Sprintf("openai返回了一个错误(%v)", err)
		}
		msg = msg + response.Choices[0].Delta.Content
	}

	// 创建聊天机器人的回复，并添加到历史记录列表中
	answer := openai.ChatCompletionMessage{
		Role:    openai.ChatMessageRoleAssistant,
		Content: msg,
		Name:    openai.ChatMessageRoleAssistant,
	}
	answer.Name = openai.ChatMessageRoleAssistant
	conversation.list = append(conversation.list, answer)
	// 更新历史记录，并将机器人的回答存储到数据库中
	conversationList[uuid] = conversation
	a.messageDao.NewMessageBatch(conversation.id, uuid, conversation.list[len(conversation.list)-2:])
	time.Sleep(300 * time.Millisecond)

	return "success"
}

func (a *App) OpenAiGetModelList() []string {
	rsp, err := a.client.ListModels(a.ctx)
	if err != nil {
		return make([]string, 0)
	}
	modelList := make([]string, 0)
	for _, item := range rsp.Models {
		if strings.Contains(item.Root, "3.5") || strings.Contains(item.Root, "gpt-4") {
			modelList = append(modelList, item.Root)
		}
	}
	return modelList
}

func (a *App) OpenAiGetMaxToken(model string) int {
	return common.GetMaxToken(model)
}

func (a *App) UtilMessageDialog(msgType, title, msg string) error {
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

func (a *App) UtilCheckProxy(proxyAddr string, webAddr string) string {
	client := http.DefaultClient
	if proxyAddr != "" {
		proxyUrl, err := url.Parse(proxyAddr)
		if err != nil {
			return fmt.Sprintf("代理地址解析出错(%v)", err)
		}
		client.Transport = &http.Transport{Proxy: http.ProxyURL(proxyUrl)}
	}
	req, err := http.NewRequestWithContext(a.ctx, http.MethodGet, webAddr, nil)
	if err != nil {
		return fmt.Sprintf("新建请求出错(%v)", err)
	}
	rsp, err := client.Do(req)
	if err != nil {
		return fmt.Sprintf("请求出错(%v)", err)
	}
	defer rsp.Body.Close()
	body, err := ioutil.ReadAll(rsp.Body)
	if err != nil {
		return fmt.Sprintf("获取请求结果正文失败(%v)", err)
	}
	if rsp.StatusCode == 200 {
		body = []byte("success")
	}
	return fmt.Sprintf("[%d]%s", rsp.StatusCode, string(body))
}

func (a *App) getConversation(uuid string) (conversation Conversation, err error) {
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
			return conversation, fmt.Errorf("conversation:%s not exists(%v)", uuid, err)
		}
		if cL[0].ID != 0 {
			currentConversation = cL[0]
		} else {
			fmt.Printf("uuid:%s can't find conversation", uuid)
		}
		msgList, err := a.messageDao.GetMessageListByUUID(uuid)
		l := []openai.ChatCompletionMessage{{
			Role:    openai.ChatMessageRoleSystem,
			Content: currentConversation.CharacterSetting,
			Name:    "system",
		}}
		for _, item := range msgList {
			l = append(l, openai.ChatCompletionMessage{
				Role:    item.Role,
				Content: item.Content,
				Name:    item.Name,
			})
		}
		conversation = Conversation{
			id:    currentConversation.ID,
			model: currentConversation.ChatModel,
			list:  l,
		}
	}

	conversationList[uuid] = conversation
	return conversation, nil
}

func (a *App) MessageGetList(uuid string) []openai.ChatCompletionMessage {
	conversation, err := a.getConversation(uuid)
	if err != nil {
		return make([]openai.ChatCompletionMessage, 0)
	}
	return conversation.list
}

func (a *App) ConversationGetList() []entities.Conversation {
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

func (a *App) ConversationCreate(uuid, title, characterSetting, model string) string {
	conversation, err := a.conversationDao.NewOne(uuid, title, characterSetting, model)
	if err != nil {
		return err.Error()
	}
	conversationList[uuid] = Conversation{
		id:    conversation.ID,
		model: model,
		list: []openai.ChatCompletionMessage{
			{
				Role:    openai.ChatMessageRoleSystem,
				Content: characterSetting,
				Name:    openai.ChatMessageRoleSystem,
			},
		},
	}
	return "会话创建成功"
}

func (a *App) ConfigGet() entities.Config {
	return a.config
}

func (a *App) ConfigSetApiKey(apiKey string) bool {
	err := a.configDao.SetConfig(a.userName, entities.Config{ApiKey: apiKey})
	if err != nil {
		return false
	}
	a.config.ApiKey = apiKey
	a.reloadClient()
	return true
}

func (a *App) ConfigSetProxy(proxyAddr string) bool {
	err := a.configDao.SetProxy(a.userName, proxyAddr)
	if err != nil {
		return false
	}
	a.config.ProxyAddr = proxyAddr
	a.reloadClient()
	return true
}

func (a *App) ConfigGetRequestKey() string {
	return config.GetRequestKey()
}

func (a *App) ConversationDelete(uuid string) string {
	err := a.messageDao.DeleteByUUID(uuid)
	if err != nil {
		return err.Error()
	}
	err = a.conversationDao.DelOneByUUID(uuid)
	if err != nil {
		return err.Error()
	}
	return ""
}

func (a *App) ConversationRename(uuid string, title string) string {
	err := a.conversationDao.UpdateConversation(uuid, entities.Conversation{Title: title})
	if err != nil {
		return err.Error()
	}
	return ""
}
