package entities

import "gorm.io/gorm"

type Message struct {
	gorm.Model
	CID       uint   `gorm:"column:cid;index"`
	CUUID     string `gorm:"column:cuuid;index"`
	Role      string `gorm:"index"`
	Name      string `gorm:"index"`
	Content   string `gorm:"type:text"`
	Type      string
	OtherData string `gorm:"type:text"`
}
