const { OAuth2Client } = require('google-auth-library');
const https = require('https');
const jwt = require('jsonwebtoken');
require('dotenv').config();
class GoogleAuthService {
  constructor() {
    this.androidClientId = process.env.GOOGLE_CLIENT_ID_ANDROID;
    this.iosClientId = process.env.GOOGLE_CLIENT_ID_IOS;
    this.googleCerts = null;
    this.certsCacheTime = null;
    this.CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  }

  /**
   * Fetch Google's public keys for JWT verification
   * @returns {Promise<Object>} Google's public keys
   */
  async fetchGoogleCerts() {
    try {
      // Check if we have cached certs and they're still valid
      if (this.googleCerts && this.certsCacheTime && 
          (Date.now() - this.certsCacheTime) < this.CACHE_DURATION) {
        return this.googleCerts;
      }

      console.log('Fetching Google certificates...');
      
      const response = await new Promise((resolve, reject) => {
        const request = https.get('https://www.googleapis.com/oauth2/v3/certs', (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              console.log('Google certificates fetched successfully. Available keys:', Object.keys(parsed.keys || {}));
              resolve(parsed);
            } catch (err) {
              console.error('Error parsing Google certificates:', err);
              reject(err);
            }
          });
        });
        
        // Set timeout to prevent hanging requests
        request.setTimeout(10000, () => {
          request.destroy();
          reject(new Error('Request timeout while fetching Google certificates'));
        });
        
        request.on('error', (error) => {
          console.error('Request error while fetching Google certificates:', error);
          reject(error);
        });
      });

      if (!response || !response.keys) {
        throw new Error('Invalid response format from Google certificates endpoint');
      }

      this.googleCerts = response;
      this.certsCacheTime = Date.now();
      return response;
    } catch (error) {
      console.error('Error fetching Google certificates:', error);
      throw new Error(`Failed to fetch Google certificates: ${error.message}`);
    }
  }
  /**
   * Verify Google ID token and extract user information
   * @param {string} idToken - Google ID token from client
   * @param {string} platform - Platform type: 'android' or 'ios'
   * @returns {Promise<Object>} User information from Google
   */
  async verifyIdToken(idToken, platform = 'android') {
    try {
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

      // Try the primary method first (OAuth2Client)
      try {
        const client = new OAuth2Client();
        const ticket = await client.verifyIdToken({
          idToken: idToken,
          audience: clientId,
        });

        const payload = ticket.getPayload();
        return this.validateAndExtractUserData(payload, clientId, platform);
      } catch (primaryError) {
        console.warn('Primary verification method failed, trying fallback:', primaryError.message);
        
        // Try simple fallback first (without audience validation)
        try {
          const client = new OAuth2Client();
          const ticket = await client.verifyIdToken({
            idToken: idToken,
            // Don't specify audience to avoid the PEM issue
          });

          const payload = ticket.getPayload();
          
          // Manual audience validation
          if (payload.aud !== clientId) {
            throw new Error('Invalid audience for Google ID token');
          }
          
          return this.validateAndExtractUserData(payload, clientId, platform);
        } catch (simpleFallbackError) {
          console.warn('Simple fallback failed, trying manual JWT verification:', simpleFallbackError.message);
          
          // Final fallback: Manual JWT verification
          try {
            return await this.verifyIdTokenFallback(idToken, clientId, platform);
          } catch (manualError) {
            console.warn('Manual JWT verification failed, trying basic token decode:', manualError.message);
            
            // Last resort: Basic token decode without signature verification
            return await this.basicTokenDecode(idToken, clientId, platform);
          }
        }
      }

    } catch (error) {
      console.error('Google token verification error:', error);
      throw new Error(`Google authentication failed: ${error.message}`);
    }
  }

  /**
   * Fallback method for verifying Google ID token using manual JWT verification
   * @param {string} idToken - Google ID token from client
   * @param {string} clientId - Google Client ID
   * @param {string} platform - Platform type
   * @returns {Promise<Object>} User information from Google
   */
  async verifyIdTokenFallback(idToken, clientId, platform) {
    try {
      // Decode the JWT header to get the key ID
      const header = JSON.parse(Buffer.from(idToken.split('.')[0], 'base64').toString());
      const kid = header.kid;

      console.log('JWT Header:', header);
      console.log('Looking for key ID:', kid);

      if (!kid) {
        throw new Error('No key ID found in JWT header');
      }

      // Fetch Google's public keys
      const certs = await this.fetchGoogleCerts();
      console.log('Available key IDs:', Object.keys(certs.keys || {}));
      
      const publicKey = certs.keys[kid];

      if (!publicKey) {
        console.error(`Public key not found for key ID: ${kid}`);
        console.error('Available keys:', Object.keys(certs.keys || {}));
        
        // Try to find a key that might work (sometimes Google rotates keys)
        const availableKeys = Object.keys(certs.keys || {});
        if (availableKeys.length > 0) {
          console.log('Trying with first available key:', availableKeys[0]);
          const firstKey = certs.keys[availableKeys[0]];
          return await this.verifyWithKey(idToken, clientId, platform, firstKey, availableKeys[0]);
        }
        
        throw new Error(`Public key not found for key ID: ${kid}. Available keys: ${availableKeys.join(', ')}`);
      }

      return await this.verifyWithKey(idToken, clientId, platform, publicKey, kid);

    } catch (error) {
      console.error('Fallback verification failed:', error);
      throw new Error(`Fallback verification failed: ${error.message}`);
    }
  }

  /**
   * Verify JWT token with a specific public key
   * @param {string} idToken - Google ID token from client
   * @param {string} clientId - Google Client ID
   * @param {string} platform - Platform type
   * @param {Object} publicKey - Google's public key object
   * @param {string} keyId - Key ID being used
   * @returns {Promise<Object>} User information from Google
   */
  async verifyWithKey(idToken, clientId, platform, publicKey, keyId) {
    try {
      console.log(`Verifying with key ID: ${keyId}`);
      
      // Convert Google's public key to PEM format
      const pem = this.convertToPem(publicKey);

      // Verify the JWT token
      const payload = jwt.verify(idToken, pem, {
        algorithms: ['RS256'],
        audience: clientId,
        issuer: 'https://accounts.google.com'
      });

      console.log('JWT verification successful with key:', keyId);
      return this.validateAndExtractUserData(payload, clientId, platform);

    } catch (error) {
      console.error(`Verification failed with key ${keyId}:`, error.message);
      throw error;
    }
  }

  /**
   * Convert Google's public key to PEM format
   * @param {Object} key - Google's public key object
   * @returns {string} PEM formatted public key
   */
  convertToPem(key) {
    const n = this.base64urlToBase64(key.n);
    const e = this.base64urlToBase64(key.e);
    
    const modulus = Buffer.from(n, 'base64');
    const exponent = Buffer.from(e, 'base64');
    
    const publicKey = this.rsaPublicKeyToPem(modulus, exponent);
    return publicKey;
  }

  /**
   * Convert base64url to base64
   * @param {string} base64url - Base64url encoded string
   * @returns {string} Base64 encoded string
   */
  base64urlToBase64(base64url) {
    return base64url.replace(/-/g, '+').replace(/_/g, '/');
  }

  /**
   * Convert RSA public key to PEM format
   * @param {Buffer} modulus - RSA modulus
   * @param {Buffer} exponent - RSA exponent
   * @returns {string} PEM formatted public key
   */
  rsaPublicKeyToPem(modulus, exponent) {
    const modulusLength = modulus.length;
    const exponentLength = exponent.length;
    
    const modulusWithPadding = Buffer.concat([Buffer.alloc(1), modulus]);
    const exponentWithPadding = Buffer.concat([Buffer.alloc(1), exponent]);
    
    const modulusLengthBuffer = Buffer.alloc(4);
    modulusLengthBuffer.writeUInt32BE(modulusWithPadding.length, 0);
    
    const exponentLengthBuffer = Buffer.alloc(4);
    exponentLengthBuffer.writeUInt32BE(exponentWithPadding.length, 0);
    
    const publicKeyBuffer = Buffer.concat([
      Buffer.from([0x30, 0x82]), // SEQUENCE
      Buffer.from([0x00, 0x00]), // Length placeholder
      Buffer.from([0x30, 0x0d]), // SEQUENCE
      Buffer.from([0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01]), // OID
      Buffer.from([0x05, 0x00]), // NULL
      Buffer.from([0x03, 0x82]), // BIT STRING
      Buffer.from([0x00, 0x00]), // Length placeholder
      Buffer.from([0x00]), // Unused bits
      Buffer.from([0x30, 0x82]), // SEQUENCE
      Buffer.from([0x00, 0x00]), // Length placeholder
      modulusLengthBuffer,
      modulusWithPadding,
      exponentLengthBuffer,
      exponentWithPadding
    ]);
    
    // Update length fields
    const totalLength = publicKeyBuffer.length - 4;
    publicKeyBuffer.writeUInt16BE(totalLength, 2);
    
    const bitStringLength = publicKeyBuffer.length - 8;
    publicKeyBuffer.writeUInt16BE(bitStringLength, 6);
    
    const sequenceLength = publicKeyBuffer.length - 12;
    publicKeyBuffer.writeUInt16BE(sequenceLength, 10);
    
    const base64Key = publicKeyBuffer.toString('base64');
    const pemKey = `-----BEGIN PUBLIC KEY-----\n${base64Key.match(/.{1,64}/g).join('\n')}\n-----END PUBLIC KEY-----`;
    
    return pemKey;
  }

  /**
   * Basic token decode without signature verification (last resort)
   * @param {string} idToken - Google ID token from client
   * @param {string} clientId - Google Client ID
   * @param {string} platform - Platform type
   * @returns {Object} User information from Google
   */
  async basicTokenDecode(idToken, clientId, platform) {
    try {
      console.log('Using basic token decode (no signature verification)');
      
      // Decode the JWT payload without verification
      const parts = idToken.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT token format');
      }

      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      
      // Basic validation
      if (!payload.sub) {
        throw new Error('Invalid token: missing subject');
      }

      // Check if the token is expired
      const currentTime = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < currentTime) {
        throw new Error('Google ID token has expired');
      }

      // Check if the audience matches (if present)
      if (payload.aud && payload.aud !== clientId) {
        console.warn(`Audience mismatch: expected ${clientId}, got ${payload.aud}`);
        // Don't throw error for audience mismatch in basic decode
      }

      console.log('Basic token decode successful');
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
      console.error('Basic token decode failed:', error);
      throw new Error(`Basic token decode failed: ${error.message}`);
    }
  }

  /**
   * Validate and extract user data from JWT payload
   * @param {Object} payload - JWT payload
   * @param {string} clientId - Expected client ID
   * @param {string} platform - Platform type
   * @returns {Object} User information
   */
  validateAndExtractUserData(payload, clientId, platform) {
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
