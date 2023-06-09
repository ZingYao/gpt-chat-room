import {useEffect, useState} from 'react';
import {marked} from 'marked';
import './App.css';
import {MessageGetList, OpenAiChat, OpenAiGetMaxToken, UtilMessageDialog,} from '../wailsjs/go/main/App';
import {BrowserOpenURL, ClipboardSetText, EventsOn} from '../wailsjs/runtime';
import {
    Button,
    Col,
    Form,
    InputValue,
    Layout,
    MenuValue,
    MessagePlugin,
    Popup,
    Row,
    Select,
    Textarea,
} from 'tdesign-react';
import {openai} from '../wailsjs/go/models';
import {entities} from './models';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark-reasonable.css';
import MenuView from './menu/MenuView';
import Option from 'tdesign-react/es/select/base/Option';

const {FormItem} = Form;
const {Header, Aside, Footer, Content} = Layout;
// @ts-ignore
window.BrowserOpenURL = BrowserOpenURL;
// @ts-ignore
window.ClipboardSetText = function (dom) {
    // 获取要复制的节点
    const copyElem = dom.parentNode.parentNode.lastChild;
    console.log(copyElem)
    // 创建 range 对象
    const range = document.createRange();
    copyElem && range.selectNode(copyElem);
    // 将 range 对象添加到 selection 对象中
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    let content = selection?.toString()
    selection?.removeAllRanges()
    if (!content) {
        MessagePlugin.warning("复制失败,内容为空")
        return
    }
    ClipboardSetText(content).then(() => {
        MessagePlugin.success("复制成功")
    }).catch((e) => {
        MessagePlugin.warning("复制失败")
        console.log("copy failed", e)
    })
    // 复制选择的内容到系统剪切板
    // document.execCommand("copy");
    // alert("已复制");

    // let codeDom =dom.parentNode.parentNode
    // let str = ""
    // for (let i = 1;i<codeDom.childNodes.length;i++) {
    //   let node = codeDom.childNodes[i]
    //   str = `${str}${node.innerHTML??node.innerText}`
    // }
    // codeDom.execCommand("copy")
    // ClipboardSetText(str).then(()=>{
    //   MessagePlugin.success("复制成功")
    // }).catch((e)=> {
    //   MessagePlugin.warning("复制失败")
    //   console.log("copy failed",e)
    // })
}

function App() {
    //会话列表
    let [conversationList, setConversationList] = useState<
        entities.Conversation[]
    >([]);
    //当前会话id
    let [currentConversationId, setCurrentConversationId] = useState(-1);
    //聊天记录列表
    let [conversationMessageList, setConversationMessageList] = useState<
        openai.ChatCompletionMessage[]
    >([]);
    //当前输入的问题
    let [currentQuestion, setCurrentQuestion] = useState('');
    let [overResponse, setOverResponse] = useState(true);
    let [conversationToken, setConversationToken] = useState('min');
    let [onRecv, setOnRecv] = useState(false);
    let maxToken = 512;

    let [form] = Form.useForm();
    let [lastMsg, setLastMsg] = useState('');
    // 设置markdown高亮
    marked.setOptions({
        highlight: function (code, lang) {
            let value = hljs.highlightAuto(code, [lang]).value
            value = `${value}`
            return value;
        },
    });

    //聊天页面定位到最下方
    useEffect(
        function () {
            setTimeout(() => {
                scrollToBottom();
            }, 100);
        },
        [conversationMessageList, lastMsg]
    );

    useEffect(() => {
        if (lastMsg == '') {
            return;
        }
        let lm = conversationMessageList[conversationMessageList.length - 1];
        if (lm && lm.role == 'assistant') {
            lm.content = lastMsg;
            conversationMessageList[conversationMessageList.length - 1] = lm;
        }
        setConversationMessageList(conversationMessageList);
    }, [lastMsg]);

    EventsOn('stream-msg', (data: string) => {
        setLastMsg(data);
    });

    //变更会话
    useEffect(
        function () {
            if (currentConversationId >= conversationList.length) {
                setCurrentConversationId(0);
            }
            if (currentConversationId == -1) {
                return;
            }
            let conversation = conversationList[currentConversationId];
            if (conversation.UUID == '') {
                UtilMessageDialog(
                    'error',
                    '错误',
                    `对话选择错误(${currentConversationId})`
                );
            }
            MessageGetList(conversation.UUID).then((l) =>
                setConversationMessageList(l)
            );
            OpenAiGetMaxToken(conversation.ChatModel).then((t: number) => {
                maxToken = t;
            });
        },
        [currentConversationId, conversationList]
    );
    //选择会话事件
    let onConversationChange = (e: MenuValue) => {
        setCurrentConversationId(e.valueOf() as number);
    };

    //页面滑动到最下方
    let scrollToBottom = () => {
        let chatWindow = document.getElementById('chatWindow');
        if (chatWindow != null) {
            chatWindow.scrollTop = chatWindow.scrollHeight;
        }
    };

    //提交问题
    let submitQuestion = () => {
        // 是否选择会话的判定
        if (currentConversationId == -1) {
            UtilMessageDialog('error', '错误', '请选择对话框后发起提问');
            return;
        }
        let question = currentQuestion;
        //消息是否为空的判定
        if (question.trim() == '') {
            MessagePlugin.warning('请输入问题后提问');
            return;
        }
        //问题防止重复提问判定
        if (!overResponse) {
            MessagePlugin.warning('上一个问题还没有解答完成，请稍后');
            return;
        }
        let token = 512;
        switch (conversationToken) {
            case 'mid':
                token = maxToken / 2;
                break;
            case 'max':
                token = maxToken;
        }
        setOverResponse(false);
        setLastMsg('');
        //获取当前会话信息
        let conversation = conversationList[currentConversationId];
        //添加会话信息
        conversationMessageList = conversationMessageList.concat([
            {role: 'user', name: 'fiona', content: question},
        ]);
        setConversationMessageList(conversationMessageList);
        setCurrentQuestion('');
        setOnRecv(true);
        //提交会话请求
        OpenAiChat(conversation.UUID, question, token).then((res: string) => {
            setOverResponse(true);
            setConversationMessageList(conversationMessageList);
            setLastMsg('');
            if (res != 'success') {
                MessagePlugin.info(res);
            }
            setOnRecv(false);
        });
        conversationMessageList = conversationMessageList.concat([
            {role: 'assistant', name: 'zing', content: ''},
        ]);
        //会话结果添加
        setConversationMessageList(conversationMessageList);
        form.reset();
    };

    return (
        <div
            style={{
                marginTop: '30px',
                marginBottom: '10px',
                overflow: 'hidden',
                height: 'calc(100vh - 40px)',
            }}
            className="canDrag"
            id="App"
        >
            <Layout style={{height: '100vh'}}>
                <Aside style={{height: '100%', borderRight: '1px solid #fff'}}>
                    <MenuView
                        onChange={onConversationChange}
                        conversationList={conversationList}
                        defaultSelected={currentConversationId}
                        setConversationList={setConversationList}
                        setCurrentConversationId={setCurrentConversationId}
                        currentConversationId={currentConversationId}
                    />
                </Aside>
                <Layout style={{height: '100vh', overflow: 'hidden'}}>
                    <Header style={{height: '70px'}}>
                        <Popup
                            overlayStyle={{width: '75%', marginRight: '30px'}}
                            content={
                                <>
                                    <h2>
                                        会话模型:
                                        {conversationList[currentConversationId]?.ChatModel}
                                    </h2>
                                    <h3>
                                        会话人设:
                                        {conversationList[currentConversationId]?.CharacterSetting}
                                    </h3>
                                </>
                            }
                        >
                            <h1>
                                {conversationList[currentConversationId]?.Title ??
                                    '等待创建会话'}
                            </h1>
                        </Popup>
                    </Header>

                    <Content className="cantDrag">
                        <div
                            id="chatWindow"
                            style={{
                                width: '100%',
                                height: 'calc(100vh - 200px)',
                                overflowY: 'scroll',
                                padding: '10px',
                            }}
                        >
                            <div className="messages" key="message">
                                {conversationMessageList.map((item, index) => {
                                    if (item.content.trim().length == 0) {
                                        return;
                                    }
                                    switch (item.role) {
                                        case 'assistant':
                                            // dangerouslySetInnerHTML={{__html: marked(item.content).replace('<a ','<a onclick="console.log("atag",this);return false;" ')}}
                                            return (
                                                <div
                                                    key={index}
                                                    className="message received"
                                                    dangerouslySetInnerHTML={{
                                                        __html: (() => {
                                                            const markStr: string = marked(item.content).replaceAll(
                                                                '<a ',
                                                                "<a onclick='BrowserOpenURL(this.href);return false;' "
                                                            );

                                                            const divTag = document.createElement('div');
                                                            divTag.innerHTML = markStr.trim();
                                                            for (let i = 0; i < divTag.childNodes.length; i++) {
                                                                let preTag = divTag.childNodes.item(i)
                                                                if (preTag.nodeName.toLowerCase() == "pre") {
                                                                    let codeTag = preTag.lastChild
                                                                    if (!codeTag) {
                                                                        break
                                                                    }
                                                                    // @ts-ignore
                                                                    let language = codeTag.getAttribute("class")?.replace("language-", "")
                                                                    let codeBar = document.createElement("div")
                                                                    codeBar.className = "code-bar"
                                                                    codeBar.innerHTML = `<span>${language}</span><button style="font-size: small" onclick="ClipboardSetText(this)">复制</button>`
                                                                    // @ts-ignore
                                                                    preTag.innerHTML = codeBar.outerHTML + codeTag.outerHTML
                                                                    // try {
                                                                    //     divTag.childNodes[i] = preTag
                                                                    // } catch (e) {
                                                                    //     console.log("err",e,divTag.childNodes[,i)
                                                                    // }
                                                                }
                                                            }
                                                            if (
                                                                index == conversationMessageList.length - 1 &&
                                                                onRecv
                                                            ) {

                                                                if (divTag.lastChild != null) {
                                                                    const lastChild =
                                                                        divTag.lastChild as HTMLElement;
                                                                    lastChild.classList?.add('cursor');
                                                                }
                                                                return divTag.innerHTML;
                                                            }
                                                            return divTag.innerHTML;
                                                        })(),
                                                    }}
                                                ></div>
                                            );
                                        case 'user':
                                            return (
                                                <div
                                                    key={index}
                                                    className="message sent"
                                                    dangerouslySetInnerHTML={{
                                                        __html: marked(item.content.replaceAll('\n', '<br />'))
                                                            .replaceAll(
                                                                '<a ',
                                                                "<a onclick='BrowserOpenURL(this.href);return false;' "
                                                            ),
                                                    }}
                                                ></div>
                                            );
                                        case 'system':
                                            return <></>;
                                    }
                                })}
                            </div>
                        </div>
                    </Content>
                    <Footer
                        style={{
                            height: '50px',
                            marginBottom: '10px',
                            backgroundColor: 'rgba(250,250,250,1)',
                        }}
                        className="cantDrag"
                    >
                        <Form layout="vertical" onSubmit={submitQuestion} form={form}>
                            <Row key="editor">
                                <Col span={2} key="token">
                                    <Select
                                        value={conversationToken}
                                        defaultValue="min"
                                        placeholder="会话长度"
                                        onChange={(v) =>
                                            setConversationToken(v ? v.toString() : 'min')
                                        }
                                        clearable
                                    >
                                        <Option key={0} value="min" label="少量"/>
                                        <Option key={1} value="mid" label="中等"/>
                                        <Option key={2} value="max" label="最大"/>
                                    </Select>
                                </Col>
                                <Col span={9} key="input">
                                    {/*<FormItem name="question">*/}
                                    <Textarea
                                        autosize={{minRows: 1, maxRows: 8}}
                                        value={currentQuestion}
                                        onChange={setCurrentQuestion}
                                        onKeydown={(value: InputValue, context) => {
                                            if (context.e.keyCode == 13) {
                                                if (
                                                    context.e.altKey ||
                                                    context.e.ctrlKey ||
                                                    context.e.shiftKey ||
                                                    context.e.metaKey
                                                ) {
                                                    setCurrentQuestion(`${currentQuestion}\n`);
                                                    return;
                                                }
                                                submitQuestion();
                                                context.e.preventDefault();
                                            }
                                        }}
                                    />
                                    {/*</FormItem>*/}
                                </Col>
                                <Col span={1} key="senderBtn">
                                    <FormItem style={{marginLeft: '5px', width: '100%'}}>
                                        <Button
                                            theme="primary"
                                            type="submit"
                                            style={{width: '100%'}}
                                            disabled={currentConversationId == -1}
                                        >
                                            发送
                                        </Button>
                                    </FormItem>
                                </Col>
                            </Row>
                        </Form>
                    </Footer>
                </Layout>
            </Layout>
        </div>
    );
}

export default App;
