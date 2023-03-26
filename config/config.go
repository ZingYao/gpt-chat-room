package config

import (
	"os/user"
)

var (
	workDir     = ""
	currentUser *user.User
	requestKey  = ""
)

func GetWorkDir() string {
	var err error
	if workDir == "" {
		if currentUser == nil {
			currentUser, err = user.Current()
			if err != nil {
				panic(err)
			}
		}
		workDir = currentUser.HomeDir + WorkDir
	}
	return workDir
}

func GetUserName() string {
	var err error
	if currentUser == nil {
		currentUser, err = user.Current()
		if err != nil {
			panic(err)
		}
	}
	return currentUser.Username
}

func SetRequestKey(key string) {
	requestKey = key
}

func GetRequestKey() string {
	return requestKey
}
