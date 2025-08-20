import { db, auth } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    query, 
    orderBy, 
    onSnapshot, 
    doc, 
    updateDoc, 
    arrayUnion, 
    arrayRemove,
    serverTimestamp,
    getDoc
} from 'firebase/firestore';

class CommentsManager {
    constructor() {
        this.commentsCollection = collection(db, 'comments');
        this.unsubscribe = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupAuthStateListener();
        this.loadComments();
    }

    setupEventListeners() {
        // Comment form submission
        const commentForm = document.getElementById('comment-form');
        if (commentForm) {
            commentForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleCommentSubmit();
            });
        }

        // Auth prompt button
        const authLinkBtn = document.querySelector('.auth-link-btn');
        if (authLinkBtn) {
            authLinkBtn.addEventListener('click', () => {
                window.authManager.showAuthModal();
            });
        }
    }

    setupAuthStateListener() {
        auth.onAuthStateChanged((user) => {
            this.updateCommentsUI(user);
        });
    }

    updateCommentsUI(user) {
        const authPrompt = document.getElementById('comments-auth-prompt');
        const commentsArea = document.getElementById('comments-area');

        if (user) {
            authPrompt.style.display = 'none';
            commentsArea.style.display = 'block';
        } else {
            authPrompt.style.display = 'block';
            commentsArea.style.display = 'none';
        }
    }

    async handleCommentSubmit() {
        const commentText = document.getElementById('comment-text').value.trim();
        const user = auth.currentUser;

        if (!user) {
            window.authManager.showAuthModal();
            return;
        }

        if (!commentText) {
            this.showMessage('Please enter a comment', 'error');
            return;
        }

        try {
            await addDoc(this.commentsCollection, {
                text: commentText,
                userId: user.uid,
                userEmail: user.email,
                userName: user.displayName || user.email.split('@')[0],
                timestamp: serverTimestamp(),
                likes: [],
                likeCount: 0
            });

            document.getElementById('comment-text').value = '';
            this.showMessage('Comment posted!', 'success');
        } catch (error) {
            console.error('Error posting comment:', error);
            this.showMessage('Error posting comment', 'error');
        }
    }

    loadComments() {
        const q = query(this.commentsCollection, orderBy('timestamp', 'desc'));
        
        this.unsubscribe = onSnapshot(q, (snapshot) => {
            const comments = [];
            snapshot.forEach((doc) => {
                comments.push({ id: doc.id, ...doc.data() });
            });
            this.renderComments(comments);
        });
    }

    renderComments(comments) {
        const commentsList = document.getElementById('comments-list');
        if (!commentsList) return;

        if (comments.length === 0) {
            commentsList.innerHTML = `
                <div class="no-comments">
                    <p>No comments yet. Be the first to share your thoughts!</p>
                </div>
            `;
            return;
        }

        commentsList.innerHTML = comments.map(comment => {
            const isLiked = auth.currentUser && comment.likes?.includes(auth.currentUser.uid);
            const timeAgo = this.getTimeAgo(comment.timestamp);
            
            return `
                <div class="comment-card" data-comment-id="${comment.id}">
                    <div class="comment-header">
                        <div class="comment-author">
                            <div class="author-avatar">
                                <i class="fas fa-user-circle"></i>
                            </div>
                            <div class="author-info">
                                <span class="author-name">${comment.userName}</span>
                                <span class="comment-time">${timeAgo}</span>
                            </div>
                        </div>
                    </div>
                    <div class="comment-content">
                        <p>${this.escapeHtml(comment.text)}</p>
                    </div>
                    <div class="comment-actions">
                        <button class="like-btn ${isLiked ? 'liked' : ''}" onclick="commentsManager.toggleLike('${comment.id}')">
                            <i class="fas fa-heart"></i>
                            <span class="like-count">${comment.likeCount || 0}</span>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    async toggleLike(commentId) {
        const user = auth.currentUser;
        if (!user) {
            window.authManager.showAuthModal();
            return;
        }

        try {
            const commentRef = doc(db, 'comments', commentId);
            const commentDoc = await getDoc(commentRef);
            
            if (!commentDoc.exists()) {
                this.showMessage('Comment not found', 'error');
                return;
            }

            const commentData = commentDoc.data();
            const likes = commentData.likes || [];
            const isLiked = likes.includes(user.uid);

            if (isLiked) {
                // Remove like
                await updateDoc(commentRef, {
                    likes: arrayRemove(user.uid),
                    likeCount: Math.max((commentData.likeCount || 0) - 1, 0)
                });
            } else {
                // Add like
                await updateDoc(commentRef, {
                    likes: arrayUnion(user.uid),
                    likeCount: (commentData.likeCount || 0) + 1
                });
            }
        } catch (error) {
            console.error('Error toggling like:', error);
            this.showMessage('Error updating like', 'error');
        }
    }

    getTimeAgo(timestamp) {
        if (!timestamp) return 'Just now';
        
        const now = new Date();
        const commentTime = timestamp.toDate();
        const diffInSeconds = Math.floor((now - commentTime) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        
        return commentTime.toLocaleDateString();
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

    destroy() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
    }
}

// Initialize comments manager and make it globally available
window.commentsManager = new CommentsManager();
export default window.commentsManager;