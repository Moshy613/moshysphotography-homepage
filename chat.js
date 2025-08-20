import { auth } from './firebase-config.js';
import { onAuthStateChanged, getIdToken } from 'firebase/auth';

class ChatManager {
    constructor() {
        this.chatMessages = document.getElementById('chat-messages');
        this.chatForm = document.getElementById('chat-form');
        this.chatInput = document.getElementById('chat-input');
        this.sendBtn = document.getElementById('send-btn');
        this.authRequired = document.getElementById('auth-required');
        this.chatContainer = document.getElementById('chat-container');
        this.clearChatBtn = document.getElementById('clear-chat');
        
        this.isLoading = false;
        this.chatHistory = [];
        
        // Firebase Functions URL - update this when you deploy
        this.functionsUrl = 'https://us-central1-testing-moshysphotography-app.cloudfunctions.net';
        
        this.init();
    }

    init() {
        this.setupAuthStateListener();
        this.setupEventListeners();
        this.adjustTextareaHeight();
    }

    setupAuthStateListener() {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                this.showChatInterface();
                this.loadChatHistory();
            } else {
                this.showAuthRequired();
            }
        });
    }

    setupEventListeners() {
        // Chat form submission
        if (this.chatForm) {
            this.chatForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSendMessage();
            });
        }

        // Auto-resize textarea
        if (this.chatInput) {
            this.chatInput.addEventListener('input', () => {
                this.adjustTextareaHeight();
                this.updateSendButton();
            });

            this.chatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.handleSendMessage();
                }
            });
        }

        // Clear chat button
        if (this.clearChatBtn) {
            this.clearChatBtn.addEventListener('click', () => {
                this.handleClearChat();
            });
        }

        // Suggestion buttons
        document.querySelectorAll('.suggestion-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const suggestion = e.target.textContent;
                this.chatInput.value = suggestion;
                this.adjustTextareaHeight();
                this.updateSendButton();
                this.chatInput.focus();
            });
        });

        // Auth required button
        const authRequiredBtn = document.querySelector('.auth-required-btn');
        if (authRequiredBtn) {
            authRequiredBtn.addEventListener('click', () => {
                window.authManager.showAuthModal();
            });
        }
    }

    showAuthRequired() {
        if (this.authRequired) this.authRequired.style.display = 'block';
        if (this.chatContainer) this.chatContainer.style.display = 'none';
    }

    showChatInterface() {
        if (this.authRequired) this.authRequired.style.display = 'none';
        if (this.chatContainer) this.chatContainer.style.display = 'flex';
    }

    adjustTextareaHeight() {
        if (!this.chatInput) return;
        
        this.chatInput.style.height = 'auto';
        this.chatInput.style.height = Math.min(this.chatInput.scrollHeight, 120) + 'px';
    }

    updateSendButton() {
        if (!this.sendBtn || !this.chatInput) return;
        
        const hasText = this.chatInput.value.trim().length > 0;
        this.sendBtn.disabled = !hasText || this.isLoading;
    }

    async loadChatHistory() {
        try {
            const user = auth.currentUser;
            if (!user) return;

            const token = await getIdToken(user);
            const response = await fetch(`${this.functionsUrl}/getChatHistory`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.chatHistory = data.messages || [];
                this.renderChatHistory();
            }
        } catch (error) {
            console.error('Error loading chat history:', error);
        }
    }

    renderChatHistory() {
        if (!this.chatMessages) return;

        // Clear existing messages except the welcome message
        const container = this.chatMessages.querySelector('.container');
        const welcomeMessage = container.querySelector('.riley-message');
        container.innerHTML = '';
        
        // Re-add welcome message if no history exists
        if (this.chatHistory.length === 0 && welcomeMessage) {
            container.appendChild(welcomeMessage);
        } else {
            // Render chat history
            this.chatHistory.forEach(message => {
                this.addMessageToChat(message.content, message.role, message.timestamp);
            });
        }

        this.scrollToBottom();
    }

    async handleSendMessage() {
        const message = this.chatInput?.value.trim();
        if (!message || this.isLoading) return;

        const user = auth.currentUser;
        if (!user) {
            window.authManager.showAuthModal();
            return;
        }

        try {
            this.isLoading = true;
            this.updateSendButton();

            // Add user message to chat
            this.addMessageToChat(message, 'user');
            
            // Clear input
            this.chatInput.value = '';
            this.adjustTextareaHeight();

            // Show typing indicator
            this.showTypingIndicator();

            // Prepare chat history for context
            const contextHistory = this.chatHistory.map(msg => ({
                role: msg.role,
                content: msg.content
            }));

            // Send message to Firebase Function
            const token = await getIdToken(user);
            const response = await fetch(`${this.functionsUrl}/chatWithRiley`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: message,
                    chatHistory: contextHistory
                })
            });

            const data = await response.json();

            // Hide typing indicator
            this.hideTypingIndicator();

            if (response.ok && data.success) {
                // Add Riley's response to chat
                this.addMessageToChat(data.response, 'assistant');
                
                // Update local chat history
                this.chatHistory.push(
                    { role: 'user', content: message, timestamp: new Date().toISOString() },
                    { role: 'assistant', content: data.response, timestamp: data.timestamp }
                );
            } else {
                throw new Error(data.error || 'Failed to get response');
            }

        } catch (error) {
            console.error('Error sending message:', error);
            this.hideTypingIndicator();
            this.addMessageToChat(
                "Sorry, I'm having trouble connecting right now. Please try again in a moment.",
                'assistant'
            );
        } finally {
            this.isLoading = false;
            this.updateSendButton();
            this.chatInput?.focus();
        }
    }

    addMessageToChat(content, role, timestamp = null) {
        if (!this.chatMessages) return;

        const container = this.chatMessages.querySelector('.container');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role === 'user' ? 'user-message' : 'riley-message'}`;

        const timeStr = timestamp ? 
            this.formatTimestamp(timestamp) : 
            'Just now';

        messageDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fas ${role === 'user' ? 'fa-user' : 'fa-robot'}"></i>
            </div>
            <div class="message-content">
                <div class="message-text">${this.escapeHtml(content)}</div>
                <div class="message-time">${timeStr}</div>
            </div>
        `;

        container.appendChild(messageDiv);
        this.scrollToBottom();
    }

    showTypingIndicator() {
        if (!this.chatMessages) return;

        const container = this.chatMessages.querySelector('.container');
        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator';
        typingDiv.id = 'typing-indicator';
        
        typingDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="typing-content">
                <div class="typing-dots">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        `;

        container.appendChild(typingDiv);
        typingDiv.style.display = 'flex';
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    async handleClearChat() {
        if (!confirm('Are you sure you want to clear your chat history? This action cannot be undone.')) {
            return;
        }

        try {
            const user = auth.currentUser;
            if (!user) return;

            const token = await getIdToken(user);
            const response = await fetch(`${this.functionsUrl}/clearChatHistory`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                this.chatHistory = [];
                this.renderChatHistory();
                this.showMessage('Chat history cleared successfully', 'success');
            } else {
                throw new Error('Failed to clear chat history');
            }
        } catch (error) {
            console.error('Error clearing chat:', error);
            this.showMessage('Error clearing chat history', 'error');
        }
    }

    scrollToBottom() {
        if (this.chatMessages) {
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }
    }

    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        
        return date.toLocaleDateString();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showMessage(message, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${type}`;
        messageDiv.textContent = message;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 5px;
            color: white;
            z-index: 10000;
            opacity: 0;
            transition: opacity 0.3s ease;
            ${type === 'success' ? 'background: #28a745;' : 'background: #dc3545;'}
        `;

        document.body.appendChild(messageDiv);
        
        setTimeout(() => messageDiv.style.opacity = '1', 10);
        setTimeout(() => {
            messageDiv.style.opacity = '0';
            setTimeout(() => messageDiv.remove(), 300);
        }, 3000);
    }
}

// Initialize chat manager
const chatManager = new ChatManager();
export default chatManager;