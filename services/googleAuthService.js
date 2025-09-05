const { OAuth2Client } = require('google-auth-library');

class GoogleAuthService {
  constructor() {
    this.androidClientId = process.env.GOOGLE_CLIENT_ID_ANDROID;
    this.iosClientId = process.env.GOOGLE_CLIENT_ID_IOS;
    this.webClientId = process.env.GOOGLE_CLIENT_ID;
  }

  /**
   * Verify Google ID token and extract user information
   * @param {string} idToken - Google ID token from client
   * @param {string} platform - Platform type: 'android', 'ios', or 'web'
   * @returns {Promise<Object>} User information from Google
   */
  async verifyIdToken(idToken, platform = 'web') {
    try {
      const client = new OAuth2Client();
      
      // Determine which client ID to use based on platform
      let clientId;
      switch (platform.toLowerCase()) {
        case 'android':
          clientId = this.androidClientId;
          break;
        case 'ios':
          clientId = this.iosClientId;
          break;
        case 'web':
        default:
          clientId = this.webClientId;
          break;
      }

      if (!clientId) {
        throw new Error(`Google Client ID not configured for platform: ${platform}`);
      }

      // Verify the token
      const ticket = await client.verifyIdToken({
        idToken: idToken,
        audience: clientId,
      });

      const payload = ticket.getPayload();
      
      // Validate the token
      if (!payload) {
        throw new Error('Invalid Google ID token');
      }

      // Check if the token is expired
      const currentTime = Math.floor(Date.now() / 1000);
      if (payload.exp < currentTime) {
        throw new Error('Google ID token has expired');
      }

      // Check if the audience matches
      if (payload.aud !== clientId) {
        throw new Error('Invalid audience for Google ID token');
      }

      return {
        googleId: payload.sub,
        email: payload.email,
        emailVerified: payload.email_verified,
        fullname: payload.name,
        firstName: payload.given_name,
        lastName: payload.family_name,
        profileImage: payload.picture,
        locale: payload.locale,
        platform: platform
      };

    } catch (error) {
      console.error('Google token verification error:', error);
      throw new Error(`Google authentication failed: ${error.message}`);
    }
  }

  /**
   * Verify Google access token (for server-side verification)
   * @param {string} accessToken - Google access token
   * @returns {Promise<Object>} User information from Google
   */
  async verifyAccessToken(accessToken) {
    try {
      const client = new OAuth2Client();
      
      // Get user info from Google API
      const response = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`);
      
      if (!response.ok) {
        throw new Error('Failed to verify Google access token');
      }

      const userInfo = await response.json();
      
      return {
        googleId: userInfo.id,
        email: userInfo.email,
        emailVerified: userInfo.verified_email,
        fullname: userInfo.name,
        firstName: userInfo.given_name,
        lastName: userInfo.family_name,
        profileImage: userInfo.picture,
        locale: userInfo.locale,
        platform: 'web'
      };

    } catch (error) {
      console.error('Google access token verification error:', error);
      throw new Error(`Google access token verification failed: ${error.message}`);
    }
  }

  /**
   * Get the appropriate client ID for a platform
   * @param {string} platform - Platform type
   * @returns {string} Client ID
   */
  getClientId(platform) {
    switch (platform.toLowerCase()) {
      case 'android':
        return this.androidClientId;
      case 'ios':
        return this.iosClientId;
      case 'web':
      default:
        return this.webClientId;
    }
  }

  /**
   * Validate platform parameter
   * @param {string} platform - Platform type
   * @returns {boolean} Whether platform is valid
   */
  isValidPlatform(platform) {
    return ['android', 'ios', 'web'].includes(platform.toLowerCase());
  }
}

module.exports = new GoogleAuthService();
