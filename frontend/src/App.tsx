import {useEffect, useState} from 'react';
import {marked} from 'marked';
import './App.css';
import {MessageGetList, OpenAiChat, UtilMessageDialog} from "../wailsjs/go/main/App";
import {EventsOn} from '../wailsjs/runtime/runtime'
import {Button, Col, Form, Input, Layout, MenuValue, MessagePlugin, Row} from 'tdesign-react'
import {openai} from "../wailsjs/go/models";
import {entities} from "./models";
import hljs from "highlight.js"
import "highlight.js/styles/github.css"
import MenuView from './menu/MenuView';

const {FormItem} = Form
const {Header, Aside, Footer, Content} = Layout

function App() {
    //会话列表
    let [conversationList, setConversationList] = useState<entities.Conversation[]>([])
    //当前会话id
    let [currentConversationId, setCurrentConversationId] = useState(-1)
    //聊天记录列表
    let [conversationMessageList, setConversationMessageList] = useState<openai.ChatCompletionMessage[]>([])
    //当前输入的问题
    let [currentQuestion, setCurrentQuestion] = useState("")
    let [overResponse,setOverResponse] = useState(true)

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
    }, [conversationMessageList,lastMsg])

    useEffect(() => {
        let lm = conversationMessageList[conversationMessageList.length - 1]
        if (lm && lm.role == "assistant") {
            lm.content = lastMsg
            conversationMessageList[conversationMessageList.length - 1] = lm
        }
        setConversationMessageList(conversationMessageList)
    }, [lastMsg])


    EventsOn("stream-msg", (data: string) => {
        setLastMsg(`${lastMsg}${data}`)
    })

    //变更会话
    useEffect(function () {
        if (currentConversationId == -1) {
            return
        }
        let conversation = conversationList[currentConversationId]
        if (conversation.UUID == "") {
            UtilMessageDialog("error", "错误", `对话选择错误(${currentConversationId})`)
        }
        MessageGetList(conversation.UUID).then(l => setConversationMessageList(l))
    }, [currentConversationId, conversationList])
    //选择会话事件
    let onConversationChange = (e: MenuValue) => {
        setCurrentConversationId(e.valueOf() as number)
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
        form.reset()
        //消息是否为空的判定
        if (question.trim() == "") {
            MessagePlugin.warning("请输入问题后提问")
            return;
        }
        //问题防止重复提问判定
        if (!overResponse) {
            MessagePlugin.warning("上一个问题还没有解答完成，请稍后")
            return;
        }
        setOverResponse(false)
        setLastMsg("")
        //获取当前会话信息
        let conversation = conversationList[currentConversationId]
        console.log("conversation",conversation)
        //添加会话信息
        conversationMessageList = conversationMessageList.concat([{role: "user", name: "fiona", content: question}])
        setConversationMessageList(conversationMessageList)
        //提交会话请求
        OpenAiChat(conversation.UUID, question, 2048).then((res: string) => {
            setOverResponse(true)
            setConversationMessageList(conversationMessageList)
            MessagePlugin.info(res)
        })
        conversationMessageList = conversationMessageList.concat([{role: "assistant", name: "zing", content: ""}])
        //会话结果添加
        setConversationMessageList(conversationMessageList)
    }

    return (
        <div style={{marginTop: "30px", marginBottom: "10px", overflow: "hidden", height: "calc(100vh - 40px)"}}
             className="canDrag"
             id="App">
            <Layout style={{height: "100vh"}}>
                <Aside style={{height: "100%", borderRight: "1px solid #fff"}}>
                    <MenuView onChange={onConversationChange} conversationList={conversationList}
                              defaultSelected={currentConversationId} setConversationList={setConversationList}
                              setCurrentConversationId={setCurrentConversationId}
                              currentConversationId={currentConversationId}/>
                </Aside>
                <Layout style={{height: "100vh"}}>
                    <Header style={{height: "80px"}}>
                        <h1>{conversationList[currentConversationId]?.Title ?? "等待创建会话"}</h1></Header>
                    <Content className="cantDrag">
                        <div id="chatWindow" style={{
                            width: "100%",
                            height: "calc(100vh - 230px)",
                            overflowY: "scroll",
                            padding: "10px"
                        }}>
                            <div className="messages">
                                {conversationMessageList.map((item, index) => {
                                    if (item.content.trim().length == 0) {
                                        return
                                    }
                                    switch (item.role) {
                                        case "assistant":
                                            return (<div key={index} className="message received"
                                                         dangerouslySetInnerHTML={{__html: marked(item.content)}}>
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
                    <Footer style={{height: "50px", marginBottom: "10px", backgroundColor: "rgba(250,250,250,1)"}}
                            className="cantDrag">
                        <Form layout="vertical" onSubmit={submitQuestion} form={form}>
                            <Row key="editor">
                                <Col span={11} key="input">
                                    <FormItem name="question">
                                        <Input value={currentQuestion} onChange={setCurrentQuestion}
                                               onEnter={submitQuestion}/>
                                    </FormItem>
                                </Col>
                                <Col span={1} key="senderBtn">
                                    <FormItem style={{marginLeft: "5px", width: "100%"}}>
                                        <Button theme="primary" type="submit" style={{width: "100%"}}
                                                disabled={currentConversationId == -1}>发送</Button>
                                    </FormItem>
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
