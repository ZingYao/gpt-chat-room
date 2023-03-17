export namespace openai {
	
	export class ChatCompletionMessage {
	    role: string;
	    content: string;
	    name?: string;
	
	    static createFrom(source: any = {}) {
	        return new ChatCompletionMessage(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.role = source["role"];
	        this.content = source["content"];
	        this.name = source["name"];
	    }
	}

}

