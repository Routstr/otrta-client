// Global auth state management
class AuthStateManager {
  private isRedirecting = false;
  private redirectCallbacks: (() => void)[] = [];

  setRedirecting(redirecting: boolean) {
    this.isRedirecting = redirecting;
    this.notifyCallbacks();
  }

  getIsRedirecting(): boolean {
    return this.isRedirecting;
  }

  onRedirectingChange(callback: () => void): () => void {
    this.redirectCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.redirectCallbacks.indexOf(callback);
      if (index > -1) {
        this.redirectCallbacks.splice(index, 1);
      }
    };
  }

  private notifyCallbacks() {
    this.redirectCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in redirect callback:', error);
      }
    });
  }
}

export const authStateManager = new AuthStateManager(); 