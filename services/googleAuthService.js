const { OAuth2Client } = require('google-auth-library');
require('dotenv').config();
console.log(process.env.GOOGLE_CLIENT_ID_ANDROID)
console.log(process.env.GOOGLE_CLIENT_ID_IOS)
class GoogleAuthService {
  constructor() {
    this.androidClientId = process.env.GOOGLE_CLIENT_ID_ANDROID;
    this.iosClientId = process.env.GOOGLE_CLIENT_ID_IOS;
  }
  /**
   * Verify Google ID token and extract user information
   * @param {string} idToken - Google ID token from client
   * @param {string} platform - Platform type: 'android' or 'ios'
   * @returns {Promise<Object>} User information from Google
   */
  async verifyIdToken(idToken, platform = 'android') {
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
        default:
          throw new Error(`Unsupported platform: ${platform}. Only 'android' and 'ios' are supported.`);
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
      default:
        throw new Error(`Unsupported platform: ${platform}. Only 'android' and 'ios' are supported.`);
    }
  }

  /**
   * Validate platform parameter
   * @param {string} platform - Platform type
   * @returns {boolean} Whether platform is valid
   */
  isValidPlatform(platform) {
    return ['android', 'ios'].includes(platform.toLowerCase());
  }
}

module.exports = new GoogleAuthService();
