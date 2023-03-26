import axios from 'axios';

const chatConversation = (key: string, uuid: string, token: number, question: string) => {
    axios.post("http://localhost:11380/api/v1/chat/stream", {
            "uuid": uuid,
            "token": "token",
            "question": "question"
        },
        {
            headers: {
                "Authorization": key
            }
        }).then((response)=>{})
}


export default chatConversation