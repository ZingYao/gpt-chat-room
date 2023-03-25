package sqlite

import (
	"fiona_work_support/config"
	"fiona_work_support/model/entities"
	"fmt"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"os"
)

var dbDir string
var dbPath string

const dbFileName = "data.db"

var conn *gorm.DB

func init() {
	var err error
	dbDir = config.GetWorkDir()
	if _, err = os.Stat(dbDir); err != nil && os.IsNotExist(err) {
		err = os.MkdirAll(dbDir, os.FileMode(0755))
		if err != nil {
			panic(fmt.Sprintf("创建数据目录失败(%v)", err))
		}
	}
	dbPath = fmt.Sprintf("%s%c%s", dbDir, os.PathSeparator, dbFileName)
	if _, err = os.Stat(dbPath); err != nil && os.IsNotExist(err) {
		file, err := os.Create(dbPath)
		if err != nil {
			panic(fmt.Sprintf("创建数据文件失败(%v)", err))
		}
		file.Close()
	}
	conn, err = gorm.Open(sqlite.Open(fmt.Sprintf("%s?_pragma_key=%s", dbPath, "123345")))
	if err != nil {
		panic(fmt.Sprintf("打开数据库连接失败(%v)", err))
	}
	conn.AutoMigrate(&entities.Conversation{})
	conn.AutoMigrate(&entities.Message{})
	conn.AutoMigrate(&entities.Config{})
}

func GetConn() *gorm.DB {
	return conn
}
