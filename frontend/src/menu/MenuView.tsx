import {entities} from "../models";
import {ReactNode, useEffect, useState} from "react";
import {
    Button,
    Dialog,
    Form,
    Input,
    Menu,
    MenuValue,
    MessagePlugin,
    Select,
    SelectValue,
    Textarea
} from "tdesign-react";
import {DeleteIcon, Edit1Icon, PinFilledIcon, PinIcon} from 'tdesign-icons-react';
import {
    ConfigGet,
    ConfigSetApiKey,
    ConfigSetProxy,
    ConversationCreate,
    ConversationGetList,
    OpenAiGetModelList,
    UtilCheckProxy,
    UtilMessageDialog
} from "../../wailsjs/go/main/App";
import {v4 as uuid} from "uuid";
import Option from "tdesign-react/es/select/base/Option";
import FormItem from "tdesign-react/es/form/FormItem";

const {MenuItem} = Menu

type MenuViewPropsType = {
    onChange: (value: MenuValue) => void,
    defaultSelected: MenuValue | undefined,
    conversationList: entities.Conversation[],
    currentConversationId: number
    setConversationList: (list: entities.Conversation[]) => void,
    setCurrentConversationId: (id: number) => void
}

const MenuView = (props: MenuViewPropsType) => {
    const {onChange, defaultSelected, currentConversationId, setCurrentConversationId, setConversationList} = props
    let {conversationList} = props

    // 代理测试地址
    let [proxyTestAddr, setProxyTestAddr] = useState("https://api.openai.com/v1")
    //新建会话窗口显示控制
    let [newConversationVisible, setNewConversationVisible] = useState(false)
    //新建会话标题
    let [conversationTitle, setConversationTitle] = useState("")
    //新建会话人设
    let [conversationCharacterSetting, setConversationCharacterSetting] = useState("")
    //apikey设置窗口显示控制
    let [apiKeyConfigVisible, setApiKeyVisible] = useState(false)
    //代理设置窗口显示控制
    let [proxyConfigVisible, setProxyConfigVisible] = useState(false)
    //apiKey
    let [apiKey, setApiKey] = useState("")
    //代理地址
    let [proxyAddr, setProxyAddr] = useState("")
    //模型列表
    let [modelList, setModelList] = useState<string[]>([])
    //新建会话模型
    let [conversationModel, setConversationModel] = useState(modelList[0])

    // 获取会话列表
    useEffect(function () {
        ConversationGetList().then((list) => {
            setConversationList(list)
            list.length > 0 && setCurrentConversationId(0)
        })
        ConfigGet().then((config) => {
            setApiKey(config.ApiKey)
            setProxyAddr(config.ProxyAddr)
        })
        OpenAiGetModelList().then((list: string[]) => {
            setModelList(list)
        })
    }, [])

    return (
        <>
            <h1 style={{height: "40px"}}>会话列表</h1>
            <hr style={{width: "95%", color: "#333"}}/>
            <div className="cantDrag">
                <Menu
                    style={{
                        margin: "0 auto",
                        width: "100%",
                        height: "calc(100vh - 263px)",
                        overflowY: "scroll",
                        whiteSpace: "nowrap",
                    }}
                    onChange={onChange}
                    defaultValue={0}
                    value={defaultSelected}
                >
                    {conversationList.map(function (c: entities.Conversation, index: number): ReactNode {
                        return (
                            <MenuItem value={index} key={c.UUID}
                                      icon={currentConversationId == index ? <PinFilledIcon/> : <PinIcon/>}>
                                <div>
                                    <span>{c.Title}</span>
                                    {/*<Button shape="circle" theme="default" icon={<Edit1Icon size={"3px"}/>}/>*/}
                                    {/*<Button shape="circle" theme="default" icon={<DeleteIcon size={"3px"}/>}/>*/}
                                </div>
                            </MenuItem>
                        )
                    })}
                </Menu>

                <div>
                    <Button style={{width: "100%", height: "40px"}} onClick={() => {
                        setNewConversationVisible(true)
                    }}>新建会话</Button>
                </div>
                <div style={{marginTop: "1px"}}>
                    <Button style={{width: "100%", height: "40px"}} onClick={() => {
                        setApiKeyVisible(true)
                    }}>设置apikey</Button>
                </div>
                <div style={{marginTop: "1px"}}>
                    <Button style={{width: "100%", height: "40px"}} onClick={() => {
                        setProxyConfigVisible(true)
                    }}>设置代理</Button>
                </div>
                <Dialog
                    header="请输入会话标题"
                    visible={newConversationVisible}
                    onClose={() => {
                        setNewConversationVisible(false)
                        document.getElementById("conversationResetBtn")?.click()
                    }}
                    onConfirm={() => {
                        if (conversationTitle == "") {
                            UtilMessageDialog("error", "错误", "会话标题不能为空").then(r => {
                            })
                            return
                        }
                        if (conversationModel == "") {
                            UtilMessageDialog("error", "错误", "会话模型不能为空").then(r => {
                            })
                            return;
                        }
                        let id = uuid()
                        ConversationCreate(id, conversationTitle, conversationCharacterSetting, conversationModel).then((s) => {
                            if (s != "会话创建成功") {
                                UtilMessageDialog("error", "错误", `会话创建失败(${s})`).then(r => {
                                })
                                return
                            }
                            conversationList = conversationList.concat([{
                                Title: conversationTitle,
                                UUID: id,
                                CharacterSetting: conversationCharacterSetting,
                                ChatModel: conversationModel
                            }])
                            setConversationList(conversationList)
                            setNewConversationVisible(false)
                            document.getElementById("conversationResetBtn")?.click()
                            setConversationModel(modelList[0])

                            ConversationGetList().then((list) => {
                                setConversationList(list)
                                list.length > 0 && setCurrentConversationId(0)
                            })
                        })
                    }}
                >
                    <Form resetType={"initial"}>
                        <FormItem label="会话标题" name="conversationTitle">
                            <Input placeholder="会话标题" onChange={(v: string) => {
                                setConversationTitle(v.trim())
                            }}></Input>
                        </FormItem>
                        <FormItem label="会话人设" name="conversationCharacterSetting">
                            <Textarea autosize={{minRows: 2, maxRows: 10}} placeholder="会话人设"
                                      onChange={(v: string) => {
                                          setConversationCharacterSetting(v)
                                      }}></Textarea>
                        </FormItem>
                        <FormItem label="会话模型" name="conversationModel">
                            <Select placeholder="会话模型" value={conversationModel} filterable
                                    defaultValue={modelList[0]}
                                    onChange={(m: SelectValue) => setConversationModel(m.toString())}>
                                {modelList.sort().map((model: string, index: number) => (
                                    <Option key={index} value={model} label={model}></Option>
                                ))}
                            </Select>
                        </FormItem>
                        <Button type="reset" id="conversationResetBtn" style={{display: "none"}}></Button>
                    </Form>
                </Dialog>
                <Dialog
                    header="请输入apikey"
                    visible={apiKeyConfigVisible}
                    onClose={() => {
                        ConfigGet().then(config => {
                            setApiKey(config.ApiKey)
                        })
                        setApiKeyVisible(false)
                    }}
                    confirmOnEnter={true}
                    onConfirm={() => {
                        if (apiKey == "") {
                            UtilMessageDialog("error", "错误", "apiKey不能为空").catch((e) => {
                                console.log("error", e)
                            })
                            return
                        }
                        setApiKeyVisible(false)
                        ConfigSetApiKey(apiKey)
                    }}
                >
                    <Input
                        value={apiKey.length <= 11 ? apiKey : apiKey.slice(1, 5) + "******" + apiKey.slice(apiKey.length - 5, apiKey.length)}
                        placeholder="OpenAI Api Key" onChange={(v: string) => {
                        setApiKey(v.trim())
                    }}></Input>
                </Dialog>
                <Dialog
                    header="请输入代理地址"
                    visible={proxyConfigVisible}
                    onClose={() => {
                        ConfigGet().then(config => {
                            setProxyAddr(config.ProxyAddr)
                        })
                        setProxyConfigVisible(false)
                    }}
                    confirmOnEnter={true}
                    onConfirm={() => {
                        ConfigSetProxy(proxyAddr)
                        setProxyConfigVisible(false)
                    }}
                >
                    <Input value={proxyAddr} placeholder="代理地址" onChange={(v: string) => {
                        setProxyAddr(v.trim())
                    }}></Input>
                    <Input value={proxyTestAddr} style={{width: "70%", float: "left"}}
                           onChange={setProxyTestAddr}></Input>
                    <Button style={{float: "right", width: "30%"}} onClick={() => {
                        if (proxyAddr.length == 0) {
                            UtilMessageDialog("error", "错误", "代理地址不能为空")
                            return
                        }
                        UtilCheckProxy(proxyAddr, proxyTestAddr).then((rsp: string) => {
                            MessagePlugin.info(rsp)
                        })
                    }
                    }>测试代理</Button>
                </Dialog>
            </div>
        </>);
}
export default MenuView