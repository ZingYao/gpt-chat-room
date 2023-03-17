

export namespace entities {
    export class Conversation {
        UUID: string;
        Title: string;

        static createFrom(source: any = {}) {
            return new Conversation(source);
        }

        constructor(source: any = {}) {
            if ('string' === typeof source) source = JSON.parse(source);
            this.Title = source["Title"];
            this.UUID = source["UUID"];
        }
    }
}