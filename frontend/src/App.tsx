import {useEffect, useState} from 'react';
import {marked} from 'marked';
import './App.css';
import {MessageGetList, OpenAiChat, OpenAiGetMaxToken, UtilMessageDialog} from "../wailsjs/go/main/App";
import {BrowserOpenURL, EventsOn} from '../wailsjs/runtime'
import {openai} from "../wailsjs/go/models";
import {entities} from "./models";
import hljs from "highlight.js"
import "highlight.js/styles/github.css"
import MenuView from './menu/MenuView';
import {Button, Col, Form, Input, Layout, message, Row, Select} from "antd";

const {Header, Footer, Content} = Layout
// @ts-ignore
window.BrowserOpenURL = BrowserOpenURL

function App() {
    const [messageApi, contextHolder] = message.useMessage()
    //会话列表
    let [conversationList, setConversationList] = useState<entities.Conversation[]>([])
    //当前会话id
    let [currentConversationId, setCurrentConversationId] = useState(-1)
    //聊天记录列表
    let [conversationMessageList, setConversationMessageList] = useState<openai.ChatCompletionMessage[]>([])
    //当前输入的问题
    let [currentQuestion, setCurrentQuestion] = useState("")
    let [overResponse, setOverResponse] = useState(true)
    let [conversationToken, setConversationToken] = useState("min")
    let maxToken = 512

    let [form] = Form.useForm();
    let [lastMsg, setLastMsg] = useState("")


    // 设置markdown高亮
    marked.setOptions({
        highlight: function (code, lang, callback) {
            return hljs.highlightAuto(code, [lang]).value
        }
    })

    //聊天页面定位到最下方
    useEffect(function () {
        setTimeout(() => {
            scrollToBottom()
        }, 100)
    }, [conversationMessageList, lastMsg])

    useEffect(() => {
        if (lastMsg == "") {
            return
        }
        let lm = conversationMessageList[conversationMessageList.length - 1]
        if (lm && lm.role == "assistant") {
            lm.content = lastMsg
            conversationMessageList[conversationMessageList.length - 1] = lm
        }
        setConversationMessageList(conversationMessageList)
    }, [lastMsg])


    EventsOn("stream-msg", (data: string) => {
        setLastMsg(data)
    })

    //变更会话
    useEffect(function () {
        if (currentConversationId >= conversationList.length) {
            setCurrentConversationId(0)
        }
        if (currentConversationId == -1) {
            return
        }
        let conversation = conversationList[currentConversationId]
        if (conversation.UUID == "") {
            UtilMessageDialog("error", "错误", `对话选择错误(${currentConversationId})`)
        }
        MessageGetList(conversation.UUID).then(l => setConversationMessageList(l))
        OpenAiGetMaxToken(conversation.ChatModel).then((t: number) => {
            maxToken = t
        })
    }, [currentConversationId, conversationList])
    //选择会话事件
    // @ts-ignore
    let onConversationChange = ({item, key, keyPath, selectedKeys, domEvent}) => {
        setCurrentConversationId(key)
    }

    //页面滑动到最下方
    let scrollToBottom = () => {
        let chatWindow = document.getElementById("chatWindow")
        if (chatWindow != null) {
            chatWindow.scrollTop = chatWindow.scrollHeight
        }
    }

    //提交问题
    let submitQuestion = () => {
        // 是否选择会话的判定
        if (currentConversationId == -1) {
            UtilMessageDialog("error", "错误", "请选择对话框后发起提问")
            return
        }
        let question = currentQuestion
        //消息是否为空的判定
        if (question.trim() == "") {
            messageApi.warning("请输入问题后提问")
            return;
        }
        //问题防止重复提问判定
        if (!overResponse) {
            messageApi.warning("上一个问题还没有解答完成，请稍后")
            return;
        }
        let token = 512
        switch (conversationToken) {
            case "mid":
                token = maxToken / 2
                break
            case "max":
                token = maxToken
        }
        setOverResponse(false)
        setLastMsg("")
        //获取当前会话信息
        let conversation = conversationList[currentConversationId]
        //添加会话信息
        conversationMessageList = conversationMessageList.concat([{role: "user", name: "fiona", content: question}])
        setConversationMessageList(conversationMessageList)
        setCurrentQuestion("")
        //提交会话请求
        OpenAiChat(conversation.UUID, question, token).then((res: string) => {
            setOverResponse(true)
            setConversationMessageList(conversationMessageList)
            setLastMsg("")
            if (res != "success") {
                messageApi.info(res)
            }
        })
        conversationMessageList = conversationMessageList.concat([{role: "assistant", name: "zing", content: ""}])
        //会话结果添加
        setConversationMessageList(conversationMessageList)
        form.resetFields()
    }

    return (
        <div style={{marginTop: "30px", marginBottom: "10px", overflow: "hidden", height: "calc(100vh - 40px)"}}
             className="canDrag"
             id="App">
            <Layout style={{height: "100vh"}}>
                <Layout.Sider style={{height: "100%", borderRight: "1px solid #fff"}}>
                    <MenuView onChange={onConversationChange} conversationList={conversationList}
                              defaultSelected={currentConversationId} setConversationList={setConversationList}
                              setCurrentConversationId={setCurrentConversationId}
                              currentConversationId={currentConversationId}/>
                </Layout.Sider>
                <Layout style={{height: "100vh", overflow: "hidden"}}>
                    <Header style={{height: "120px", marginTop: "-20px", backgroundColor: "#fff"}}>
                        <h1>{conversationList[currentConversationId]?.Title ?? "等待创建会话"}</h1>
                        <h5 style={{marginTop: "-60px"}}>会话模型:{conversationList[currentConversationId]?.ChatModel}</h5>
                        <h6 style={{
                            marginTop: "-40px",
                            lineHeight: "18px"
                        }}>会话人设:{conversationList[currentConversationId]?.CharacterSetting}</h6>
                    </Header>

                    <Content className="cantDrag">
                        <div id="chatWindow" style={{
                            width: "100%",
                            height: "calc(100vh - 210px)",
                            overflowY: "scroll",
                            padding: "10px"
                        }}>
                            <div className="messages" key="message">
                                {conversationMessageList.map((item, index) => {

                                    if (item.content.trim().length == 0) {
                                        return
                                    }
                                    switch (item.role) {
                                        case "assistant":
                                            // dangerouslySetInnerHTML={{__html: marked(item.content).replace('<a ','<a onclick="console.log("atag",this);return false;" ')}}
                                            return (<div key={index} className="message received"
                                                         dangerouslySetInnerHTML={{__html: marked(item.content).replace('<a ', '<a onclick=\'BrowserOpenURL(this.href);return false;\' ')}}
                                            >
                                                {/*{marked(item.content).replace('<a ','<a onClick="console.log("atag",this);return false;" ')}*/}
                                            </div>)
                                        case "user":
                                            return (
                                                <div key={index} className="message sent"
                                                     dangerouslySetInnerHTML={{__html: item.content}}>
                                                </div>)
                                        case "system":
                                            return (<></>)
                                    }
                                })}
                            </div>
                        </div>
                    </Content>
                    <Footer style={{height: "60px", marginBottom: "45px", backgroundColor: "rgba(200,200,200,1)"}}
                            className="cantDrag">
                        <Form layout="vertical" onFinish={submitQuestion} onKeyDown={(e) => {
                            if (e.keyCode == 13) {
                                if (e.altKey || e.metaKey) {
                                    setCurrentQuestion(currentQuestion + "\n")
                                    console.log(currentQuestion)
                                    return
                                }
                                console.log("提交", e)
                                form.submit()
                            }
                        }
                        } form={form}>
                            <Row>
                                <Col span={3} key="token">
                                    <Select value={conversationToken} defaultValue="min" placeholder="会话长度"
                                            onChange={(v) => setConversationToken(v ? v.toString() : "min")}
                                            options={[{
                                                value: "min",
                                                label: "少量"
                                            },
                                                {
                                                    value: "mid",
                                                    label: "中等"
                                                },
                                                {
                                                    value: "max",
                                                    label: "大量"
                                                }
                                            ]}>
                                    </Select>
                                </Col>
                                <Col span={19} key="input">
                                    <Input.TextArea autoSize={{minRows: 1, maxRows: 8}} value={currentQuestion}
                                                    onChange={(e) => {
                                                        setCurrentQuestion(e.target.value)
                                                    }
                                                    }
                                                    onPressEnter={(e) => {
                                                        e.preventDefault()
                                                    }
                                                    }
                                    />
                                </Col>
                                <Col span={2} key="senderBtn">
                                    <Form.Item style={{marginLeft: "5px", width: "100%"}}>
                                        <Button htmlType="submit" style={{width: "100%"}}
                                                disabled={currentConversationId == -1}>发送</Button>
                                    </Form.Item>
                                </Col>
                            </Row>
                        </Form>
                    </Footer>
                </Layout>
            </Layout>
        </div>
    )
}

export default App
