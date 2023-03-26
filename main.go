package main

import (
	"embed"
	"fiona_work_support/application/router"
	"fiona_work_support/config"
	"fiona_work_support/middleware"
	_ "fiona_work_support/model/sqlite"
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/labstack/gommon/log"
	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/logger"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/mac"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
	"net/http"
	"time"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	// Create an instance of the app structure
	app := NewApp()

	// Create application with options
	err := wails.Run(&options.App{
		Title:  "",
		Width:  1024,
		Height: 768,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup:        app.startup,
		Windows: &windows.Options{
			WebviewIsTransparent: true,
			WindowIsTranslucent:  true,
			BackdropType:         windows.Auto,
		},
		Mac: &mac.Options{
			TitleBar: &mac.TitleBar{
				TitlebarAppearsTransparent: true,
				FullSizeContent:            true,
				UseToolbar:                 true,
			},
			Appearance:           mac.NSAppearanceNameAccessibilityHighContrastVibrantLight,
			WebviewIsTransparent: true,
			WindowIsTranslucent:  true,
			About: &mac.AboutInfo{
				Title:   "关于",
				Message: "本工具用于支持电商运营相关工作\n© 2023 by zing",
				Icon:    nil,
			},
		},
		Logger: logger.NewFileLogger(fmt.Sprintf("%s/%s.log", config.GetWorkDir(), time.Now().Format("20060102"))),
		Bind: []interface{}{
			app,
		},
		Debug: options.Debug{
			OpenInspectorOnStartup: true,
		},
	})
	go startCgiService()

	if err != nil {
		println("Error:", err.Error())
	}
}

func startCgiService() {
	// 日志不打印色彩
	gin.DisableConsoleColor()

	gin.SetMode("release")

	r := gin.New()

	r.Use(middleware.RequestFilter)

	apiGroup := r.Group("/api")
	{
		v1Group := apiGroup.Group("/v1")
		router.RegisterConversationRouter(v1Group)
	}

	srv := &http.Server{
		Addr:    ":11380",
		Handler: r,
	}

	go func() {
		// 服务连接
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %s\n", err)
		}
	}()
}
