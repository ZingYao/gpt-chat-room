# GPT-3.5 Client

This is a GPT-3.5 client application built using the Wails framework with Golang for the backend and React for the frontend. This application allows you to interact with the GPT-3.5 API and generate human-like text.

## Features

- Easy-to-use interface to interact with the GPT-3.5 API
- Customizable GPT-3.5 API request parameters
- Save and load chat history
- Dark mode support

## Prerequisites

Before installing and running this application, make sure you have the following prerequisites:

- Go version 1.18 or higher
- Node.js version 15 or higher
- A valid GPT-3.5 API key

## Installation

To install and run this application, follow these steps:

1. Make sure you have a valid GPT-3.5 API key. You can get one from the OpenAI website.
2. Install Go version 1.18 or higher and Node.js version 15 or higher.
3. Run the following command to install Wails:
```shell
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```
4. Clone the repository and navigate to the project directory.
5. Install Go dependencies with `go get ./...`.
6. Install Node.js dependencies with `npm install`.

## Development

To run the application in development mode, use the following command:
```shell
wails dev
```

This will start the backend and frontend servers and open the application in your default web browser. Any changes you make to the code will be automatically reloaded.

## Build

To build the application as a production-ready version, use the following command:

```shell
wails build
```


This will generate a binary executable for your platform in the `./build` directory.

## Usage

When you run the application for the first time, you will be prompted to enter your GPT-3.5 API key. Once you have entered the API key, you can start using the application.

1. Type your message in the input box and press Enter to send it to GPT-3.5.
2. The generated response will appear in the chat window.
3. You can adjust the API request parameters by clicking on the "Settings" button.
4. You can save and load chat history by clicking on the "Save" and "Load" buttons.

## License

This software is licensed under the MIT License. See the LICENSE file for more information.

## Contributing

Contributions are welcome! Please follow the guidelines outlined in the CONTRIBUTING.md file.

## Acknowledgements

- Wails framework
- OpenAI GPT-3.5 API
