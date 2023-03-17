import {entities} from "../models";
import {ReactNode, useEffect, useState} from "react";
import {Button, Dialog, Input, Menu, MenuValue} from "tdesign-react";
import {GetConversationList, MessageDialog} from "../../wailsjs/go/main/App";
import {v4 as uuid} from "uuid";

const {MenuItem} = Menu

type MenuViewPropsType = {
    onChange:(value:MenuValue)=>void,
    defaultSelected:MenuValue|undefined,
    conversationList:entities.Conversation[],
    setConversationList:(list:entities.Conversation[])=>void,
    setCurrentConversationId:(id:number)=>void
}

const MenuView = (props:MenuViewPropsType) => {
    const {onChange,defaultSelected,setCurrentConversationId,setConversationList} = props
    let {conversationList} = props

    //新建会话窗口显示控制
    let [newConversationVisible, setNewConversationVisible] = useState(false)
    //新建会话标题
    let [newConversationTitle, setNewConversationTitle] = useState("")

    // 获取会话列表
    useEffect(function () {
        GetConversationList().then((list) => {
            setConversationList(list)
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
                    height: "calc(100vh - 180px)",
                    overflowY: "scroll",
                    whiteSpace: "nowrap",
                }}
                onChange={onChange}
                value={defaultSelected}
            >
                {conversationList.map(function (c: entities.Conversation, index: number): ReactNode {
                    return (
                        <MenuItem value={index} key={c.UUID}>{c.Title}</MenuItem>
                    )
                })}
            </Menu>

            <div style={{marginBottom: "0px"}}>
                <Button style={{width: "100%", height: "40px"}} onClick={() => {
                    setNewConversationVisible(true)
                }}>新建会话</Button>
            </div>
            <Dialog
                header="请输入会话标题"
                visible={newConversationVisible}
                onClose={() => setNewConversationVisible(false)}
                confirmOnEnter={true}
                onConfirm={() => {
                    if (newConversationTitle == "") {
                        MessageDialog("error", "错误", "会话标题不能为空").catch((e) => {
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
                <Input value={newConversationTitle} onChange={(v: string) => {
                    setNewConversationTitle(v.trim())
                }}></Input>
            </Dialog>
        </>);
}
export default  MenuView