import {entities} from "../models";
import {ReactNode, useEffect, useState} from "react";
import {Button, Dialog, Input, Menu, MenuValue,MessagePlugin} from "tdesign-react";
import { PinIcon,PinFilledIcon,DeleteIcon } from 'tdesign-icons-react';
import {
    CheckProxy,
    GetConfig,
    ConversationGetList,
    UtilMessageDialog,
    SetApiKey,
    SetProxy
} from "../../wailsjs/go/main/App";
import {v4 as uuid} from "uuid";

const {MenuItem} = Menu

type MenuViewPropsType = {
    onChange: (value: MenuValue) => void,
    defaultSelected: MenuValue | undefined,
    conversationList: entities.Conversation[],
    currentConversationId:number
    setConversationList: (list: entities.Conversation[]) => void,
    setCurrentConversationId: (id: number) => void
}

const MenuView = (props: MenuViewPropsType) => {
    const {onChange, defaultSelected,currentConversationId, setCurrentConversationId, setConversationList} = props
    let {conversationList} = props

    // 代理测试地址
    let [proxyTestAddr,setProxyTestAddr] = useState("https://api.openai.com/v1")
    //新建会话窗口显示控制
    let [newConversationVisible, setNewConversationVisible] = useState(false)
    //apikey设置窗口显示控制
    let [apiKeyConfigVisible, setApiKeyVisible] = useState(false)
    //代理设置窗口显示控制
    let [proxyConfigVisible, setProxyConfigVisible] = useState(false)
    //新建会话标题
    let [newConversationTitle, setNewConversationTitle] = useState("")
    //apiKey
    let [apiKey, setApiKey] = useState("")
    //代理地址
    let [proxyAddr, setProxyAddr] = useState("")

    // 获取会话列表
    useEffect(function () {
        ConversationGetList().then((list) => {
            setConversationList(list)
            list.length > 0 && setCurrentConversationId(0)
        })
        GetConfig().then((config)=> {
            setApiKey(config.ApiKey)
            setProxyAddr(config.ProxyAddr)
        })
    }, [])

    return (
        <>
            <h1 style={{height: "40px"}}>会话列表</h1>
            <hr style={{width: "95%", color: "#333"}}/>
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
                        <MenuItem value={index} key={c.UUID} icon={currentConversationId == index ? <PinFilledIcon /> :<PinIcon />}><div ><span>{c.Title}</span></div></MenuItem>
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
                onClose={() => setNewConversationVisible(false)}
                confirmOnEnter={true}
                onConfirm={() => {
                    if (newConversationTitle == "") {
                        UtilMessageDialog("error", "错误", "会话标题不能为空").catch((e) => {
                            console.log("error", e)
                        })
                        return
                    }
                    conversationList = conversationList.concat([{Title: newConversationTitle, UUID: uuid()}])
                    setConversationList(conversationList)
                    setNewConversationVisible(false)
                    setNewConversationTitle("")
                    setCurrentConversationId(conversationList.length - 1)
                }}
            >
                <Input value={newConversationTitle} placeholder="会话标题" onChange={(v: string) => {
                    setNewConversationTitle(v.trim())
                }}></Input>
            </Dialog>
            <Dialog
                header="请输入apikey"
                visible={apiKeyConfigVisible}
                onClose={() => {
                    GetConfig().then(config=> {
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
                    SetApiKey(apiKey)
                }}
            >
                <Input value={apiKey.length <= 11? apiKey :apiKey.slice(1,5) + "******" + apiKey.slice(apiKey.length - 5,apiKey.length)} placeholder="OpenAI Api Key" onChange={(v: string) => {
                    setApiKey(v.trim())
                }}></Input>
            </Dialog>
            <Dialog
                header="请输入代理地址"
                visible={proxyConfigVisible}
                onClose={() => {
                    GetConfig().then(config=> {
                        setProxyAddr(config.ProxyAddr)
                    })
                    setProxyConfigVisible(false)
                }}
                confirmOnEnter={true}
                onConfirm={() => {
                    SetProxy(proxyAddr)
                    setProxyConfigVisible(false)
                }}
            >
                <Input value={proxyAddr} placeholder="代理地址" onChange={(v: string) => {
                    setProxyAddr(v.trim())
                }}></Input>
                <Input value={proxyTestAddr} style={{width:"70%",float:"left"}} onChange={setProxyTestAddr}></Input>
                <Button style={{float:"right",width:"30%"}} onClick={()=> {
                    if (proxyAddr.length == 0) {
                        UtilMessageDialog("error","错误","代理地址不能为空")
                        return
                    }
                    CheckProxy(proxyAddr,proxyTestAddr).then((rsp:string)=> {
                        MessagePlugin.info(rsp)
                    })
                }
                }>测试代理</Button>
            </Dialog>
        </>);
}
export default MenuView