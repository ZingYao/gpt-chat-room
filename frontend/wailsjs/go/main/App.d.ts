// Cynhyrchwyd y ffeil hon yn awtomatig. PEIDIWCH Â MODIWL
// This file is automatically generated. DO NOT EDIT
import {entities} from '../models';
import {openai} from '../models';

export function ConfigGet():Promise<entities.Config>;

export function ConfigGetRequestKey():Promise<string>;

export function ConfigSetApiKey(arg1:string):Promise<boolean>;

export function ConfigSetProxy(arg1:string):Promise<boolean>;

export function ConversationCreate(arg1:string,arg2:string,arg3:string,arg4:string):Promise<string>;

export function ConversationDelete(arg1:string):Promise<string>;

export function ConversationGetList():Promise<Array<entities.Conversation>>;

export function ConversationRename(arg1:string,arg2:string):Promise<string>;

export function MessageGetList(arg1:string):Promise<Array<openai.ChatCompletionMessage>>;

export function OpenAiChat(arg1:string,arg2:string,arg3:number):Promise<string>;

export function OpenAiGetMaxToken(arg1:string):Promise<number>;

export function OpenAiGetModelList():Promise<Array<string>>;

export function UtilCheckProxy(arg1:string,arg2:string):Promise<string>;

export function UtilMessageDialog(arg1:string,arg2:string,arg3:string):Promise<void>;
