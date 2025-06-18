import { UserManager, User } from 'oidc-client-ts';

const config = {
    authority: "http://localhost:6007",
    client_id: "shopping-spa",
    redirect_uri: "http://localhost:6006/callback",
    response_type: "code",
    scope: "openid profile shopping_api",
    post_logout_redirect_uri: "http://localhost:6006",
};

class AuthService {
    private userManager: UserManager;

    constructor() {
        this.userManager = new UserManager(config);
    }

    public async getUser(): Promise<User | null> {
        try {
            return await this.userManager.getUser();
        } catch (error) {
            console.error('Error getting user:', error);
            return null;
        }
    }

    public async login(): Promise<void> {
        try {
            await this.userManager.signinRedirect();
        } catch (error) {
            console.error('Error during login:', error);
            throw error;
        }
    }

    public async logout(): Promise<void> {
        try {
            await this.userManager.signoutRedirect();
        } catch (error) {
            console.error('Error during logout:', error);
            throw error;
        }
    }

    public async handleCallback(): Promise<User> {
        try {
            return await this.userManager.signinRedirectCallback();
        } catch (error) {
            console.error('Error handling callback:', error);
            throw error;
        }
    }

    public async getAccessToken(): Promise<string | null> {
        const user = await this.getUser();
        return user?.access_token || null;
    }
}

export const authService = new AuthService(); 