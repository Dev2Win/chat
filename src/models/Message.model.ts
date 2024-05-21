import { Schema, model, models } from "mongoose";

const messageSchema = new Schema({
    text : {
        type : String,
        default : ""
    },
    imageUrl : {
        type : String,
        default : ""
    },
    videoUrl : {
        type : String,
        default : ""
    },
    seen : {
        type : Boolean,
        default : false
    },
    msgByUserId : {
        type : Schema.ObjectId,
        required : true,
        ref : 'User'
    }
},{
    timestamps : true
})

const MessageModel = model('Message',messageSchema)
export default MessageModel