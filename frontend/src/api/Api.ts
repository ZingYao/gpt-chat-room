import axios from 'axios';
import { Readable } from 'stream';

const chatConversation = async (key: string, uuid: string, token: number, question: string) => {
    const response = await axios.post("http://localhost:11380/api/v1/chat/stream", {
        "uuid": uuid,
        "token": "token",
        "question": "question"
    },
        {
            headers: {
                "Authorization": key
            },
            responseType: 'stream',
            transformResponse: (data) => {
                return new Readable({
                    read() {
                        this.push(data)
                    }
                })
            }
        });
    response.data?.on("data", (chunk: Readable) => {
        console.log("response", chunk.toString())
    })
    response.data?.on("error",(err: any)=> {
        console.log("response error",err)
    })
}

export default chatConversation