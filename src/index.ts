import express from 'express';
import { Server } from 'socket.io';
import http from 'http';
import User from './models/User.model';
import { connectToDB } from './helpers/db';
import ConversationModel from './models/Conversation.model';
import MessageModel from './models/Message.model';
import { getConversation } from './helpers/getConverstion';

const FRONTEND_ENDPOINT = process.env.FRONTEND_ENDPOINT || "https://dev-2-winn.vercel.app/"
const port = process.env.PORT || 3001;

export const app = express();
// socket connection
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [FRONTEND_ENDPOINT, "http://localhost:3001"],
    credentials: true,
  },
});

// online user
const onlineUser: any = new Set();


io.on('connection', async (socket) => {
  console.log('connect User ', socket.id);

  const userId = socket.handshake.auth.token;
  console.log(userId);

  // create a room
  socket.join(userId?.toString());
  onlineUser.add(userId?.toString());


  io.emit('onlineUser', Array.from(onlineUser));

  socket.on('sendMessage', async (message) => {
    const { senderId, receiverId, text } = message;
    const receiverSocketId = onlineUser.has(receiverId);
    // console.log(receiverSocketId,message);

    if (receiverSocketId) {
      await connectToDB();
      let conversation = await ConversationModel.findOne({
        $or: [
          { sender: senderId, receiver: receiverId },
          { sender: receiverId, receiver: senderId },
        ],
      });

      // if conversation is not available

      if (!conversation) {
        const createConversation = await new ConversationModel({
          sender: senderId,
          receiver: receiverId,
        });
        conversation = await createConversation.save();
        // console.log(conversation);
      }

      const newMessage = new MessageModel({
        text: message.text,
        //   imageUrl : message.imageUrl,
        //   videoUrl : message.videoUrl,
        msgByUserId: senderId,
      });
      const saveMessage = await newMessage.save();

      // console.log(savMeessage);

      await ConversationModel.updateOne(
        { _id: conversation?._id },
        {
          $push: { messages: saveMessage?._id },
        },
      );
      // console.log(updateConversation);
      const getConversationMessage = await ConversationModel.findOne({
        $or: [
          { sender: senderId, receiver: receiverId },
          { sender: receiverId, receiver: message?.senderId },
        ],
      })
        .populate('messages')
        .sort({ updatedAt: -1 });

      //   console.log(getConversationMessage);

      io.to(senderId).emit('message', getConversationMessage?.messages || []);
      io.to(receiverId).emit('message', getConversationMessage?.messages || []);

      // send conversation
      const conversationSender = await getConversation(senderId);
      const conversationReceiver = await getConversation(receiverId);

      io.to(senderId).emit('conversation', conversationSender);
      io.to(receiverId).emit('conversation', conversationReceiver);

      io.to(receiverId).emit('receiveMessage', {
        senderId,
        text,
        timestamp: new Date(),
      });

      // console.log(res);
    }
  });

  socket.on('message-page', async (Id) => {
    // console.log('userId',Id)
    await connectToDB();
    const userDetails = await User.findById(Id);

    const payload = {
      _id: userDetails?._id,
      name: userDetails?.firstName,
      email: userDetails?.email,
      profile_pic: userDetails?.profile_pic,
      online: onlineUser.has(Id),
    };
    socket.emit('message-user', payload);

    await connectToDB();

    const getConversationMessage = await ConversationModel.findOne({
      $or: [
        { sender: userId, receiver: Id },
        { sender: Id, receiver: userId },
      ],
    })
      .populate('messages')
      .sort({ updatedAt: -1 });

    // console.log(getConversationMessage,'messages with two');

    socket.emit('message', getConversationMessage?.messages || []);
  });

  // sidebar
  socket.on('sidebar', async (currentUserId) => {
    console.log('current user', currentUserId);

    await connectToDB();

    const conversation = await getConversation(currentUserId);

    // console.log(conversation);

    socket.emit('conversation', conversation);
  });

  socket.on('seen', async (msgByUserId) => {
    await connectToDB();

    const conversation = await ConversationModel.findOne({
      $or: [
        { sender: userId, receiver: msgByUserId },
        { sender: msgByUserId, receiver: userId },
      ],
    });

    const conversationMessageId = conversation?.messages || [];

    await MessageModel.updateMany(
      { _id: { $in: conversationMessageId }, msgByUserId: msgByUserId },
      { $set: { seen: true } },
    );

    // send conversation
    const conversationSender = await getConversation(userId?.toString());
    const conversationReceiver = await getConversation(msgByUserId);

    // console.log(conversationSender);

    io.to(userId?.toString()).emit('conversation', conversationSender);
    io.to(msgByUserId).emit('conversation', conversationReceiver);
  });

  // disconnect
  socket.on('disconnect', () => {
    // onlineUser.delete(user?._id?.toString())
    console.log('disconnect user ', socket.id);
  });
});

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
