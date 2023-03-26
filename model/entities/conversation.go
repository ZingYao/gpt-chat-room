package entities

import "gorm.io/gorm"

type Conversation struct {
	gorm.Model
	Title            string `gorm:"index"`
	UUID             string `gorm:"column:uuid;unique"`
	CharacterSetting string `gorm:"column:character_setting"`
	ChatModel        string `gorm:"column:chat_model"`
}
