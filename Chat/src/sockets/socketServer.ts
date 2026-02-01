import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { ChatService } from '../services/chatService.ts';
import { SendMessageDto } from '../dtos/chatDTO.ts';

const chatService = new ChatService();

export const setupSocketServer = (io: Server) => {
  
  // 1. MIDDLEWARE: Check JWT before allowing connection
  io.use((socket, next) => {
    // Parse cookie string from the handshake headers (socket.handshake.headers.cookie)
    const cookieHeader = socket.handshake.headers?.cookie || '';

    const cookies: Record<string, string> = {};
    cookieHeader.split(';').forEach((c) => {
      const [k, ...v] = c.split('=');
      if (!k) return;
      cookies[k.trim()] = decodeURIComponent((v || []).join('=').trim());
    });

    let token = cookies['token'];

    // Fallback: allow auth token via handshake auth for non-browser clients (test-client)
    if (!token) {
      token = (socket.handshake.auth && (socket.handshake.auth as any).token) || '';
    }

    if (!token) return next(new Error("Authentication error"));

    try {
      const secret = process.env.JWT_SECRET || "default_secret";
      const decoded = jwt.verify(token, secret);
      (socket as any).user = decoded; // Attach user to socket
      next();
    } catch (err) {
      next(new Error("Authentication error"));
    }
  });

  // 2. CONNECTION HANDLER
  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user;
    console.log(`⚡ User connected: ${user.username} (${user.id})`);

    // Auto-join a room for their own UserID (for DMs)
    socket.join(user.id);

    // EVENT: User joins a specific Group Chat
    socket.on('join_group', async (groupId: string) => {
      console.log(`User ${user.username} joining group: ${groupId}`);
      socket.join(groupId);

      // Load History
      const history = await chatService.getGroupHistory(groupId);
      socket.emit('history', history);
    });

    // EVENT: User sends a message
    socket.on('send_message', async (payload: any) => {
      try {
        // 1. Validate Payload
        const dto = new SendMessageDto(user.id, payload);
        const error = dto.validate();
        if (error) {
          return socket.emit('error', { message: error });
        }

        // 2. Save to DB
        const savedMsg = await chatService.saveMessage(user.id, dto);

        // Enrich with sender info (avatar, color)
        const { UserRepository } = await import('../repositories/UserRepository.ts');
        const userRepo = new UserRepository();
        const sender = await userRepo.findById(user.id);
        const enriched = {
          ...savedMsg,
          username: sender?.username || user.username,
          avatarUrl: sender?.avatarUrl || null,
          color: sender?.color || null,
          timestamp: savedMsg.createdAt
        };

        // 3. Broadcast
        // If Group: Send to "groupId" room
        // If Private: Send to "recipientId" room AND "senderId" room
        if (dto.type === 'group') {
          io.to(dto.targetId).emit('new_message', enriched);
        } else {
          io.to(dto.targetId).emit('new_message', enriched);
          socket.emit('new_message', enriched); // Send back to sender for UI update
        }

      } catch (err: any) {
        console.error(err);
        socket.emit('error', { message: "Failed to send message" });
      }
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${user.username}`);
    });
  });
};