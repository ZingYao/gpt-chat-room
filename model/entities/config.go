package entities

import "time"

type Config struct {
	UserName  string `gorm:"primarykey"`
	ApiKey    string
	ProxyAddr string
	CreatedAt time.Time
	UpdatedAt time.Time
}

func (Config) Table() string {
	return "config"
}
