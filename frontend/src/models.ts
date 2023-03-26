

export namespace entities {
    export class Conversation {
        UUID: string;
        Title: string;
        CharacterSetting:string;
        ChatModel:string

        static createFrom(source: any = {}) {
            return new Conversation(source);
        }

        constructor(source: any = {}) {
            if ('string' === typeof source) source = JSON.parse(source);
            this.Title = source["Title"];
            this.UUID = source["UUID"];
            this.CharacterSetting = source["CharacterSetting"];
            this.ChatModel = source["ChatModel"];
        }
    }
    export class Config {
        UserName:string;
        ApiKey:string;
        ProxyAddr:string;

        static createFrom (source: any= {}) {
            return new Config(source)
        }
        constructor(source: any = {}) {
            if ('string' === typeof source) source = JSON.parse(source);
            this.UserName = source["UserName"]
            this.ApiKey = source["ApiKey"]
            this.ProxyAddr = source["ProxyAddr"]
        }
    }
}