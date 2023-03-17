package dao

import (
	"fiona_work_support/model/entities"
	"fiona_work_support/model/sqlite"
	"github.com/sashabaranov/go-openai"
	"gorm.io/gorm"
)

type (
	Message interface {
		NewMessageBatch(cid uint, uuid string, data []openai.ChatCompletionMessage) error
		GetMessageListByUUID(uuid string) (list []entities.Message, err error)
	}
	message struct {
		db *gorm.DB
	}
)

func NewMessageDao() Message {
	return &message{db: sqlite.GetConn()}
}

func (m *message) NewMessageBatch(cid uint, uuid string, data []openai.ChatCompletionMessage) error {
	var msg []entities.Message
	for _, item := range data {
		msg = append(msg, entities.Message{
			CID:     cid,
			CUUID:   uuid,
			Role:    item.Role,
			Name:    item.Name,
			Content: item.Content,
		})
	}
	rsp := m.db.CreateInBatches(msg, 128)
	if rsp.Error != nil {
		return rsp.Error
	}
	return nil
}

func (m *message) GetMessageListByUUID(uuid string) (list []entities.Message, err error) {
	rsp := m.db.Where("cuuid = ?", uuid).Find(&list)
	if rsp.Error != nil {
		err = rsp.Error
		return
	}
	return
}
