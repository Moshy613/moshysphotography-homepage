import { auth } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup
} from 'firebase/auth';

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.authModal = null;
        this.init();
    }

    init() {
        this.createAuthModal();
        this.setupAuthStateListener();
        this.updateUIForAuthState();
    }

    createAuthModal() {
        const modalHTML = `
            <div id="auth-modal" class="auth-modal">
                <div class="auth-modal-content">
                    <span class="auth-close">&times;</span>
                    <div class="auth-tabs">
                        <button class="auth-tab-btn active" data-tab="login">Login</button>
                        <button class="auth-tab-btn" data-tab="register">Register</button>
                    </div>
                    
                    <div id="login-form" class="auth-form active">
                        <h2>Welcome Back</h2>
                        <p>Sign in to access chat with Riley and comment on posts</p>
                        <form id="login-form-element">
                            <input type="email" id="login-email" placeholder="Email" required>
                            <input type="password" id="login-password" placeholder="Password" required>
                            <button type="submit" class="auth-btn">Sign In</button>
                        </form>
                        <div class="auth-divider">or</div>
                        <button id="google-login" class="google-btn">
                            <i class="fab fa-google"></i> Continue with Google
                        </button>
                    </div>

                    <div id="register-form" class="auth-form">
                        <h2>Join Us</h2>
                        <p>Create an account to chat with Riley and engage with the community</p>
                        <form id="register-form-element">
                            <input type="email" id="register-email" placeholder="Email" required>
                            <input type="password" id="register-password" placeholder="Password (min 6 characters)" required minlength="6">
                            <input type="password" id="register-confirm" placeholder="Confirm Password" required>
                            <button type="submit" class="auth-btn">Create Account</button>
                        </form>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.authModal = document.getElementById('auth-modal');
        this.setupModalEventListeners();
    }

    setupModalEventListeners() {
        // Close modal
        const closeBtn = document.querySelector('.auth-close');
        closeBtn.addEventListener('click', () => this.hideAuthModal());

        // Close modal when clicking outside
        this.authModal.addEventListener('click', (e) => {
            if (e.target === this.authModal) {
                this.hideAuthModal();
            }
        });

        // Tab switching
        document.querySelectorAll('.auth-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                this.switchAuthTab(tab);
            });
        });

        // Form submissions
        document.getElementById('login-form-element').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        document.getElementById('register-form-element').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });

        // Google login
        document.getElementById('google-login').addEventListener('click', () => {
            this.handleGoogleLogin();
        });
    }

    switchAuthTab(tab) {
        document.querySelectorAll('.auth-tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
        
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        document.getElementById(`${tab}-form`).classList.add('active');
    }

    async handleLogin() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            await signInWithEmailAndPassword(auth, email, password);
            this.hideAuthModal();
            this.showMessage('Welcome back!', 'success');
        } catch (error) {
            this.showMessage(this.getErrorMessage(error.code), 'error');
        }
    }

    async handleRegister() {
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm').value;

        if (password !== confirmPassword) {
            this.showMessage('Passwords do not match', 'error');
            return;
        }

        try {
            await createUserWithEmailAndPassword(auth, email, password);
            this.hideAuthModal();
            this.showMessage('Account created successfully!', 'success');
        } catch (error) {
            this.showMessage(this.getErrorMessage(error.code), 'error');
        }
    }

    async handleGoogleLogin() {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
            this.hideAuthModal();
            this.showMessage('Welcome!', 'success');
        } catch (error) {
            this.showMessage(this.getErrorMessage(error.code), 'error');
        }
    }

    async handleLogout() {
        try {
            await signOut(auth);
            this.showMessage('Logged out successfully', 'success');
        } catch (error) {
            this.showMessage('Error logging out', 'error');
        }
    }

    setupAuthStateListener() {
        onAuthStateChanged(auth, (user) => {
            this.currentUser = user;
            this.updateUIForAuthState();
        });
    }

    updateUIForAuthState() {
        const authButtons = document.getElementById('auth-buttons');
        const chatNavLink = document.getElementById('chat-nav-link');
        
        if (this.currentUser) {
            // User is logged in
            if (authButtons) {
                authButtons.innerHTML = `
                    <button id="logout-btn" class="btn-secondary">Logout</button>
                    <span class="user-email">${this.currentUser.email}</span>
                `;
                document.getElementById('logout-btn').addEventListener('click', () => this.handleLogout());
            }
            
            // Show chat link
            if (chatNavLink) {
                chatNavLink.style.display = 'block';
            }
        } else {
            // User is not logged in
            if (authButtons) {
                authButtons.innerHTML = `
                    <button id="login-btn" class="btn-primary">Login</button>
                `;
                document.getElementById('login-btn').addEventListener('click', () => this.showAuthModal());
            }
            
            // Hide chat link
            if (chatNavLink) {
                chatNavLink.style.display = 'none';
            }
        }
    }

    showAuthModal() {
        this.authModal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    hideAuthModal() {
        this.authModal.style.display = 'none';
        document.body.style.overflow = 'auto';
        // Clear form fields
        document.querySelectorAll('.auth-form input').forEach(input => input.value = '');
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
        
        // Fade in
        setTimeout(() => messageDiv.style.opacity = '1', 10);
        
        // Remove after 3 seconds
        setTimeout(() => {
            messageDiv.style.opacity = '0';
            setTimeout(() => messageDiv.remove(), 300);
        }, 3000);
    }

    getErrorMessage(errorCode) {
        const errorMessages = {
            'auth/user-not-found': 'No account found with this email',
            'auth/wrong-password': 'Incorrect password',
            'auth/email-already-in-use': 'Email already registered',
            'auth/weak-password': 'Password should be at least 6 characters',
            'auth/invalid-email': 'Invalid email address',
            'auth/too-many-requests': 'Too many attempts. Please try again later'
        };
        return errorMessages[errorCode] || 'An error occurred. Please try again.';
    }

    requireAuth(callback) {
        if (this.currentUser) {
            callback();
        } else {
            this.showAuthModal();
        }
    }

    isAuthenticated() {
        return !!this.currentUser;
    }
}

// Initialize auth manager
window.authManager = new AuthManager();
export default window.authManager;