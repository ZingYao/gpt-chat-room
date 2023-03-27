package dao

import (
	"fiona_work_support/model/entities"
	"fiona_work_support/model/sqlite"
	"gorm.io/gorm"
)

func NewConfigDao() ConfigDao {
	return &configDao{db: sqlite.GetConn()}
}

type (
	ConfigDao interface {
		SetProxy(userName string, proxy string) error
		GetConfig(userName string) (entities.Config, error)
		SetConfig(userName string, config entities.Config) error
	}
	configDao struct {
		db *gorm.DB
	}
)

func (c configDao) SetProxy(userName string, proxy string) error {
	tx := c.db.Model(&entities.Config{}).Select("proxy_addr").Where("user_name = ?", userName).Updates(&entities.Config{ProxyAddr: proxy})
	return tx.Error
}

func (c configDao) GetConfig(userName string) (entities.Config, error) {
	var config entities.Config
	tx := c.db.Where(entities.Config{UserName: userName}).FirstOrCreate(&config)
	return config, tx.Error
}

func (c configDao) SetConfig(userName string, config entities.Config) error {
	tx := c.db.Model(&entities.Config{}).Where("user_name = ?", userName).Updates(config)
	return tx.Error
}
