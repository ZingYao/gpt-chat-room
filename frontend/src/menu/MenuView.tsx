import {entities} from "../models";
import {ReactNode, useEffect, useState} from "react";
import {Button, Dialog, Input, Menu, MenuValue, MessagePlugin, Select, SelectValue, Textarea} from "tdesign-react";
import {DeleteIcon, Edit1Icon, PinFilledIcon, PinIcon} from 'tdesign-icons-react';
import {
    ConfigGet,
    ConfigSetApiKey,
    ConfigSetProxy,
    ConversationCreate,
    ConversationDelete, ConversationEdit,
    ConversationGetList,
    OpenAiGetModelList,
    UtilCheckProxy,
    UtilMessageDialog
} from "../../wailsjs/go/main/App";
import {v4 as uuid} from "uuid";
import Option from "tdesign-react/es/select/base/Option";

const {MenuItem} = Menu

type MenuViewPropsType = {
    onChange: (value: MenuValue) => void,
    defaultSelected: MenuValue | undefined,
    conversationList: entities.Conversation[],
    currentConversationId: number
    setConversationList: (list: entities.Conversation[]) => void,
    setCurrentConversationId: (id: number) => void
}

type ConversationInfoType = {
    uuid: string,
    title: string,
    characterSetting: string,
    model: string
}

const MenuView = (props: MenuViewPropsType) => {
    const {onChange, defaultSelected, currentConversationId, setCurrentConversationId, setConversationList} = props
    let {conversationList} = props

    // 代理测试地址
    let [proxyTestAddr, setProxyTestAddr] = useState("https://api.openai.com/")
    //新建会话窗口显示控制
    let [editConversationVisible, setEditConversationVisible] = useState(false)
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
    let [conversationInfo, setConversationInfo] = useState<ConversationInfoType>({
        characterSetting: "",
        model: "",
        uuid: "",
        title: ""
    })
    let [isEdit, setIsEdit] = useState(true)

    let resetEditConversationWindowData = () => {
        setConversationInfo({
            uuid: uuid(),
            characterSetting: "",
            model: modelList.length > 0 ? modelList[0] : "",
            title: ""
        })
    }
    let submitConversation = () => {
        if (!conversationInfo?.title || conversationInfo?.title == "") {
            UtilMessageDialog("error", "错误", "会话标题不能为空").then(r => {
            })
            return
        }
        if (!conversationInfo?.model || conversationInfo?.model == "") {
            UtilMessageDialog("error", "错误", "会话模型不能为空").then(r => {
            })
            return;
        }
        let func: (uuid: string, title: string, characterSetting: string, model: string) => Promise<string>;
        let id = ""
        if (!isEdit) {
            func = ConversationCreate
            ConversationCreate(id, conversationInfo.title, conversationInfo.characterSetting, conversationInfo.model).then((s) => {
                if (s != "会话创建成功") {
                    UtilMessageDialog("error", "错误", `会话创建失败(${s})`).then(r => {
                    })
                    return
                }
                setEditConversationVisible(false)

                ConversationGetList().then((list) => {
                    setConversationList(list)
                    list.length > 0 && setCurrentConversationId(0)
                })
            })
        } else {
            func = ConversationEdit
        }
        func(conversationInfo.uuid,conversationInfo.title, conversationInfo.characterSetting, conversationInfo.model).then((s:string)=>{
            if (!isEdit && s != "会话创建成功") {
                UtilMessageDialog("error", "错误", `会话创建失败(${s})`).then(r => {
                })
                return
            }
            if (isEdit && s != "") {
                UtilMessageDialog("error", "错误", `会话编辑失败(${s})`).then(r => {
                })
                return
            }
            setEditConversationVisible(false)
            ConversationGetList().then((list) => {
                setConversationList(list)
                if (!isEdit) {
                    list.length > 0 && setCurrentConversationId(0)
                }
            })
        }).finally(() => {
            resetEditConversationWindowData()
        })
    }

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
                                    <Button shape="circle" theme="default" icon={<Edit1Icon size={"3px"}/>}
                                            onClick={() => {
                                                OpenAiGetModelList().then((list: string[]) => {
                                                        setModelList(list)
                                                        setIsEdit(true  )
                                                        setConversationInfo({
                                                            uuid:c.UUID,
                                                            characterSetting: c.CharacterSetting,
                                                            model: c.ChatModel,
                                                            title: c.Title
                                                        })
                                                    }
                                                ).finally(() => {
                                                    setEditConversationVisible(true)
                                                })
                                            }
                                            }
                                    />
                                    <Button shape="circle" theme="default" icon={<DeleteIcon size={"3px"}/>}
                                            onClick={() => {
                                                ConversationDelete(c.UUID).then((res: string) => {
                                                    if (res == "") {
                                                        ConversationGetList().then((list) => {
                                                            setConversationList(list)
                                                        })
                                                    } else {
                                                        MessagePlugin.error(`删除会话失败:${res}`)
                                                    }
                                                })
                                            }
                                            }/>
                                </div>
                            </MenuItem>
                        )
                    })}
                </Menu>

                <div>
                    <Button style={{width: "100%", height: "40px"}} onClick={() => {
                        OpenAiGetModelList().then((list: string[]) => {
                            setModelList(list)
                            setIsEdit(false)
                            setEditConversationVisible(true)
                        })
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
                    header={isEdit ? '编辑会话' : '新建会话'}
                    visible={editConversationVisible}
                    onClose={() => {
                        setEditConversationVisible(false)
                        resetEditConversationWindowData()
                    }}
                    onConfirm={() => submitConversation()}
                >
                    <div>
                        <label>会话标题</label>
                        <Input placeholder="会话标题" value={conversationInfo.title} onChange={(v: string) => {
                            conversationInfo.title = v.trim()
                            setConversationInfo(conversationInfo)
                        }}></Input>
                    </div>
                    <div>
                        <label>会话人设</label>
                        <Textarea autosize={{minRows: 2, maxRows: 5}} placeholder="会话人设"
                                  value={conversationInfo.characterSetting}
                                  onChange={(v: string) => {
                                      conversationInfo.characterSetting = v
                                      setConversationInfo(conversationInfo)
                                  }}></Textarea>
                    </div>
                    <div>
                        <label>会话模型</label>
                        <Select placeholder="会话模型" value={conversationInfo.model} filterable
                                onChange={(m: SelectValue) => {
                                    conversationInfo.model = m.toString()
                                    setConversationInfo(conversationInfo)
                                }}>
                            {modelList.sort().map((model: string, index: number) => (
                                <Option key={index} value={model} label={model}></Option>
                            ))}
                        </Select>
                    </div>
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
                    <Input placeholder="代理地址" onChange={(v: string) => {
                        setProxyAddr(v.trim())
                    }}></Input>
                    <Input value={proxyTestAddr} style={{width: "70%", float: "left"}}
                           onChange={setProxyTestAddr}></Input>
                    <Button style={{float: "right", width: "30%"}} onClick={() => {
                        UtilCheckProxy(proxyAddr, proxyTestAddr).then((rsp: string) => {
                            MessagePlugin.info(rsp)
                        })
                    }
                    }>检查连通性</Button>
                </Dialog>
            </div>
        </>);
}
export default MenuView