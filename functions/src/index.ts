import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import OpenAI from 'openai';
import * as cors from 'cors';

// Initialize Firebase Admin SDK
admin.initializeApp();

// Initialize OpenAI with API key from environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// CORS configuration
const corsHandler = cors({
  origin: true,
  credentials: true
});

// Riley's system prompt with Moshy's photography information
const RILEY_SYSTEM_PROMPT = `You are Riley, Moshy Friedman's friendly and knowledgeable photography assistant. You help visitors learn about Moshy's photography services and expertise in Montreal.

About Moshy Friedman:
- Professional photographer based in Montreal, Quebec
- Specializes in street photography, portraits, urban landscapes, and event coverage
- 5+ years of experience with 500+ completed sessions
- Known for capturing authentic beauty and storytelling through visual artistry
- Instagram: @mtl_moshysphotogrpahy
- Email: hello@moshyfriedman.com

Services offered:
1. Portrait Sessions - Professional headshots, family portraits, personal branding
2. Street Photography - Capturing Montreal's urban life, culture, spontaneous moments
3. Event Coverage - Weddings, celebrations, corporate events, special occasions
4. Architecture Photography - Urban landscapes, architectural photography, city documentation

Montreal Photography Tips:
- Old Montreal offers historic charm and cobblestone streets
- Mount Royal provides panoramic city views
- The Olympic Stadium area has modern architectural elements
- Underground City (RÉSO) offers unique urban photography opportunities
- Seasonal considerations: Beautiful fall colors, winter snow scenes, spring blooms
- Golden hour along the St. Lawrence River creates stunning backdrops

Your personality:
- Friendly, enthusiastic, and professional
- Knowledgeable about photography techniques and Montreal locations
- Helpful with booking information and pricing questions
- Passionate about photography and visual storytelling
- Conversational but informative

Guidelines:
- Always be helpful and encouraging
- Provide specific Montreal location suggestions when relevant
- Offer photography tips and techniques when appropriate
- Help with booking inquiries and direct them to contact Moshy
- Stay focused on photography-related topics and Moshy's services
- Be concise but informative in your responses`;

export const chatWithRiley = functions.https.onRequest(async (request, response) => {
  return new Promise((resolve) => {
    corsHandler(request, response, async () => {
      try {
        // Verify authentication
        const authHeader = request.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
          response.status(401).json({ error: 'Unauthorized: No valid token provided' });
          resolve(undefined);
          return;
        }

        const idToken = authHeader.split('Bearer ')[1];
        
        try {
          const decodedToken = await admin.auth().verifyIdToken(idToken);
          const userId = decodedToken.uid;
          
          // Get the user's message
          const { message, chatHistory = [] } = request.body;
          
          if (!message) {
            response.status(400).json({ error: 'Message is required' });
            resolve(undefined);
            return;
          }

          // Prepare conversation context
          const messages: any[] = [
            {
              role: 'system',
              content: RILEY_SYSTEM_PROMPT
            }
          ];

          // Add chat history (last 10 messages to maintain context while managing token usage)
          const recentHistory = chatHistory.slice(-10);
          messages.push(...recentHistory);

          // Add current user message
          messages.push({
            role: 'user',
            content: message
          });

          // Call OpenAI API
          const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: messages,
            max_tokens: 500,
            temperature: 0.7,
            presence_penalty: 0.6,
            frequency_penalty: 0.3
          });

          const rileyResponse = completion.choices[0]?.message?.content;

          if (!rileyResponse) {
            throw new Error('No response from OpenAI');
          }

          // Save conversation to Firestore
          const timestamp = admin.firestore.FieldValue.serverTimestamp();
          const chatRef = admin.firestore()
            .collection('chats')
            .doc(userId)
            .collection('messages');

          // Save user message
          await chatRef.add({
            role: 'user',
            content: message,
            timestamp: timestamp
          });

          // Save Riley's response
          await chatRef.add({
            role: 'assistant',
            content: rileyResponse,
            timestamp: timestamp
          });

          // Update user's last chat activity
          await admin.firestore()
            .collection('users')
            .doc(userId)
            .set({
              lastChatActivity: timestamp,
              email: decodedToken.email
            }, { merge: true });

          response.json({
            success: true,
            response: rileyResponse,
            timestamp: new Date().toISOString()
          });

        } catch (authError) {
          console.error('Authentication error:', authError);
          response.status(401).json({ error: 'Invalid token' });
        }

      } catch (error) {
        console.error('Error in chatWithRiley:', error);
        response.status(500).json({ 
          error: 'Internal server error',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
      resolve(undefined);
    });
  });
});

export const getChatHistory = functions.https.onRequest(async (request, response) => {
  return new Promise((resolve) => {
    corsHandler(request, response, async () => {
      try {
        // Verify authentication
        const authHeader = request.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
          response.status(401).json({ error: 'Unauthorized: No valid token provided' });
          resolve(undefined);
          return;
        }

        const idToken = authHeader.split('Bearer ')[1];
        
        try {
          const decodedToken = await admin.auth().verifyIdToken(idToken);
          const userId = decodedToken.uid;

          // Get chat history from Firestore
          const chatRef = admin.firestore()
            .collection('chats')
            .doc(userId)
            .collection('messages')
            .orderBy('timestamp', 'asc')
            .limit(50); // Limit to last 50 messages

          const snapshot = await chatRef.get();
          const messages: any[] = [];

          snapshot.forEach((doc) => {
            const data = doc.data();
            messages.push({
              id: doc.id,
              role: data.role,
              content: data.content,
              timestamp: data.timestamp?.toDate()?.toISOString() || new Date().toISOString()
            });
          });

          response.json({
            success: true,
            messages: messages
          });

        } catch (authError) {
          console.error('Authentication error:', authError);
          response.status(401).json({ error: 'Invalid token' });
        }

      } catch (error) {
        console.error('Error getting chat history:', error);
        response.status(500).json({ 
          error: 'Internal server error',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
      resolve(undefined);
    });
  });
});

export const clearChatHistory = functions.https.onRequest(async (request, response) => {
  return new Promise((resolve) => {
    corsHandler(request, response, async () => {
      try {
        // Verify authentication
        const authHeader = request.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
          response.status(401).json({ error: 'Unauthorized: No valid token provided' });
          resolve(undefined);
          return;
        }

        const idToken = authHeader.split('Bearer ')[1];
        
        try {
          const decodedToken = await admin.auth().verifyIdToken(idToken);
          const userId = decodedToken.uid;

          // Get all messages in the user's chat
          const chatRef = admin.firestore()
            .collection('chats')
            .doc(userId)
            .collection('messages');

          const snapshot = await chatRef.get();
          
          // Delete all messages in batches
          const batchSize = 500;
          const batches = [];
          
          for (let i = 0; i < snapshot.docs.length; i += batchSize) {
            const batch = admin.firestore().batch();
            const batchDocs = snapshot.docs.slice(i, i + batchSize);
            
            batchDocs.forEach((doc) => {
              batch.delete(doc.ref);
            });
            
            batches.push(batch.commit());
          }

          await Promise.all(batches);

          response.json({
            success: true,
            message: 'Chat history cleared successfully'
          });

        } catch (authError) {
          console.error('Authentication error:', authError);
          response.status(401).json({ error: 'Invalid token' });
        }

      } catch (error) {
        console.error('Error clearing chat history:', error);
        response.status(500).json({ 
          error: 'Internal server error',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
      resolve(undefined);
    });
  });
});