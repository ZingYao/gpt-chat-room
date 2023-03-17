package entities

import "gorm.io/gorm"

type Conversation struct {
	gorm.Model
	Title string `gorm:"index"`
	UUID  string `gorm:"column:uuid;unique"`
}
