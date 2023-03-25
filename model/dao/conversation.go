package dao

import (
	"fiona_work_support/model/entities"
	"fiona_work_support/model/sqlite"
	"fmt"
	"github.com/labstack/gommon/log"
	"gorm.io/gorm"
)

func NewConversationDao() ConversationDao {
	return &conversationDao{db: sqlite.GetConn()}
}

type (
	ConversationDao interface {
		NewOne(uuid, title string) (record entities.Conversation, err error)
		GetList(title, uuid string, id, page, limit int) (total int64, cList []entities.Conversation, err error)
		DelOneByUUID(uuid string) error
		UpdateConversation(uuid string, conversation entities.Conversation) error
	}
	conversationDao struct {
		db *gorm.DB
	}
)

func (c *conversationDao) UpdateConversation(uuid string, conversation entities.Conversation) error {
	tx := c.db.Model(&entities.Conversation{}).Where("uuid = ?", uuid).Updates(conversation)
	return tx.Error
}

func (c *conversationDao) NewOne(uuid, title string) (record entities.Conversation, err error) {
	record.UUID = uuid
	record.Title = title
	rsp := c.db.Create(&record)
	if rsp.Error != nil {
		log.Infof("create conversationDao has an error(%v)", rsp.Error)
		err = rsp.Error
	}
	return
}

func (c *conversationDao) GetList(title, uuid string, id, page, limit int) (total int64, cList []entities.Conversation, err error) {
	query := c.db.Model(&entities.Conversation{})
	if title != "" {
		query = query.Where("title like ?", fmt.Sprintf("%%%s%%", title))
	}
	if uuid != "" {
		query = query.Where("uuid = ?", uuid)
	}
	if id != 0 {
		query = query.Where("id = ?", id)
	}
	rsp := query.Count(&total)
	if rsp.Error != nil {
		err = rsp.Error
		return
	}
	rsp = c.db.Offset((page - 1) * limit).Limit(limit).Find(&cList).Find(&cList)
	if rsp.Error != nil {
		err = rsp.Error
		return
	}
	return
}

func (c *conversationDao) DelOneByUUID(uuid string) error {
	rsp := c.db.Where("uuid = ? ", uuid).Delete(&entities.Conversation{})
	if rsp.Error != nil {
		return rsp.Error
	}
	return nil
}
