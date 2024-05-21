import { Schema, model, models } from "mongoose";

const conversationSchema = new Schema({
    sender : {
        type : Schema.ObjectId,
        required : true,
        ref : 'User'
    },
    receiver : {
        type : Schema.ObjectId,
        required : true,
        ref : 'User'
    },
    messages : [
        {
            type : Schema.ObjectId,
            ref : 'Message'
        }
    ]
},{
    timestamps : true
})

const ConversationModel = model('Conversation',conversationSchema)
export default ConversationModel